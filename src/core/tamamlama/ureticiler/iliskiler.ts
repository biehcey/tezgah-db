/** İlişki adları: ilişki yuvasında ve `şema.` niteleyicisinden sonra. */
import type { CatalogRelation, RelationKind } from '../../katalog';
import { adMetni } from '../adlar';
import { semaninIliskileri, varsayilanSemada } from '../dizin';
import { ONCELIK } from '../oncelik';
import type { Baglam, Oneri, Uretici } from '../tipler';

export const ILISKI_TURLERI: Record<RelationKind, string> = {
  r: 'tablo',
  v: 'view',
  m: 'materialized view',
  p: 'bölümlü tablo',
  f: 'foreign tablo',
};

function iliskiOnerisi(b: Baglam, r: CatalogRelation, onekli: boolean, oncelik: number): Oneri {
  return { ...adMetni(b, onekli ? [r.sema, r.ad] : [r.ad]), tur: 'type', detail: ILISKI_TURLERI[r.tur], oncelik };
}

export const iliskiler: Uretici = (b) => {
  if (b.niteleyici) {
    // `şema.`: o şemanın ilişkileri öneksiz. İfade yuvasında da (spec 18: tablolar); takma adla
    // çakışan niteleyiciyi kolon üreticisi karşılar.
    if (b.niteleyici.length !== 1 || b.yuva.tur === 'anahtar' || b.yuva.tur === 'kolon') return [];
    if (b.yuva.tur === 'ifade' && b.kapsamlar.flat().some((r) => (r.takmaAd ?? r.ad) === b.niteleyici![0])) return [];
    return semaninIliskileri(b, b.niteleyici[0]!).map((r) => iliskiOnerisi(b, r, false, ONCELIK.ILISKI));
  }
  if (b.yuva.tur !== 'iliski') return [];
  return b.secenekler.gorunurSemalar.flatMap((sema) => {
    const varsayilan = varsayilanSemada(b, sema);
    return semaninIliskileri(b, sema).map((r) => iliskiOnerisi(b, r, !varsayilan, varsayilan ? ONCELIK.ILISKI : ONCELIK.DIGER_SEMA));
  });
};
