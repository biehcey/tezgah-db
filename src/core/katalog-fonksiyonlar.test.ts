import { describe, expect, it } from 'vitest';
import { buildCatalog } from './katalog';

const satirlar = (fonksiyonlar: Record<string, string | null>[]) =>
  buildCatalog({ semalar: ['public'], defaultSchema: 'public', iliskiler: [], tipler: [], fonksiyonlar, fkler: [] });

describe('buildCatalog: fonksiyonlar', () => {
  it('aşırı yükleme başına bir satır; tür, imza, küme döndürme ve açıklama dönüştürülür; şema, ad sırasıyla', () => {
    const katalog = satirlar([
      { sema: 'public', ad: 'topla', tur: 'f', argumanlar: 'a integer, b integer', donus: 'integer', kume: 'f', aciklama: 'İki sayı' },
      { sema: 'pg_catalog', ad: 'generate_series', tur: 'f', argumanlar: 'integer, integer', donus: 'SETOF integer', kume: 't', aciklama: null },
      { sema: 'public', ad: 'arsivle', tur: 'p', argumanlar: '', donus: null, kume: 'f', aciklama: null },
      { sema: 'public', ad: 'topla', tur: 'f', argumanlar: 'a numeric, b numeric', donus: 'numeric', kume: 'false', aciklama: null },
      { sema: 'pg_catalog', ad: 'count', tur: 'a', argumanlar: '', donus: 'bigint', kume: 'f', aciklama: 'satır sayısı' },
      { sema: 'pg_catalog', ad: 'row_number', tur: 'w', argumanlar: '', donus: 'bigint', kume: 'f', aciklama: null },
    ]);
    expect(katalog.fonksiyonlar).toEqual([
      { sema: 'pg_catalog', ad: 'count', tur: 'a', argumanlar: '', donus: 'bigint', kumeDondurur: false, aciklama: 'satır sayısı' },
      { sema: 'pg_catalog', ad: 'generate_series', tur: 'f', argumanlar: 'integer, integer', donus: 'SETOF integer', kumeDondurur: true, aciklama: null },
      { sema: 'pg_catalog', ad: 'row_number', tur: 'w', argumanlar: '', donus: 'bigint', kumeDondurur: false, aciklama: null },
      { sema: 'public', ad: 'arsivle', tur: 'p', argumanlar: '', donus: '', kumeDondurur: false, aciklama: null },
      { sema: 'public', ad: 'topla', tur: 'f', argumanlar: 'a integer, b integer', donus: 'integer', kumeDondurur: false, aciklama: 'İki sayı' },
      { sema: 'public', ad: 'topla', tur: 'f', argumanlar: 'a numeric, b numeric', donus: 'numeric', kumeDondurur: false, aciklama: null },
    ]);
  });

  it('tanınmayan tür ve eksik ad/şema satırları atlanır', () => {
    const katalog = satirlar([
      { sema: 'public', ad: 'garip', tur: 'x', argumanlar: '', donus: 'integer', kume: 'f', aciklama: null },
      { sema: null, ad: 'adsiz', tur: 'f', argumanlar: '', donus: 'integer', kume: 'f', aciklama: null },
      { name: 'sahte' },
    ]);
    expect(katalog.fonksiyonlar).toEqual([]);
  });
});
