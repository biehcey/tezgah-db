import { describe, expect, it } from 'vitest';
import { ONCELIK } from './index';
import { etiketler, oneri, tamamlaIsaretli } from './test/yardimci';

const PUBLIC_ILISKILER = ['Müşteri', 'aktif_musteriler', 'customer_orders', 'customers'];
const TUM_ILISKILER = [...PUBLIC_ILISKILER, 'satis.aylik_ozet', 'satis.siparis'];

describe('tamamla: ilişki yuvası', () => {
  it('FROM sonrası görünür şemaların ilişkileri; defaultSchema öneksiz, diğerleri şema önekli', () => {
    const s = tamamlaIsaretli('SELECT * FROM |');
    expect(etiketler(s)).toEqual(TUM_ILISKILER);
    expect(oneri(s, 'customers')).toMatchObject({ tur: 'type', detail: 'tablo', eklenecek: 'customers' });
    expect(oneri(s, 'aktif_musteriler').detail).toBe('view');
    expect(oneri(s, 'satis.aylik_ozet')).toMatchObject({ detail: 'materialized view', eklenecek: 'satis.aylik_ozet' });
  });

  it.each([
    ['JOIN', 'SELECT * FROM customers c JOIN |'],
    ['LEFT JOIN', 'SELECT * FROM customers c LEFT JOIN |'],
    ['virgülle ikinci FROM öğesi', 'SELECT * FROM customers c, |'],
    ['UPDATE', 'UPDATE |'],
    ['INSERT INTO', 'INSERT INTO |'],
    ['DELETE FROM', 'DELETE FROM |'],
    ['yazılan kelime', 'SELECT * FROM cus|'],
  ])('%s sonrası yalnızca ilişkiler', (_, metin) => {
    expect(etiketler(tamamlaIsaretli(metin))).toEqual(TUM_ILISKILER);
  });

  it('defaultSchema dışındaki ilişkiler en düşük bantta', () => {
    const s = tamamlaIsaretli('SELECT * FROM |');
    expect(oneri(s, 'customers').oncelik).toBe(ONCELIK.ILISKI);
    expect(oneri(s, 'satis.siparis').oncelik).toBe(ONCELIK.DIGER_SEMA);
  });

  it('görünmez şemanın ilişkileri hiçbir yuvada önerilmez', () => {
    expect(etiketler(tamamlaIsaretli('SELECT * FROM |')).some((e) => e.includes('sir'))).toBe(false);
    expect(tamamlaIsaretli('SELECT * FROM gizli.|')).toBeNull();
    expect(tamamlaIsaretli('SELECT gizli.sir.| FROM gizli.sir')).toBeNull();
    expect(etiketler(tamamlaIsaretli('SELECT | FROM gizli.sir'), 'property')).toEqual([]);
  });
});

