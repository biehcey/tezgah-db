/**
 * Tamamlama bağlamı (GLOSSARY): imlecin ifadesi, yazılan kelime, niteleyici, parantez düzeyleri,
 * kapsamdaki ilişkiler ve yuva. Yarım SQL'de de makul bir sonuç verir; emin olunamayan yerde
 * yuva `anahtar`dır.
 */
import type { Catalog } from '../katalog';
import { lex, type Token } from '../ifade-bolme';
import { kapsamIliskileri } from './kapsam';
import { adDegeri, kelime } from './simge';
import type { Baglam, Cte, Duzey, KapsamIliskisi, TamamlamaSecenekleri, ZincirHalkasi } from './tipler';
import { duzeyinCteleri } from './turetilmis';
import { sonYanCumle, yuvaBul } from './yuvalar';

/** Sorgu düzeyini başlatan kelimeler (`( SELECT …`). */
const SORGU_BASLARI = new Set(['SELECT', 'WITH', 'VALUES', 'TABLE']);
/** Kapanmamış bir parantezin içinde olamayacak, dış sorgunun yan cümleleri. */
const DIS_YAN_CUMLELER = new Set(['FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'JOIN']);

/** İmleç yorumda ya da dizgede mi. */
function yorumYaDaDizgede(t: Token, imlec: number): boolean {
  if (t.tur !== 'yorum' && t.tur !== 'dizge') return false;
  if (imlec <= t.from) return false;
  // Satır yorumu satır sonuna kadar sürer: satır sonundaki imleç de yorumdadır.
  const satirYorumu = t.tur === 'yorum' && t.deger.startsWith('--');
  return imlec < t.to || (imlec === t.to && (satirYorumu || !t.kapali));
}

/**
 * İmlecin bağlamı; imleç yorumda ya da dizgedeyse `null`. Yalnızca imlecin ifadesine bakılır
 * (sınırlar ifade bölücününkiyle aynı: `;` ve psql meta komutları).
 */
export function baglamCikar(metin: string, imlec: number, katalog: Catalog | null, secenekler: TamamlamaSecenekleri): Baglam | null {
  const tumu = lex(metin);
  if (tumu.some((t) => yorumYaDaDizgede(t, imlec))) return null;

  // İmlecin ifadesi: imleçten önceki son sınır ile sonraki ilk sınır arası.
  const sinir = (t: Token) => t.tur === 'meta' || (t.tur === 'sembol' && t.deger === ';');
  let bas = 0;
  let son = tumu.length;
  tumu.forEach((t, i) => {
    if (!sinir(t)) return;
    if (t.to <= imlec) bas = i + 1;
    else if (son === tumu.length) son = i;
  });
  const simgeler = tumu.slice(bas, son).filter((t) => t.tur !== 'yorum');

  // Yazılan kelime: imleci içeren (ya da imleçte başlayan) kelime ya da tırnaklı ad.
  const adMi = (t: Token) => t.tur === 'kelime' || t.tur === 'ad';
  const icinde = simgeler.findIndex((t) => adMi(t) && t.from < imlec && imlec <= t.to);
  const kelimeIndeksi = icinde !== -1 ? icinde : simgeler.findIndex((t) => adMi(t) && t.from === imlec);
  const yazilan = kelimeIndeksi === -1 ? null : simgeler[kelimeIndeksi]!;
  const tirnakli = yazilan?.tur === 'ad';
  const from = yazilan?.from ?? imlec;
  const to = yazilan?.to ?? imlec;
  const onek = yazilan ? metin.slice(from + (tirnakli ? 1 : 0), Math.max(imlec, from)) : '';

  // Niteleyici: kelimeye bitişik `ad.` ya da `ad.ad.`.
  const once = simgeler.filter((t) => t.to <= from);
  const niteleyici: string[] = [];
  let ucu = from;
  while (niteleyici.length < 2) {
    const nokta = once.at(-1 - niteleyici.length * 2);
    const ad = once.at(-2 - niteleyici.length * 2);
    if (!nokta || nokta.tur !== 'sembol' || nokta.deger !== '.' || nokta.to !== ucu || !ad || !adMi(ad) || ad.to !== nokta.from) break;
    niteleyici.unshift(adDegeri(ad)!);
    ucu = ad.from;
  }

  // Düzeyler yazılan kelime ve niteleyici olmadan kurulur.
  const yapisal = simgeler.filter((t, i) => i !== kelimeIndeksi && !(t.from >= ucu && t.to <= from));
  const { kok, zincir } = duzeyleriKur(yapisal, imlec);

  const cteZinciri = gorunurCteler(zincir);
  const kapsamlar: KapsamIliskisi[][] = [];
  for (const [i, halka] of zincir.entries()) {
    if (!halka.duzey.sorgu || kardesleriGormez(halka, zincir[i - 1])) continue;
    const iliskiler = kapsamIliskileri(halka.duzey).map((r) => cteyeBagla(r, cteZinciri[i]!));
    if (halka.duzey === kok && secenekler.ortukTablo) {
      const { sema, tablo } = secenekler.ortukTablo;
      iliskiler.unshift({ sema, ad: tablo, takmaAd: null, kaynak: { tur: 'ortuk' } });
    }
    kapsamlar.push(iliskiler);
  }

  const taslak = {
    metin,
    imlec,
    from,
    to,
    onek,
    tirnakli,
    niteleyici: niteleyici.length > 0 ? niteleyici : null,
    onceki: zincir[0]!.onceki,
    zincir,
    kapsamlar,
    cteler: cteZinciri[0]!,
    katalog,
    secenekler,
  };
  return { ...taslak, yuva: yuvaBul(taslak) };
}

/**
 * Her halkadan görünen CTE'ler: halkanın kendi `WITH`'i ve dış halkalarınki; aynı adda içteki
 * dıştakini gölgeler.
 */
function gorunurCteler(zincir: readonly ZincirHalkasi[]): Cte[][] {
  const sonuc: Cte[][] = [];
  let dis: Cte[] = [];
  for (let i = zincir.length - 1; i >= 0; i--) {
    const kendi = duzeyinCteleri(zincir[i]!.duzey, zincir[i - 1]?.duzey ?? null);
    const adlar = new Set(kendi.map((c) => c.ad));
    dis = [...kendi, ...dis.filter((c) => !adlar.has(c.ad))];
    sonuc[i] = dis;
  }
  return sonuc;
}

/**
 * İmleci içeren `cocuk` grubu `ust` düzeyinin bir FROM öğesi (LATERAL değil) ya da CTE gövdesi
 * mi: öyleyse grup `ust`'ün ilişkilerini görmez (dış kapsamları görmeye devam eder).
 */
function kardesleriGormez(ust: ZincirHalkasi, cocuk: ZincirHalkasi | undefined): boolean {
  if (!cocuk) return false;
  const { onceki } = ust;
  if (kelime(onceki.at(-1)) === 'LATERAL') return false;
  const k = kelime(onceki[sonYanCumle(onceki)]);
  return k === 'FROM' || k === 'JOIN' || k === 'WITH';
}

/** Şemasız katalog ilişkisi adı görünen bir CTE'nin adıysa o CTE'dir. */
function cteyeBagla(r: KapsamIliskisi, cteler: readonly Cte[]): KapsamIliskisi {
  if (r.sema !== null || r.kaynak.tur !== 'katalog') return r;
  const cte = cteler.find((c) => c.ad === r.ad);
  return cte ? { ...r, kaynak: { tur: 'cte', kolonlar: cte.kolonlar } } : r;
}

/**
 * Parantez düzeyleri: alt gruplar üst düzeyde tek `grup` simgesine katlanır. `zincir` imlecin
 * düzeyinden köke; her halkanın `onceki`'si o düzeyde imleçten (ya da imleci içeren gruptan)
 * önceki simgelerdir.
 */
function duzeyleriKur(simgeler: Token[], imlec: number): { kok: Duzey; zincir: ZincirHalkasi[] } {
  const kok: Duzey = { simgeler: [], from: -1, sorgu: true };
  const yigin: Duzey[] = [kok];
  /** İmleci içeren gruplar, dıştan içe. */
  const icerenler: Duzey[] = [kok];
  for (const t of simgeler) {
    const ust = yigin.at(-1)!;
    if (t.tur === 'sembol' && t.deger === '(') {
      const grup: Duzey = { simgeler: [], from: t.from, sorgu: false };
      ust.simgeler.push({ tur: 'grup', from: t.from, to: t.to, ic: grup });
      yigin.push(grup);
      if (t.from < imlec && icerenler.at(-1) === ust) icerenler.push(grup);
    } else if (t.tur === 'sembol' && t.deger === ')' && yigin.length > 1) {
      const grup = yigin.pop()!;
      const s = yigin.at(-1)!.simgeler.at(-1)!;
      s.to = t.to;
      // Kapanışı imleçten önceyse imleç grubun içinde değildir.
      if (t.to <= imlec && icerenler.at(-1) === grup) icerenler.pop();
    } else {
      const tur = t.tur === 'kelime' || t.tur === 'ad' || t.tur === 'sembol' ? t.tur : 'diger';
      ust.simgeler.push({ tur, deger: t.deger, from: t.from, to: t.to });
    }
  }
  const sorguMu = (d: Duzey) => SORGU_BASLARI.has(kelime(d.simgeler[0]) ?? '');
  // Kapanmamış sorgu dışı grup (`SELECT coalesce(| FROM t`): imleçten sonraki ilk yan cümleden
  // itibarenki simgeler dış düzeye aittir.
  for (let i = yigin.length - 1; i > 0; i--) {
    const grup = yigin[i]!;
    if (sorguMu(grup)) continue;
    const k = grup.simgeler.findIndex((s) => s.from >= imlec && DIS_YAN_CUMLELER.has(kelime(s) ?? ''));
    if (k !== -1) yigin[i - 1]!.simgeler.push(...grup.simgeler.splice(k));
  }
  const isaretle = (d: Duzey) => {
    for (const s of d.simgeler) {
      if (s.tur !== 'grup') continue;
      s.ic.sorgu = sorguMu(s.ic);
      isaretle(s.ic);
    }
  };
  isaretle(kok);

  const zincir: ZincirHalkasi[] = [];
  for (let i = icerenler.length - 1; i >= 0; i--) {
    const duzey = icerenler[i]!;
    const cocuk = icerenler[i + 1];
    const sinir = cocuk ? cocuk.from : imlec;
    zincir.push({ duzey, onceki: duzey.simgeler.filter((s) => s.from < sinir) });
  }
  return { kok, zincir };
}
