import { describe, expect, it } from 'vitest';
import { splitStatements } from './ifade-bolme';
import { changesCatalog, searchTables, type Catalog, type CatalogRelation } from './katalog';

const col = (ad: string, tip: string) => ({ ad, tip, tipOid: 0, notNull: false, varsayilan: false, uretilmis: false });
const rel = (sema: string, ad: string, tur: CatalogRelation['tur'] = 'r', kolonlar = [col('id', 'integer')]): CatalogRelation => ({
  sema,
  ad,
  tur,
  kolonlar,
  pk: [],
  reltuples: -1,
});
const catalog = (iliskiler: CatalogRelation[], defaultSchema: string | null = 'public'): Catalog => ({
  defaultSchema,
  semalar: [...new Set(iliskiler.map((r) => r.sema))],
  iliskiler,
  tipler: {},
  kullaniciTipleri: [],
  fonksiyonlar: [],
});

describe('searchTables', () => {
  const c = catalog([rel('public', 'siparis'), rel('public', 'musteri_siparis'), rel('arsiv', 'Siparis_2020'), rel('gizli', 'siparis')]);

  it('görünür şemalarda büyük/küçük harf duyarsız arar; önce ad başında eşleşenler, sonra şema + ad sırası', () => {
    expect(searchTables(c, ['public', 'arsiv'], 'SIPAR').map((r) => `${r.sema}.${r.ad}`)).toEqual([
      'arsiv.Siparis_2020',
      'public.siparis',
      'public.musteri_siparis',
    ]);
  });

  it('şema.ad biçiminde de aranır; boş sorgu görünürlerin tümünü verir', () => {
    expect(searchTables(c, ['public', 'arsiv'], 'arsiv.sip').map((r) => r.ad)).toEqual(['Siparis_2020']);
    expect(searchTables(c, ['public'], '  ').map((r) => r.ad)).toEqual(['musteri_siparis', 'siparis']);
  });
});

describe('changesCatalog', () => {
  it.each([
    ['CREATE TABLE t (id int)', true],
    ['alter table t add column x int', true],
    ['DROP VIEW v', true],
    ['IMPORT FOREIGN SCHEMA s FROM SERVER x INTO public', true],
    ['SELECT * INTO yeni FROM eski', true],
    ['COMMENT ON TABLE t IS $$x$$', false],
    ['SELECT 1; UPDATE t SET a = 1', false],
    ['SELECT 1; create index on t (a)', true],
    ['', false],
  ])('%s → %s', (script, expected) => {
    expect(changesCatalog(splitStatements(script))).toBe(expected);
  });
});
