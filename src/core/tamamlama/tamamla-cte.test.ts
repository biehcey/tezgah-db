import { describe, expect, it } from 'vitest';
import { ONCELIK } from './index';
import { etiketler, oneri, tamamlaIsaretli } from './test/yardimci';

describe('tamamla: CTE', () => {
  it('CTE adı ilişki yuvasında, variable türü ve kapsam bandında', () => {
    const s = tamamlaIsaretli('WITH son AS (SELECT id FROM customers) SELECT * FROM |');
    expect(etiketler(s, 'variable')).toEqual(['son']);
    expect(oneri(s, 'son')).toMatchObject({ eklenecek: 'son', detail: 'CTE', oncelik: ONCELIK.KAPSAM });
    expect(etiketler(s, 'type')).toContain('customers');
  });

  it.each([
    ['açık kolon listesi', 'WITH x(a, "B") AS (SELECT id, name FROM customers) SELECT | FROM x', ['a', 'B']],
    ['AS, tek tanımlayıcı ve x.ad', 'WITH x AS (SELECT count(*) AS adet, c.name, email FROM customers c) SELECT | FROM x', ['adet', 'name', 'email']],
    ['DISTINCT', 'WITH x AS (SELECT DISTINCT name FROM customers) SELECT | FROM x', ['name']],
  ])('CTE kolonları (%s) ifade yuvasında, detail’de kaynak', (_, metin, beklenen) => {
    const s = tamamlaIsaretli(metin);
    expect(etiketler(s, 'property')).toEqual(beklenen);
    expect(oneri(s, beklenen[0]!, 'property')).toMatchObject({ detail: 'CTE', oncelik: ONCELIK.KAPSAM });
  });

  it('CTE kolonları x. sonrasında; tırnak gerektiren ad tırnaklı eklenir', () => {
    const s = tamamlaIsaretli('WITH x(a, "B") AS (SELECT 1, 2) SELECT x.| FROM x');
    expect(etiketler(s)).toEqual(['a', 'B']);
    expect(oneri(s, 'B').eklenecek).toBe('"B"');
  });

  it.each([
    ['*', 'WITH x AS (SELECT * FROM customers) SELECT | FROM x'],
    ['adsız ifade', 'WITH x AS (SELECT id, count(*) FROM customers) SELECT | FROM x'],
  ])('kolonları çıkarılamayan CTE (%s): ad önerilir, kolon önerilmez', (_, metin) => {
    const s = tamamlaIsaretli(metin);
    expect(etiketler(s, 'property')).toEqual([]);
    expect(etiketler(s, 'variable')).toEqual(['x']);
    expect(tamamlaIsaretli(metin.replace('SELECT | FROM x', 'SELECT * FROM |'))).not.toBeNull();
    expect(etiketler(tamamlaIsaretli(metin.replace('SELECT | FROM x', 'SELECT * FROM |')), 'variable')).toEqual(['x']);
  });

  it('CTE gövdesinde önceki CTE’ler görünür, kendisi ve sonrakiler görünmez', () => {
    const s = tamamlaIsaretli('WITH a AS (SELECT 1 AS n), b AS (SELECT * FROM |), c AS (SELECT 2 AS m) SELECT 1');
    expect(etiketler(s, 'variable')).toEqual(['a']);
  });

  it('WITH RECURSIVE: CTE kendi gövdesinde de önerilir, kolonlarıyla', () => {
    const s = tamamlaIsaretli('WITH RECURSIVE agac(id, ust) AS (SELECT id, NULL FROM customers UNION ALL SELECT c.id, a.id FROM customers c JOIN |');
    expect(etiketler(s, 'variable')).toEqual(['agac']);
    const k = tamamlaIsaretli('WITH RECURSIVE agac(id, ust) AS (SELECT 1, 2 UNION ALL SELECT a.| FROM agac a) SELECT 1');
    expect(etiketler(k)).toEqual(['id', 'ust']);
  });

  it('iç alt sorgu dıştaki WITH’in CTE’lerini görür', () => {
    const s = tamamlaIsaretli('WITH x AS (SELECT id FROM customers) SELECT * FROM customers WHERE id IN (SELECT | FROM x)');
    expect(etiketler(s, 'property')).toEqual(['id', 'id', 'name', 'email']);
  });

  it('CTE aynı adlı katalog ilişkisini gölgeler', () => {
    const s = tamamlaIsaretli('WITH customers AS (SELECT id FROM satis.siparis) SELECT | FROM customers');
    expect(etiketler(s, 'property')).toEqual(['id']);
  });
});