describe('tamamla: ifade yuvası', () => {
  it.each([
    ['SELECT listesi', 'SELECT | FROM customers'],
    ['WHERE', 'SELECT * FROM customers WHERE |'],
    ['WHERE içinde AND sonrası', 'SELECT * FROM customers WHERE id = 1 AND |'],
    ['ORDER BY', 'SELECT * FROM customers ORDER BY |'],
    ['GROUP BY', 'SELECT * FROM customers GROUP BY |'],
    ['HAVING', 'SELECT * FROM customers GROUP BY id HAVING |'],
    ['DELETE … WHERE', 'DELETE FROM customers WHERE |'],
    ['UPDATE … SET sağ taraf', 'UPDATE customers SET name = |'],
    ['RETURNING', 'DELETE FROM customers RETURNING |'],
    ['kolon listeli INSERT … RETURNING', "INSERT INTO customers (name) VALUES ('x') RETURNING |"],
    ['fonksiyon argümanı', 'SELECT coalesce(| FROM customers'],
  ])('%s: FROM ilişkisinin kolonları öneksiz, tip detail’de', (_, metin) => {
    const s = tamamlaIsaretli(metin);
    expect(etiketler(s, 'property')).toEqual(['id', 'name', 'email']);
    expect(oneri(s, 'email', 'property')).toMatchObject({ detail: 'text', eklenecek: 'email', oncelik: ONCELIK.KAPSAM });
  });

  it('ifade yuvasında ilişkiler önerilmez, anahtar kelimeler önerilir', () => {
    const s = tamamlaIsaretli('SELECT * FROM customers WHERE |');
    expect(etiketler(s, 'type')).toEqual([]);
    expect(etiketler(s, 'keyword')).toContain('NOT');
  });

  it('JOIN’li FROM: tüm ilişkilerin kolonları, takma adlar ve takma adsız ilişki adı', () => {
    const s = tamamlaIsaretli('SELECT | FROM customers c JOIN customer_orders ON true JOIN satis.siparis AS sp ON true');
    expect(etiketler(s, 'property')).toEqual(['id', 'name', 'email', 'id', 'customer_id', 'total', 'id', 'musteri_id', 'tutar']);
    expect(etiketler(s, 'variable')).toEqual(['c', 'customer_orders', 'sp']);
    expect(oneri(s, 'sp')).toMatchObject({ detail: 'satis.siparis', oncelik: ONCELIK.KAPSAM });
  });

  it('SELECT | FROM t: FROM imleçten sonra gelse de kapsamdadır', () => {
    expect(etiketler(tamamlaIsaretli('SELECT na| FROM customers WHERE id = 1'), 'property')).toEqual(['id', 'name', 'email']);
  });

  it('alt sorguda içteki FROM, ilişkili alt sorguda dıştakiler de', () => {
    const s = tamamlaIsaretli('SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM satis.siparis s WHERE s.musteri_id = |)');
    expect(etiketler(s, 'property')).toEqual(['id', 'musteri_id', 'tutar', 'id', 'name', 'email']);
    expect(etiketler(s, 'variable')).toEqual(['s', 'c']);
  });

  it('dış sorguda alt sorgunun FROM’u görünmez', () => {
    const s = tamamlaIsaretli('SELECT | FROM customers WHERE id IN (SELECT musteri_id FROM satis.siparis)');
    expect(etiketler(s, 'property')).toEqual(['id', 'name', 'email']);
  });
});

describe('tamamla: kolon yuvası', () => {
  it('INSERT INTO t ( içinde t’nin kolonları, yalnızca onlar', () => {
    const s = tamamlaIsaretli('INSERT INTO satis.siparis (id, |');
    expect(etiketler(s)).toEqual(['id', 'musteri_id', 'tutar']);
  });

  it.each([
    ['SET sonrası', 'UPDATE customers SET |'],
    ['virgülden sonra', 'UPDATE customers SET name = $1, |'],
    ['takma adlı', 'UPDATE public.customers c SET |'],
  ])('UPDATE … SET sol taraf (%s): ilişkinin kolonları, yalnızca onlar', (_, metin) => {
    expect(etiketler(tamamlaIsaretli(metin))).toEqual(['id', 'name', 'email']);
  });
});

