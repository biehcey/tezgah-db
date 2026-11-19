/** İlişki yuvasında imlecin gördüğü CTE adları (katalog gerekmez). */
import { adMetni } from '../adlar';
import { ONCELIK } from '../oncelik';
import type { Uretici } from '../tipler';

export const cteAdlari: Uretici = (b) => {
  if (b.yuva.tur !== 'iliski' || b.niteleyici) return [];
  return b.cteler.map((c) => ({ ...adMetni(b, [c.ad]), tur: 'variable' as const, detail: 'CTE', oncelik: ONCELIK.KAPSAM }));
};
