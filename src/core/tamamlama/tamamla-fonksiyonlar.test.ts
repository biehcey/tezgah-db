import { describe, expect, it } from 'vitest';
import type { Catalog, CatalogFunction, FunctionKind } from '../katalog';
import { ONCELIK } from './index';
import { KATALOG } from './test/katalog';
import { etiketler, oneri, tamamlaIsaretli, type IsaretliSecenekler } from './test/yardimci';

const fonksiyon = (sema: string, ad: string, argumanlar: string, donus: string, ek: Partial<CatalogFunction> = {}): CatalogFunction => ({
  sema,
  ad,
  tur: 'f' as FunctionKind,
  argumanlar,
  donus,
  kumeDondurur: false,
  aciklama: null,
  ...ek,
});

/** Fixture katalog + fonksiyonlar (`buildCatalog` sırası: şema, ad; aşırı yüklemeler okunduğu sırada). */
const KATALOG_F: Catalog = {
  ...KATALOG,
  fonksiyonlar: [
    fonksiyon('gizli', 'gizli_fn', '', 'integer'),
    fonksiyon('pg_catalog', 'count', '', 'bigint', { tur: 'a' }),
    fonksiyon('pg_catalog', 'count', '"any"', 'bigint', { tur: 'a' }),
    fonksiyon('pg_catalog', 'generate_series', 'integer, integer', 'SETOF integer', { kumeDondurur: true }),
    fonksiyon('pg_catalog', 'lower', 'text', 'text', { aciklama: 'küçük harfe çevirir' }),
    fonksiyon('pg_catalog', 'row_number', '', 'bigint', { tur: 'w' }),
    fonksiyon('public', 'Büyük', '', 'integer'),
    fonksiyon('public', 'arsivle', 'gun integer', '', { tur: 'p' }),
    fonksiyon('public', 'sayilar', 'n integer', 'SETOF integer', { kumeDondurur: true }),
    fonksiyon('public', 'simdi', '', 'timestamp with time zone'),
    fonksiyon('public', 'topla', 'a integer, b integer', 'integer', { aciklama: 'Sayıları toplar' }),
    fonksiyon('public', 'topla', 'a numeric, b numeric', 'numeric'),
    fonksiyon('public', 'topla', 'a numeric, b numeric, c numeric', 'numeric'),
    fonksiyon('satis', 'kapat', '', '', { tur: 'p' }),
    fonksiyon('satis', 'rapor', 'yil integer', 'TABLE(ay date, toplam numeric)', { kumeDondurur: true }),
    fonksiyon('satis', 'vergi', 'tutar numeric', 'numeric'),
  ],
};

const tamamla = (metin: string, secenekler: IsaretliSecenekler = {}) => tamamlaIsaretli(metin, { katalog: KATALOG_F, ...secenekler });
const fonksiyonlar = (metin: string) => etiketler(tamamla(metin), 'function');

describe('tamamla: fonksiyonlar, ifade yuvası', () => {
  it('görünür şemalar ve pg_catalog: fonksiyon, aggregate, window; prosedür ve görünmez şema yok', () => {
    expect(fonksiyonlar('SELECT | FROM customers')).toEqual([
      'count',
      'generate_series',
      'lower',
      'row_number',
      'Büyük',
      'sayilar',
      'simdi',
      'topla',
      'satis.rapor',
      'satis.vergi',
    ]);
  });

  it('pg_catalog ve defaultSchema öneksiz FONKSIYON bandında; diğer şemalar önekli DIGER_SEMA bandında', () => {
    const s = tamamla('SELECT * FROM customers WHERE |');
    expect(oneri(s, 'lower', 'function')).toMatchObject({ eklenecek: 'lower()', oncelik: ONCELIK.FONKSIYON });
    expect(oneri(s, 'topla', 'function')).toMatchObject({ eklenecek: 'topla()', oncelik: ONCELIK.FONKSIYON });
    expect(oneri(s, 'satis.vergi', 'function')).toMatchObject({ eklenecek: 'satis.vergi()', oncelik: ONCELIK.DIGER_SEMA });
    expect(oneri(s, 'Büyük', 'function').eklenecek).toBe('"Büyük"()');
  });

  it('aşırı yüklemeler tek öneri: detail ilk imza + "+N", info tüm imzalar ve açıklama', () => {
    const s = tamamla('SELECT top|');
    expect(oneri(s, 'topla', 'function')).toMatchObject({
      detail: '(a integer, b integer) → integer +2',
      info: 'topla(a integer, b integer) → integer\ntopla(a numeric, b numeric) → numeric\ntopla(a numeric, b numeric, c numeric) → numeric\n\nSayıları toplar',
    });
    expect(oneri(s, 'lower', 'function')).toMatchObject({ detail: '(text) → text', info: 'lower(text) → text\n\nküçük harfe çevirir' });
  });

  it('imleç parantezin içinde; tek imzalı argümansız fonksiyonda sonunda', () => {
    const s = tamamla('SELECT |');
    expect(oneri(s, 'topla', 'function')).toMatchObject({ eklenecek: 'topla()', imlec: 6 });
    // `count()` ve `count("any")`: iki imza, biri argümanlı
    expect(oneri(s, 'count', 'function')).toMatchObject({ eklenecek: 'count()', imlec: 6 });
    expect(oneri(s, 'simdi', 'function').imlec ?? 'simdi()'.length).toBe('simdi()'.length);
    expect(oneri(s, 'row_number', 'function').imlec ?? 'row_number()'.length).toBe('row_number()'.length);
  });

  it('"şema." sonrası o şemanın fonksiyonları öneksiz; pg_catalog. de olur; görünmez şema olmaz', () => {
    expect(fonksiyonlar('SELECT satis.| FROM customers')).toEqual(['rapor', 'vergi']);
    expect(oneri(tamamla('SELECT satis.v|'), 'vergi', 'function')).toMatchObject({ eklenecek: 'vergi()', oncelik: ONCELIK.FONKSIYON });
    expect(fonksiyonlar('SELECT pg_catalog.|')).toEqual(['count', 'generate_series', 'lower', 'row_number']);
    expect(fonksiyonlar('SELECT gizli.|')).toEqual([]);
  });

  it('takma adla nitelenmiş adda fonksiyon yok; katalog yokken fonksiyon yok', () => {
    expect(fonksiyonlar('SELECT c.| FROM customers c')).toEqual([]);
    expect(etiketler(tamamla('SELECT |', { katalog: null }), 'function')).toEqual([]);
  });
});