describe('tamamla: nitelikli adlar', () => {
  it.each([
    ['takma ad', 'SELECT c.| FROM customers c', ['id', 'name', 'email']],
    ['takma adsız tablo adı', 'SELECT customer_orders.| FROM customer_orders', ['id', 'customer_id', 'total']],
    ['şema.tablo.', 'SELECT satis.siparis.| FROM satis.siparis', ['id', 'musteri_id', 'tutar']],
    ['yazılan kelimeyle', 'SELECT * FROM customers c WHERE c.na|', ['id', 'name', 'email']],
    ['tırnaklı takma ad', 'SELECT "C".| FROM customers "C"', ['id', 'name', 'email']],
  ])('%s → yalnızca o ilişkinin kolonları', (_, metin, beklenen) => {
    expect(etiketler(tamamlaIsaretli(metin))).toEqual(beklenen);
  });

  it('şema. ilişki yuvasında o şemanın ilişkileri öneksiz', () => {
    const s = tamamlaIsaretli('SELECT * FROM satis.|');
    expect(etiketler(s)).toEqual(['aylik_ozet', 'siparis']);
    expect(oneri(s, 'siparis')).toMatchObject({ eklenecek: 'siparis', oncelik: ONCELIK.ILISKI });
  });

  it('şema. ifade yuvasında o şemanın tabloları', () => {
    expect(etiketler(tamamlaIsaretli('SELECT satis.| FROM customers'), 'type')).toEqual(['aylik_ozet', 'siparis']);
  });

  it('niteleyiciden sonra aralık yalnızca kelimeyi kapsar', () => {
    const s = tamamlaIsaretli('SELECT c.na|me FROM customers c');
    expect(s).toMatchObject({ from: 9, to: 13 });
  });
});

describe('tamamla: tırnaklama', () => {
  it('çıplak olmayan adlar tırnaklı eklenir', () => {
    expect(oneri(tamamlaIsaretli('SELECT * FROM |'), 'Müşteri').eklenecek).toBe('"Müşteri"');
    expect(oneri(tamamlaIsaretli('SELECT | FROM "Müşteri"'), 'Ad Soyad').eklenecek).toBe('"Ad Soyad"');
  });

  it('" ile başlanan adda aralık tırnağı kapsar, etiket ve eklenecek tırnaklı', () => {
    const s = tamamlaIsaretli('SELECT * FROM "Mü|');
    expect(s).toMatchObject({ from: 14, to: 17 });
    expect(oneri(s, '"Müşteri"').eklenecek).toBe('"Müşteri"');
    expect(oneri(s, '"customers"').eklenecek).toBe('"customers"');
    expect(etiketler(s, 'keyword')).toEqual([]);
  });

  it('" ile başlanınca şema önekli adın her parçası tırnaklı', () => {
    const s = tamamlaIsaretli('SELECT * FROM "sa|');
    expect(oneri(s, '"satis"."aylik_ozet"')).toMatchObject({ eklenecek: '"satis"."aylik_ozet"' });
    expect(etiketler(s).filter((e) => e.includes('satis'))).toEqual(['"satis"."aylik_ozet"', '"satis"."siparis"']);
  });

  it('kapanmış tırnaklı adın ortasında imleç: aralık kapanış tırnağına kadar', () => {
    expect(tamamlaIsaretli('SELECT * FROM "Mü|şteri"')).toMatchObject({ from: 14, to: 23 });
  });
});

describe('tamamla: aralık', () => {
  it.each([
    ['kelime sonunda', 'SELECT * FROM cust|', 14, 18],
    ['kelime ortasında: to sağdaki kalanı kapsar', 'SELECT * FROM cu|stomers c', 14, 23],
    ['kelime başında', 'SELECT * FROM |customers', 14, 23],
    ['boşlukta', 'SELECT * FROM |', 14, 14],
  ])('%s', (_, metin, from, to) => {
    expect(tamamlaIsaretli(metin)).toMatchObject({ from, to });
  });
});

describe('tamamla: ifade sınırı, yorum ve dizge', () => {
  it('yalnızca imlecin ifadesine bakılır', () => {
    const s = tamamlaIsaretli('SELECT * FROM satis.siparis;\nSELECT | FROM customers;\nSELECT * FROM customer_orders');
    expect(etiketler(s, 'property')).toEqual(['id', 'name', 'email']);
  });

  it('noktalı virgülden sonra yeni ifade başlar', () => {
    const s = tamamlaIsaretli('SELECT * FROM customers; |');
    expect(etiketler(s, 'property')).toEqual([]);
    expect(etiketler(s, 'keyword')).toContain('SELECT');
  });

  it.each([
    ['satır yorumu', 'SELECT 1 -- FROM |'],
    ['blok yorum', 'SELECT /* | */ 1'],
    ['kapanmamış blok yorum', 'SELECT /* |'],
    ['dizge', "SELECT * FROM customers WHERE name = 'a|'"],
    ['kapanmamış dizge', "SELECT * FROM customers WHERE name = 'a|"],
    ['dollar dizgesi', 'SELECT $$ FROM |$$'],
  ])('%s içinde null', (_, metin) => {
    expect(tamamlaIsaretli(metin)).toBeNull();
  });

  it('yorumdan sonraki satırda tamamlanır', () => {
    expect(etiketler(tamamlaIsaretli('SELECT * -- yorum\nFROM |'))).toEqual(TUM_ILISKILER);
  });
});

