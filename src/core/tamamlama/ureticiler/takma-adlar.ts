/** İfade yuvasında kapsamdaki takma adlar ve takma adsız ilişki adları (katalog gerekmez). */
import { adMetni } from '../adlar';
import { ONCELIK } from '../oncelik';
import type { Uretici } from '../tipler';

export const takmaAdlar: Uretici = (b) => {
  if (b.yuva.tur !== 'ifade' || b.niteleyici) return [];
  const gorulen = new Set<string>();
  return b.kapsamlar.flat().flatMap((r) => {
    const ad = r.takmaAd ?? r.ad;
    // Örtük tablonun kolonları zaten öneksiz; adı ayrıca önerilmez.
    if (r.kaynak.tur === 'ortuk' || gorulen.has(ad)) return [];
    gorulen.add(ad);
    const tam = r.sema !== null ? `${r.sema}.${r.ad}` : r.ad;
    return [{ ...adMetni(b, [ad]), tur: 'variable' as const, detail: tam, oncelik: ONCELIK.KAPSAM }];
  });
};