describe('tamamla: FROM’daki alt sorgu', () => {
  it('takma adı ve kolonları ifade yuvasında', () => {
    const s = tamamlaIsaretli('SELECT | FROM (SELECT id, total AS tutar FROM customer_orders) AS s');
    expect(etiketler(s, 'property')).toEqual(['id', 'tutar']);
    expect(oneri(s, 'tutar')).toMatchObject({ detail: 'alt sorgu', eklenecek: 'tutar' });
    expect(oneri(s, 's')).toMatchObject({ tur: 'variable', detail: 'alt sorgu', oncelik: ONCELIK.KAPSAM });
  });

  it('s. sonrasında kolonları; takma ad kolon listesi gövdeye üstün', () => {
    expect(etiketler(tamamlaIsaretli('SELECT s.| FROM (SELECT id FROM customers) s'))).toEqual(['id']);
    expect(etiketler(tamamlaIsaretli('SELECT s.| FROM (SELECT id, name FROM customers) s(a, b)'))).toEqual(['a', 'b']);
  });

  it('LATERAL alt sorgu ve * içeren alt sorgu', () => {
    const s = tamamlaIsaretli('SELECT | FROM customers c, LATERAL (SELECT * FROM customer_orders o WHERE o.customer_id = c.id) son');
    expect(etiketler(s, 'property')).toEqual(['id', 'name', 'email']);
    expect(etiketler(s, 'variable')).toEqual(['c', 'son']);
  });

  it('alt sorgunun içinde dıştaki FROM’u görünmez, kendi FROM’u görünür', () => {
    const s = tamamlaIsaretli('SELECT * FROM (SELECT | FROM satis.siparis) s JOIN customers c ON true');
    expect(etiketler(s, 'property')).toEqual(['id', 'musteri_id', 'tutar']);
  });
});

describe('tamamla: ilişkili alt sorgu ve gölgeleme', () => {
  it('iç kapsam dıştaki takma adları görür; aynı ad içtekini gösterir', () => {
    const metin = 'SELECT * FROM customers s WHERE EXISTS (SELECT 1 FROM satis.siparis s WHERE |)';
    expect(etiketler(tamamlaIsaretli(metin), 'variable')).toEqual(['s']);
    expect(oneri(tamamlaIsaretli(metin), 's')).toMatchObject({ detail: 'satis.siparis' });
    expect(etiketler(tamamlaIsaretli(metin.replace('WHERE |', 'WHERE s.|')))).toEqual(['id', 'musteri_id', 'tutar']);
  });

  it('dış kapsamın içteki kolonla aynı adlı kolonu nitelikli eklenir, diğerleri öneksiz', () => {
    const s = tamamlaIsaretli('SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM satis.siparis WHERE |)');
    const idler = s!.oneriler.filter((o) => o.etiket === 'id');
    expect(idler.map((o) => [o.eklenecek, o.detail])).toEqual([
      ['id', 'integer'],
      ['c.id', 'integer · customers c'],
    ]);
    expect(oneri(s, 'email')).toMatchObject({ eklenecek: 'email', detail: 'text' });
  });
});

describe('tamamla: belirsiz kolonlar', () => {
  it('aynı adlı kolon her ilişki için ayrı öneri, takma adla nitelikli; detail’de ilişki adı ve takma ad', () => {
    const s = tamamlaIsaretli('SELECT | FROM customers c JOIN customer_orders o ON o.customer_id = c.id');
    const idler = s!.oneriler.filter((o) => o.etiket === 'id');
    expect(idler.map((o) => [o.eklenecek, o.detail, o.tur])).toEqual([
      ['c.id', 'integer · customers c', 'property'],
      ['o.id', 'integer · customer_orders o', 'property'],
    ]);
    expect(oneri(s, 'name')).toMatchObject({ eklenecek: 'name', detail: 'text' });
    expect(oneri(s, 'total')).toMatchObject({ eklenecek: 'total', detail: 'numeric(12,2)' });
  });

  it('takma adsız ilişkide tablo adıyla (detail’de yazıldığı gibi); tırnak gereken ad tırnaklı', () => {
    const s = tamamlaIsaretli('SELECT | FROM satis.siparis, "Müşteri"');
    const idler = s!.oneriler.filter((o) => o.etiket === 'id');
    expect(idler.map((o) => [o.eklenecek, o.detail])).toEqual([
      ['siparis.id', 'integer · satis.siparis'],
      ['"Müşteri".id', 'integer · Müşteri'],
    ]);
  });

  it('aynı ilişki iki takma adla: detail takma adla ayrışır', () => {
    const s = tamamlaIsaretli('SELECT | FROM customers a JOIN customers b ON true');
    expect(s!.oneriler.filter((o) => o.etiket === 'id').map((o) => o.detail)).toEqual(['integer · customers a', 'integer · customers b']);
  });

  it('CTE ve alt sorgu kolonlarında da; detail’de kaynak', () => {
    const s = tamamlaIsaretli('WITH x AS (SELECT 1 AS id) SELECT | FROM x JOIN (SELECT id FROM customers) s ON true');
    const idler = s!.oneriler.filter((o) => o.etiket === 'id');
    expect(idler.map((o) => [o.eklenecek, o.detail])).toEqual([
      ['x.id', 'CTE · x'],
      ['s.id', 'alt sorgu · s'],
    ]);
  });
});

describe('tamamla: katalog yokken CTE ve alt sorgu', () => {
  it('CTE adı ilişki yuvasında, kolonları ifade yuvasında ve x. sonrasında', () => {
    const katalog = null;
    expect(etiketler(tamamlaIsaretli('WITH x(a, b) AS (SELECT 1, 2) SELECT * FROM |', { katalog }))).toEqual(['x']);
    expect(etiketler(tamamlaIsaretli('WITH x AS (SELECT 1 AS a, 2 AS b) SELECT | FROM x', { katalog }), 'property')).toEqual(['a', 'b']);
    expect(etiketler(tamamlaIsaretli('WITH x AS (SELECT 1 AS a) SELECT x.| FROM x', { katalog }))).toEqual(['a']);
    expect(etiketler(tamamlaIsaretli('SELECT | FROM (SELECT 1 AS a) s', { katalog }), 'property')).toEqual(['a']);
  });
});