describe('tamamla: anahtar kelimeler', () => {
  it('ifade başında anahtar kelimeler, BÜYÜK harfle', () => {
    const s = tamamlaIsaretli('|');
    expect(etiketler(s, 'keyword')).toContain('SELECT');
    expect(etiketler(s, 'keyword')).toContain('INSERT INTO');
    expect(oneri(s, 'SELECT')).toMatchObject({ eklenecek: 'SELECT', oncelik: ONCELIK.ANAHTAR });
  });

  it.each([
    ['sel', 'select'],
    ['SEL', 'SELECT'],
    ['Sel', 'SELECT'],
  ])('önek %s → %s', (onek, beklenen) => {
    expect(etiketler(tamamlaIsaretli(`${onek}|`), 'keyword')).toContain(beklenen);
  });

  it('ilişki ve kolon yuvalarında anahtar kelime yok', () => {
    expect(etiketler(tamamlaIsaretli('SELECT * FROM |'), 'keyword')).toEqual([]);
    expect(etiketler(tamamlaIsaretli('INSERT INTO customers (|'), 'keyword')).toEqual([]);
  });

  it('FROM öğesinden sonra (takma ad ya da sonraki yan cümle) yalnızca anahtar kelimeler', () => {
    const s = tamamlaIsaretli('SELECT * FROM customers |');
    expect(etiketler(s, 'keyword')).toContain('WHERE');
    expect(etiketler(s).filter((e) => !etiketler(s, 'keyword').includes(e))).toEqual([]);
  });
});

describe('tamamla: örtük tablo (Tablo sekmesi kutuları)', () => {
  const ortukTablo = { sema: 'satis', tablo: 'siparis' };

  it.each([
    ['where', '|'],
    ['where', 'tutar > 1 AND |'],
    ['orderBy', 'id DESC, |'],
  ] as const)('%s kutusu (%s): tablonun kolonları öneksiz', (kutu, metin) => {
    const s = tamamlaIsaretli(metin, { ortukTablo: { ...ortukTablo, kutu } });
    expect(etiketler(s, 'property')).toEqual(['id', 'musteri_id', 'tutar']);
    expect(etiketler(s, 'variable')).toEqual([]);
  });

  it('kutuda alt sorgu yazılırsa motor orada da çalışır', () => {
    const s = tamamlaIsaretli('musteri_id IN (SELECT id FROM |', { ortukTablo: { ...ortukTablo, kutu: 'where' } });
    expect(etiketler(s)).toEqual(TUM_ILISKILER);
  });
});

describe('tamamla: katalog yok', () => {
  it('anahtar kelimeler ve metinden çıkan takma adlar; kolon ve ilişki yok', () => {
    const s = tamamlaIsaretli('SELECT | FROM customers c JOIN customer_orders o ON true', { katalog: null });
    expect(etiketler(s, 'variable')).toEqual(['c', 'o']);
    expect(etiketler(s, 'property')).toEqual([]);
    expect(etiketler(s, 'keyword')).toContain('DISTINCT');
  });

  it('ilişki yuvasında öneri yoksa null', () => {
    expect(tamamlaIsaretli('SELECT * FROM |', { katalog: null })).toBeNull();
  });
});
