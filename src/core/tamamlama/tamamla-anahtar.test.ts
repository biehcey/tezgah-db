/** `tamamla`: bağlama göre anahtar kelimeler (ticket 06). */
import { describe, expect, it } from 'vitest';
import { ONCELIK } from './oncelik';
import { etiketler, oneri, tamamlaIsaretli } from './test/yardimci';

const anahtarlar = (metin: string, secenekler?: Parameters<typeof tamamlaIsaretli>[1]) =>
  etiketler(tamamlaIsaretli(metin, secenekler), 'keyword');

describe('tamamla: bağlama göre anahtar kelimeler', () => {
  it('ifade başı: deyim başlatan kelimeler, yan cümle ve operatör yok', () => {
    const k = anahtarlar('|');
    expect(k).toEqual(expect.arrayContaining(['SELECT', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'WITH', 'CREATE', 'ALTER', 'DROP']));
    expect(k).not.toContain('WHERE');
    expect(k).not.toContain('ORDER BY');
    expect(k).not.toContain('AND');
  });

  it.each([
    ['SELECT başı', 'SELECT |', ['DISTINCT', 'CASE', 'NOT'], ['FROM', 'AND', 'SELECT']],
    ['SELECT listesi sonrası', 'SELECT id |', ['FROM', 'AS', 'AND'], ['DISTINCT', 'WHERE']],
    ['SELECT *', 'SELECT * |', ['FROM'], ['DISTINCT']],
    ['FROM sonrası', 'SELECT * FROM customers |', ['WHERE', 'LEFT JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'UNION ALL'], ['SELECT', 'AND', 'ON']],
    ['JOIN sonrası', 'SELECT * FROM customers c JOIN customer_orders o |', ['ON', 'USING', 'WHERE'], ['AND']],
    ['JOIN türü', 'SELECT * FROM customers LEFT |', ['JOIN', 'OUTER JOIN'], ['WHERE']],
    ['WHERE terim', 'SELECT * FROM customers WHERE |', ['NOT', 'EXISTS', 'NULL', 'CASE'], ['AND', 'ORDER BY']],
    ['WHERE terim sonrası', 'SELECT * FROM customers WHERE id |', ['AND', 'OR', 'IS NOT NULL', 'IN', 'BETWEEN', 'LIKE', 'GROUP BY', 'ORDER BY', 'LIMIT'], ['WHERE', 'NOT']],
    ['WHERE operatör sonrası', 'SELECT * FROM customers WHERE id = 1 AND |', ['NOT', 'EXISTS'], ['AND']],
    ['ON terim sonrası', 'SELECT * FROM customers c JOIN customer_orders o ON o.customer_id = c.id |', ['AND', 'WHERE', 'JOIN'], ['ON']],
    ['HAVING terim sonrası', 'SELECT * FROM customers GROUP BY id HAVING count(*) > 1 |', ['AND', 'ORDER BY'], ['GROUP BY', 'WHERE']],
    ['GROUP BY sonrası', 'SELECT * FROM customers GROUP BY id |', ['HAVING', 'ORDER BY', 'LIMIT'], ['ASC', 'WHERE']],
    ['ORDER BY sonrası', 'SELECT * FROM customers ORDER BY id |', ['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST', 'LIMIT'], ['WHERE', 'AND']],
    ['ORDER BY … DESC', 'SELECT * FROM customers ORDER BY id DESC |', ['NULLS LAST', 'LIMIT'], ['ASC', 'DESC']],
    ['IS', 'SELECT * FROM customers WHERE email IS |', ['NULL', 'NOT NULL', 'DISTINCT FROM'], ['AND']],
    ['açık CASE', 'SELECT CASE WHEN id > 1 |', ['THEN', 'AND'], ['FROM']],
    ['alt sorgu başı', 'SELECT * FROM customers WHERE id IN (|', ['SELECT', 'NOT'], ['ORDER BY']],
    ['UPDATE … WHERE', 'UPDATE customers SET name = 1 WHERE id = 1 |', ['AND', 'RETURNING'], ['ORDER BY']],
    ['INSERT hedefi', 'INSERT INTO customers |', ['VALUES', 'SELECT', 'DEFAULT VALUES'], ['WHERE']],
    ['DDL başlangıcı', 'CREATE |', ['TABLE', 'INDEX', 'VIEW', 'OR REPLACE'], ['SELECT']],
    ['DROP', 'DROP |', ['TABLE', 'VIEW'], ['SELECT']],
  ])('%s: %s', (_, metin, olan, olmayan) => {
    const k = anahtarlar(metin);
    expect(k).toEqual(expect.arrayContaining(olan));
    for (const o of olmayan) expect(k).not.toContain(o);
  });

  it('takma ad yazılırken (AS sonrası) anahtar kelime yok', () => {
    expect(anahtarlar('SELECT * FROM customers AS |')).toEqual([]);
  });

  it('çok kelimeli gruplar tek öneri: etiket ve eklenecek tüm grup', () => {
    const s = tamamlaIsaretli('SELECT * FROM customers WHERE id |');
    expect(oneri(s, 'IS NOT NULL')).toMatchObject({ tur: 'keyword', eklenecek: 'IS NOT NULL' });
    expect(oneri(tamamlaIsaretli('SELECT * FROM customers |'), 'ORDER BY').eklenecek).toBe('ORDER BY');
  });

  it.each([
    ['küçük önek → küçük', 'SELECT * FROM customers ord|', 'order by'],
    ['büyük harf içeren önek → BÜYÜK', 'SELECT * FROM customers oRd|', 'ORDER BY'],
    ['boş önek → BÜYÜK', 'SELECT * FROM customers |', 'ORDER BY'],
  ])('harf durumu: %s', (_, metin, beklenen) => {
    expect(oneri(tamamlaIsaretli(metin), beklenen)).toMatchObject({ eklenecek: beklenen });
  });

  it('kendi bandında: fonksiyonların altında, diğer şemaların üstünde', () => {
    const { oncelik } = oneri(tamamlaIsaretli('SELECT * FROM customers |'), 'WHERE');
    expect(oncelik).toBe(ONCELIK.ANAHTAR);
    expect(oncelik).toBeLessThan(ONCELIK.FONKSIYON);
    expect(oncelik).toBeGreaterThan(ONCELIK.DIGER_SEMA);
  });
});

describe('tamamla: kutularda anahtar kelimeler', () => {
  const ortukTablo = { sema: 'satis', tablo: 'siparis' };

  it('ORDER BY kutusu: kolondan sonra ASC/DESC/NULLS FIRST|LAST, sonraki yan cümle yok', () => {
    const s = tamamlaIsaretli('tutar |', { ortukTablo: { ...ortukTablo, kutu: 'orderBy' } });
    expect(etiketler(s, 'keyword')).toEqual(['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST']);
    expect(etiketler(s, 'property')).toEqual(['id', 'musteri_id', 'tutar']);
  });

  it('WHERE kutusu: ifade anahtar kelimeleri, sonraki yan cümle yok', () => {
    expect(anahtarlar('|', { ortukTablo: { ...ortukTablo, kutu: 'where' } })).toEqual(expect.arrayContaining(['NOT', 'EXISTS']));
    const k = anahtarlar('tutar > 1 |', { ortukTablo: { ...ortukTablo, kutu: 'where' } });
    expect(k).toEqual(expect.arrayContaining(['AND', 'OR', 'IS NULL']));
    expect(k).not.toContain('ORDER BY');
    expect(k).not.toContain('SELECT');
  });
});