describe('tamamla: fonksiyonlar, ilişki ve CALL yuvaları', () => {
  it.each([
    ['FROM', 'SELECT * FROM |'],
    ['JOIN', 'SELECT * FROM customers c JOIN |'],
    ['virgülle', 'SELECT * FROM customers c, |'],
  ])('%s sonrası yalnızca set-returning fonksiyonlar', (_, metin) => {
    expect(fonksiyonlar(metin)).toEqual(['generate_series', 'sayilar', 'satis.rapor']);
  });

  it('UPDATE / INSERT INTO / DELETE FROM sonrası fonksiyon yok', () => {
    expect(fonksiyonlar('UPDATE |')).toEqual([]);
    expect(fonksiyonlar('INSERT INTO |')).toEqual([]);
    expect(fonksiyonlar('DELETE FROM |')).toEqual([]);
  });

  it('FROM satis. sonrası o şemanın SRF\'leri', () => {
    expect(fonksiyonlar('SELECT * FROM satis.|')).toEqual(['rapor']);
  });

  it('CALL sonrası yalnızca prosedürler; anahtar kelime, ilişki ya da kolon yok', () => {
    const s = tamamla('CALL |');
    expect(etiketler(s)).toEqual(['arsivle', 'satis.kapat']);
    expect(oneri(s, 'arsivle')).toMatchObject({ tur: 'function', detail: '(gun integer)', eklenecek: 'arsivle()', imlec: 8 });
    expect(oneri(s, 'satis.kapat').imlec).toBeUndefined();
    expect(etiketler(tamamla('CALL satis.|'))).toEqual(['kapat']);
  });

  it('CALL argümanında ifade yuvası', () => {
    expect(fonksiyonlar('CALL arsivle(|')).toContain('topla');
    expect(fonksiyonlar('CALL arsivle(|')).not.toContain('arsivle');
  });
});

describe('tamamla: FROM öğesi olarak fonksiyon', () => {
  it('fonksiyondan sonraki FROM öğeleri kapsamda; fonksiyonun takma adı kolonsuz ilişki', () => {
    const s = tamamla('SELECT | FROM generate_series(1, 2) g, customers c');
    expect(etiketler(s, 'property')).toEqual(['id', 'name', 'email']);
    expect(etiketler(s, 'variable')).toEqual(['g', 'c']);
    expect(oneri(s, 'g')).toMatchObject({ detail: 'fonksiyon', oncelik: ONCELIK.KAPSAM });
  });

  it('takma ad niteleyicisi katalogdan çözülmez; açık kolon listesi kolonlarıdır', () => {
    expect(tamamla('SELECT g.| FROM generate_series(1, 2) g')).toBeNull();
    const s = tamamla('SELECT g.| FROM generate_series(1, 2) AS g(n)');
    expect(etiketler(s)).toEqual(['n']);
    expect(oneri(s, 'n')).toMatchObject({ tur: 'property', detail: 'fonksiyon' });
  });

  it('takma adsız fonksiyon adıyla anılır', () => {
    expect(etiketler(tamamla('SELECT | FROM generate_series(1, 2) JOIN customers c ON true'), 'variable')).toEqual(['generate_series', 'c']);
  });
});
