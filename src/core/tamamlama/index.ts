/**
 * Tamamlama motoru (ADR-0005): metin + imleç + Katalog önbelleği → değiştirilecek aralık ve
 * öneriler. Saf; hiçbir istek tetiklemez. Katalog `null` iken yalnızca metinden çıkanlar ve
 * anahtar kelimeler önerilir.
 */
import type { Catalog } from '../katalog';
import { baglamCikar } from './baglam';
import type { TamamlamaSecenekleri, TamamlamaSonucu } from './tipler';
import { URETICILER } from './ureticiler';

export type { Oneri, OneriTuru, OrtukTablo, TamamlamaSecenekleri, TamamlamaSonucu } from './tipler';
export { ONCELIK } from './oncelik';
export { popupAcilir, tabAraligi } from './editor';

/** İmleçteki öneriler; imleç yorumda / dizgedeyse ya da öneri yoksa `null`. */
export function tamamla(metin: string, imlec: number, katalog: Catalog | null, secenekler: TamamlamaSecenekleri): TamamlamaSonucu | null {
  const b = baglamCikar(metin, imlec, katalog, secenekler);
  if (!b) return null;
  const oneriler = URETICILER.flatMap((uret) => uret(b));
  return oneriler.length > 0 ? { from: b.from, to: b.to, oneriler } : null;
}
