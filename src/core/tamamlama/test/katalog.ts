/**
 * `tamamla` testlerinin ortak fixture katalogu. Sonraki ticket'lar (FK, fonksiyon, tip) kendi
 * satırlarını buraya ekler; mevcut testler yalnızca adını andıkları nesnelere bakar.
 *
 * Şemalar: `public` (defaultSchema), `satis` (görünür), `gizli` (katalogda var, görünür değil).
 */
import type { Catalog, CatalogColumn, CatalogRelation, RelationKind } from '../../katalog';

export const kolon = (ad: string, tip = 'integer'): CatalogColumn => ({ ad, tip, tipOid: 23, notNull: false, varsayilan: false, uretilmis: false });

export const iliski = (sema: string, ad: string, kolonlar: CatalogColumn[], tur: RelationKind = 'r'): CatalogRelation => ({
  sema,
  ad,
  tur,
  kolonlar,
  pk: [],
  reltuples: 0,
});

export const KATALOG: Catalog = {
  defaultSchema: 'public',
  semalar: ['public', 'satis', 'gizli'],
  iliskiler: [
    iliski('gizli', 'sir', [kolon('id'), kolon('deger', 'text')]),
    iliski('public', 'Müşteri', [kolon('id'), kolon('Ad Soyad', 'text')]),
    iliski('public', 'aktif_musteriler', [kolon('id'), kolon('name', 'text')], 'v'),
    iliski('public', 'customer_orders', [kolon('id'), kolon('customer_id'), kolon('total', 'numeric(12,2)')]),
    iliski('public', 'customers', [kolon('id'), kolon('name', 'text'), kolon('email', 'text')]),
    iliski('satis', 'aylik_ozet', [kolon('ay', 'date'), kolon('toplam', 'numeric')], 'm'),
    iliski('satis', 'siparis', [kolon('id'), kolon('musteri_id'), kolon('tutar', 'numeric')]),
  ],
  tipler: {},
  kullaniciTipleri: [],
  fonksiyonlar: [],
  fkler: [],
};

/** Veritabanı seçiminde görünür şemalar (`gizli` değil). */
export const GORUNUR = ['public', 'satis'];
