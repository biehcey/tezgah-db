/**
 * Performans testinin büyük fixture katalogu (ticket 07): 5.000 ilişki × 20 kolon, 3.000
 * fonksiyon (aşırı yüklemeli), 2.000 FK. Deterministik; her çağrı yeni bir katalog nesnesi döner
 * (dizin önbelleği katalog nesnesine bağlı olduğundan "soğuk" katalog için).
 *
 * Şemalar: `public` (defaultSchema, `t0000`…`t2999`), `satis` (`s0000`…`s1999`).
 */
import type { Catalog, CatalogForeignKey, CatalogFunction, CatalogRelation } from '../../katalog';
import { iliski, kolon } from './katalog';

export const BUYUK_GORUNUR = ['public', 'satis'];

const no = (i: number) => String(i).padStart(4, '0');

/** `public` tablosunun adı (`t0042`). */
export const tablo = (i: number) => `t${no(i)}`;

export function buyukKatalog(): Catalog {
  const iliskiler: CatalogRelation[] = [];
  const kolonlar = () => [kolon('id'), ...Array.from({ length: 19 }, (_, k) => kolon(`kolon_${k}`, k % 2 ? 'text' : 'integer'))];
  for (let i = 0; i < 3000; i++) iliskiler.push(iliski('public', tablo(i), kolonlar()));
  for (let i = 0; i < 2000; i++) iliskiler.push(iliski('satis', `s${no(i)}`, kolonlar()));

  const fonksiyonlar: CatalogFunction[] = [];
  const fonksiyon = (sema: string, ad: string, i: number): CatalogFunction => ({
    sema,
    ad,
    tur: i % 50 === 0 ? 'p' : i % 7 === 0 ? 'a' : 'f',
    argumanlar: `a integer, b text DEFAULT ''::text`,
    donus: i % 11 === 0 ? 'SETOF integer' : 'integer',
    kumeDondurur: i % 11 === 0,
    aciklama: i % 3 === 0 ? `fonksiyon ${ad}` : null,
  });
  // pg_catalog: 2.400 satır (1.200 ad, her biri iki aşırı yükleme); public: 600 satır.
  for (let i = 0; i < 1200; i++) fonksiyonlar.push(fonksiyon('pg_catalog', `pg_f${no(i)}`, i), fonksiyon('pg_catalog', `pg_f${no(i)}`, i + 1));
  for (let i = 0; i < 600; i++) fonksiyonlar.push(fonksiyon('public', `f${no(i)}`, i));

  const fkler: CatalogForeignKey[] = Array.from({ length: 2000 }, (_, i) => ({
    ad: `fk_${i}`,
    kaynak: { sema: 'public', ad: tablo(i % 3000), kolonlar: [`kolon_${i % 19}`] },
    hedef: { sema: i % 2 ? 'satis' : 'public', ad: i % 2 ? `s${no((i * 7) % 2000)}` : tablo((i * 7) % 3000), kolonlar: ['id'] },
  }));

  return {
    defaultSchema: 'public',
    semalar: ['public', 'satis'],
    iliskiler,
    tipler: {},
    kullaniciTipleri: [],
    fonksiyonlar,
    fkler,
  };
}
