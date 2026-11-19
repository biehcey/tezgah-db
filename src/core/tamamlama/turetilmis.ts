/**
 * Metinden çıkan ilişkiler: `WITH` listesindeki CTE'ler ve CTE / alt sorgu gövdelerinin kolon
 * adları. Kolon adı kuralı (spec "CTE ve alt sorgular"): açık kolon listesi varsa o; yoksa iç
 * SELECT listesinin her öğesi için `AS ad`, tek tanımlayıcı ya da `x.ad`'nin son parçası. `*` ya
 * da adsız ifade içeren listede kolonlar bilinmez (`null`).
 */
import { RESERVED } from './adlar';
import { adDegeri, kelime, sembol } from './simge';
import type { Cte, Duzey, DuzeySimgesi } from './tipler';

/** Tanımlayıcı olarak okunabilen simge: tırnaklı ad ya da ayrılmış olmayan çıplak kelime. */
function tanimlayici(s: DuzeySimgesi | undefined): string | null {
  if (s?.tur === 'ad') return s.deger;
  if (s?.tur === 'kelime' && !RESERVED.has(s.deger.toLowerCase())) return s.deger.toLowerCase();
  return null;
}

function virgulleBol(simgeler: readonly DuzeySimgesi[]): DuzeySimgesi[][] {
  const parcalar: DuzeySimgesi[][] = [[]];
  for (const s of simgeler) {
    if (sembol(s, ',')) parcalar.push([]);
    else parcalar.at(-1)!.push(s);
  }
  return parcalar;
}

/** Açık kolon listesi (`(a, b)` grubunun içi); bir öğe tek tanımlayıcı değilse `null`. */
export function kolonListesi(grup: Duzey): string[] | null {
  const kolonlar: string[] = [];
  for (const oge of virgulleBol(grup.simgeler)) {
    const ad = oge.length === 1 ? tanimlayici(oge[0]) : null;
    if (ad === null) return null;
    kolonlar.push(ad);
  }
  return kolonlar;
}

/** SELECT listesini bitiren yan cümle kelimeleri. */
const SECIM_SONU = new Set(['FROM', 'INTO', 'WHERE', 'GROUP', 'HAVING', 'WINDOW', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'UNION', 'INTERSECT', 'EXCEPT', 'FOR']);

/** SELECT listesi öğesinin adı: `… AS ad`, `ad` ya da `x.ad` / `a.b.ad`; değilse `null`. */
function ogeAdi(oge: readonly DuzeySimgesi[]): string | null {
  const n = oge.length;
  if (n >= 3 && kelime(oge[n - 2]) === 'AS') return adDegeri(oge[n - 1]!);
  const nitelikliAd = n % 2 === 1 && oge.every((s, i) => (i % 2 === 0 ? tanimlayici(s) !== null : sembol(s, '.')));
  return nitelikliAd ? tanimlayici(oge[n - 1]) : null;
}

/** Sorgu düzeyinin (CTE / alt sorgu gövdesi) SELECT listesinden kolon adları; çıkarılamazsa `null`. */
export function secimKolonlari(duzey: Duzey): string[] | null {
  const s = duzey.simgeler;
  let i = s.findIndex((x) => kelime(x) === 'SELECT');
  if (i === -1) return null;
  i++;
  if (kelime(s[i]) === 'ALL') i++;
  else if (kelime(s[i]) === 'DISTINCT') {
    i++;
    if (kelime(s[i]) === 'ON' && s[i + 1]?.tur === 'grup') i += 2;
  }
  const son = s.findIndex((x, k) => k >= i && SECIM_SONU.has(kelime(x) ?? ''));
  const kolonlar: string[] = [];
  for (const oge of virgulleBol(s.slice(i, son === -1 ? undefined : son))) {
    // Yazılmakta olan listenin sonundaki boş öğe (`SELECT a, `) atlanır.
    if (oge.length === 0) continue;
    const ad = ogeAdi(oge);
    if (ad === null) return null;
    kolonlar.push(ad);
  }
  return kolonlar;
}

interface CteTanimi extends Cte {
  /** Gövde grubu (`AS ( … )`'nin içi); henüz yazılmadıysa `null`. */
  govde: Duzey | null;
}

/** Düzey `WITH` ile başlıyorsa CTE tanımları, metindeki sırayla. */
function withListesi(duzey: Duzey): { recursive: boolean; tanimlar: CteTanimi[] } | null {
  const s = duzey.simgeler;
  if (kelime(s[0]) !== 'WITH') return null;
  let i = 1;
  const recursive = kelime(s[i]) === 'RECURSIVE';
  if (recursive) i++;
  const tanimlar: CteTanimi[] = [];
  for (;;) {
    const ad = tanimlayici(s[i]);
    if (ad === null) break;
    i++;
    const listeGrubu = s[i];
    const acik = listeGrubu?.tur === 'grup' ? kolonListesi(listeGrubu.ic) : null;
    if (listeGrubu?.tur === 'grup') i++;
    if (kelime(s[i]) === 'AS') i++;
    if (kelime(s[i]) === 'NOT') i++;
    if (kelime(s[i]) === 'MATERIALIZED') i++;
    const govdeGrubu = s[i];
    const govde = govdeGrubu?.tur === 'grup' ? govdeGrubu.ic : null;
    tanimlar.push({ ad, kolonlar: acik ?? (govde ? secimKolonlari(govde) : null), govde });
    if (!govde || !sembol(s[i + 1], ',')) break;
    i += 2;
  }
  return { recursive, tanimlar };
}

/**
 * Düzeyin `WITH` listesinden, imleci içeren `cocuk` grubundan görünen CTE'ler: imleç bir CTE
 * gövdesindeyse yalnızca öncekiler (RECURSIVE ise hepsi, kendisi dahil), değilse hepsi.
 */
export function duzeyinCteleri(duzey: Duzey, cocuk: Duzey | null): Cte[] {
  const liste = withListesi(duzey);
  if (!liste) return [];
  const k = cocuk ? liste.tanimlar.findIndex((t) => t.govde === cocuk) : -1;
  const gorunen = k === -1 || liste.recursive ? liste.tanimlar : liste.tanimlar.slice(0, k);
  return gorunen.map(({ ad, kolonlar }) => ({ ad, kolonlar }));
}
