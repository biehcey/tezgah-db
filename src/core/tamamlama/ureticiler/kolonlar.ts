/**
 * Kolonlar: ifade yuvasında kapsamdaki ilişkilerin kolonları öneksiz; kolon yuvasında yuvanın
 * ilişkisinin; `x.` / `şema.tablo.` niteleyicisinden sonra o ilişkinin. CTE / alt sorgu
 * kolonları metinden gelir (katalog gerekmez), `detail`'de tip yerine kaynak.
 */
import type { CatalogRelation } from '../../katalog';
import { adMetni, identSql } from '../adlar';
import { iliskiBul } from '../dizin';
import { ONCELIK } from '../oncelik';
import type { Baglam, KapsamIliskisi, Oneri, Uretici } from '../tipler';

/** Kapsam ilişkisinin katalogdaki karşılığı (CTE / alt sorgu değilse). */
export function kataloktaki(b: Baglam, r: KapsamIliskisi): CatalogRelation | null {
  if (r.kaynak.tur === 'cte' || r.kaynak.tur === 'altsorgu') return null;
  return iliskiBul(b, r.sema, r.ad);
}

/** Önerilecek kolon: ad ve `detail` (tip ya da kaynak). */
interface Kolon {
  ad: string;
  detail: string;
}

const KAYNAK_ADI = { cte: 'CTE', altsorgu: 'alt sorgu' } as const;

const katalogKolonlari = (r: CatalogRelation | null): Kolon[] => (r?.kolonlar ?? []).map((k) => ({ ad: k.ad, detail: k.tip }));

/** Kapsam ilişkisinin kolonları; bilinmiyorsa boş. */
function iliskiKolonlari(b: Baglam, r: KapsamIliskisi): Kolon[] {
  if (r.kaynak.tur === 'cte' || r.kaynak.tur === 'altsorgu') {
    const detail = KAYNAK_ADI[r.kaynak.tur];
    return (r.kaynak.kolonlar ?? []).map((ad) => ({ ad, detail }));
  }
  return katalogKolonlari(kataloktaki(b, r));
}

const kolonOnerisi = (b: Baglam, k: Kolon): Oneri => ({ ...adMetni(b, [k.ad]), tur: 'property', detail: k.detail, oncelik: ONCELIK.KAPSAM });

/** Niteleyicinin gösterdiği ilişkinin kolonları: önce kapsamdaki takma ad / ad, sonra katalog. */
function niteleyiciKolonlari(b: Baglam, niteleyici: readonly string[]): Kolon[] {
  if (niteleyici.length === 2) return katalogKolonlari(iliskiBul(b, niteleyici[0]!, niteleyici[1]!));
  const ad = niteleyici[0]!;
  for (const kapsam of b.kapsamlar) {
    const r = kapsam.find((r) => (r.takmaAd ?? r.ad) === ad);
    if (r) return iliskiKolonlari(b, r);
  }
  return katalogKolonlari(iliskiBul(b, null, ad));
}

export const kolonlar: Uretici = (b) => {
  if (b.yuva.tur === 'iliski') return [];
  if (b.niteleyici) return niteleyiciKolonlari(b, b.niteleyici).map((k) => kolonOnerisi(b, k));
  if (b.yuva.tur === 'kolon') return iliskiKolonlari(b, b.yuva.iliski).map((k) => kolonOnerisi(b, k));
  if (b.yuva.tur !== 'ifade') return [];
  return kapsamKolonlari(b);
};

/**
 * İfade yuvası: kapsamların kolonları, içten dışa. Aynı kapsamda birden çok ilişkide bulunan
 * (belirsiz) ya da iç kapsamdaki bir kolonla gölgelenen kolon `ilişki.kolon` olarak eklenir,
 * `detail` = `tip · ilişki`; diğerleri öneksiz.
 */
function kapsamKolonlari(b: Baglam): Oneri[] {
  const oneriler: Oneri[] = [];
  const icteki = new Set<string>();
  for (const kapsam of b.kapsamlar) {
    const listeler = kapsam.map((r) => ({ gorunen: r.takmaAd ?? r.ad, kolonlar: iliskiKolonlari(b, r) }));
    const sayi = new Map<string, number>();
    for (const { kolonlar } of listeler) for (const k of new Set(kolonlar.map((k) => k.ad))) sayi.set(k, (sayi.get(k) ?? 0) + 1);
    for (const { gorunen, kolonlar } of listeler) {
      for (const k of kolonlar) {
        const nitelikli = sayi.get(k.ad)! > 1 || icteki.has(k.ad);
        if (!nitelikli) {
          oneriler.push(kolonOnerisi(b, k));
          continue;
        }
        oneriler.push({
          etiket: adMetni(b, [k.ad]).etiket,
          tur: 'property',
          detail: `${k.detail} · ${gorunen}`,
          eklenecek: `${identSql(gorunen)}.${identSql(k.ad)}`,
          oncelik: ONCELIK.KAPSAM,
        });
      }
    }
    for (const k of sayi.keys()) icteki.add(k);
  }
  return oneriler;
}
