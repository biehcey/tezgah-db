/**
 * Kolonlar: ifade yuvasında kapsamdaki ilişkilerin kolonları öneksiz; kolon yuvasında yuvanın
 * ilişkisinin; `x.` / `şema.tablo.` niteleyicisinden sonra o ilişkinin.
 *
 * Belirsiz kolonlar (aynı ad birden çok ilişkide) ticket 02'de burada ele alınır.
 */
import type { CatalogRelation } from '../../katalog';
import { adMetni } from '../adlar';
import { iliskiBul } from '../dizin';
import { ONCELIK } from '../oncelik';
import type { Baglam, KapsamIliskisi, Oneri, Uretici } from '../tipler';

/** Kapsam ilişkisinin katalogdaki karşılığı (CTE / alt sorgu değilse). */
export function kataloktaki(b: Baglam, r: KapsamIliskisi): CatalogRelation | null {
  return iliskiBul(b, r.sema, r.ad);
}

function kolonOnerileri(b: Baglam, r: CatalogRelation | null): Oneri[] {
  return (r?.kolonlar ?? []).map((k) => ({ ...adMetni(b, [k.ad]), tur: 'property', detail: k.tip, oncelik: ONCELIK.KAPSAM }));
}

/** Niteleyicinin gösterdiği ilişki: önce kapsamdaki takma ad / ad, sonra katalog. */
function niteleyiciIliskisi(b: Baglam, niteleyici: readonly string[]): CatalogRelation | null {
  if (niteleyici.length === 2) return iliskiBul(b, niteleyici[0]!, niteleyici[1]!);
  const ad = niteleyici[0]!;
  for (const kapsam of b.kapsamlar) {
    const r = kapsam.find((r) => (r.takmaAd ?? r.ad) === ad);
    if (r) return kataloktaki(b, r);
  }
  return iliskiBul(b, null, ad);
}

export const kolonlar: Uretici = (b) => {
  if (b.yuva.tur !== 'ifade' && b.yuva.tur !== 'kolon') return [];
  if (b.niteleyici) return kolonOnerileri(b, niteleyiciIliskisi(b, b.niteleyici));
  if (b.yuva.tur === 'kolon') return kolonOnerileri(b, kataloktaki(b, b.yuva.iliski));
  if (b.yuva.tur !== 'ifade') return [];
  return b.kapsamlar.flat().flatMap((r) => kolonOnerileri(b, kataloktaki(b, r)));
};
