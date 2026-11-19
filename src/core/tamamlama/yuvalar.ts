/**
 * Yuva tespiti: imleçte ne beklendiği. `YUVA_KURALLARI` sırayla denenir, `null` döndürmeyen ilk
 * kural kazanır; hiçbiri uymazsa yan cümle tablosuna (`YAN_CUMLELER`) bakılır.
 *
 * Yeni yuvalar kendi kuralını ekler. Tip yuvası (`::`, `CAST(… AS`) ve DDL ifadeleri
 * (`yuvalar-ddl.ts`) kuralların başındadır: DDL kuralı tanıdığı ifadenin yuvasını tümüyle verir.
 */
import { katalogIliskisi } from './kapsam';
import { adOku, kelime, sembol } from './simge';
import { terimBekleniyor } from './terim';
import { ddlKurali, tipKurali } from './yuvalar-ddl';
import { ANAHTAR, CAGRI, IFADE, ILISKI, type Baglam, type DuzeySimgesi, type Yuva, type ZincirHalkasi } from './tipler';

/** Kuralların gördüğü bağlam (yuva henüz yok). */
export type YuvaGirdisi = Omit<Baglam, 'yuva'>;
export type YuvaKurali = (g: YuvaGirdisi) => Yuva | null;

/** `onceki`'nin sonundaki `ad` ya da `ad.ad` ve başladığı indeks; yoksa `null`. */
function sondakiAd(onceki: readonly DuzeySimgesi[]): { sema: string | null; ad: string; bas: number } | null {
  const n = onceki.length;
  for (const bas of [n - 3, n - 1]) {
    const ad = adOku(onceki, bas);
    if (ad?.son === n) return { sema: ad.sema, ad: ad.ad, bas };
  }
  return null;
}

/** `INSERT INTO t (|`: grubun hemen önünde `INSERT INTO ad` varsa o ilişkinin kolonları. */
const insertKolonListesi: YuvaKurali = ({ zincir }) => {
  const [ic, ust] = zincir;
  if (!ic || !ust || ic.duzey.sorgu) return null;
  const hedef = sondakiAd(ust.onceki);
  if (!hedef || kelime(ust.onceki[hedef.bas - 1]) !== 'INTO' || kelime(ust.onceki[hedef.bas - 2]) !== 'INSERT') return null;
  return { tur: 'kolon', iliski: katalogIliskisi(hedef) };
};

/** `UPDATE t SET |` ve `SET a = 1, |`: atanan kolon, yani UPDATE'in ilişkisinin kolonları. */
const setSolTarafi: YuvaKurali = ({ onceki }) => {
  const set = onceki.findLastIndex((s) => kelime(s) === 'SET');
  if (set === -1 || sonYanCumle(onceki) !== set) return null;
  const son = onceki.at(-1)!;
  if (son !== onceki[set] && !sembol(son, ',')) return null;
  const update = onceki.findLastIndex((s, i) => i < set && kelime(s) === 'UPDATE');
  if (update === -1) return null;
  // `UPDATE [ONLY] [şema.]ad [[AS] takma] SET`
  const ad = adOku(onceki.slice(update + 1, set).filter((s) => kelime(s) !== 'ONLY'), 0);
  return ad ? { tur: 'kolon', iliski: katalogIliskisi(ad) } : null;
};

/** `a IS |`, `a IS NOT |`: yalnızca `NULL`, `TRUE`, `DISTINCT FROM`… gelir. */
const isSonrasi: YuvaKurali = ({ onceki }) => {
  const son = kelime(onceki.at(-1));
  return son === 'IS' || (son === 'NOT' && kelime(onceki.at(-2)) === 'IS') ? ANAHTAR : null;
};

/** Önceki simgeler bir ilişki listesinde yeni öğe bekliyor mu (`FROM |`, `FROM a, |`). */
const yeniOge = (sonra: readonly DuzeySimgesi[], virgul: boolean) =>
  sonra.length === 0 || (virgul && sembol(sonra.at(-1), ','));

/**
 * Yan cümle başlatan kelime → yuva. `sonra`: kelimeden imlece kadarki simgeler (bu düzeyde),
 * `once`: kelimeden önceki simgeler.
 */
export const YAN_CUMLELER: Record<string, (sonra: readonly DuzeySimgesi[], once: readonly DuzeySimgesi[]) => Yuva> = {
  FROM: (sonra) => (yeniOge(sonra, true) ? ILISKI : ANAHTAR),
  JOIN: (sonra) => (yeniOge(sonra, false) ? ILISKI : ANAHTAR),
  UPDATE: (sonra) => (yeniOge(sonra, false) ? ILISKI : ANAHTAR),
  INTO: (sonra, once) => (kelime(once.at(-1)) === 'INSERT' && yeniOge(sonra, false) ? ILISKI : ANAHTAR),
  // `CALL p(|`: argümanlar ifadedir (dış halkada `sonra` = `[p]`).
  CALL: (sonra) => (sonra.length === 0 ? CAGRI : IFADE),
  SELECT: () => IFADE,
  WHERE: () => IFADE,
  ON: () => IFADE,
  HAVING: () => IFADE,
  BY: () => IFADE,
  SET: () => IFADE,
  RETURNING: () => IFADE,
  VALUES: () => IFADE,
  LIMIT: () => IFADE,
  OFFSET: () => IFADE,
  INSERT: () => ANAHTAR,
  DELETE: () => ANAHTAR,
  WITH: () => ANAHTAR,
};

/** Kural tablosu: ilk uyan kazanır. */
export const YUVA_KURALLARI: YuvaKurali[] = [tipKurali, ddlKurali, insertKolonListesi, setSolTarafi, isSonrasi];

/** Simgelerdeki son yan cümle kelimesinin (`YAN_CUMLELER`) indeksi; yoksa `-1`. */
export function sonYanCumle(onceki: readonly DuzeySimgesi[]): number {
  return onceki.findLastIndex((s) => YAN_CUMLELER[kelime(s) ?? ''] !== undefined);
}

/** Halkada son yan cümle kelimesine göre yuva; yan cümle yoksa `null`. */
function yanCumle({ onceki }: ZincirHalkasi): Yuva | null {
  const i = sonYanCumle(onceki);
  if (i === -1) return null;
  return YAN_CUMLELER[kelime(onceki[i])!]!(onceki.slice(i + 1), onceki.slice(0, i));
}

/**
 * İfade yuvasında terim bitmişse (`WHERE id |`, `ORDER BY ad |`) operatör / değiştirici beklenir:
 * yuva `anahtar` olur, kolon / takma ad / fonksiyon önerilmez.
 */
export function yuvaBul(g: YuvaGirdisi): Yuva {
  const yuva = yanCumleYuvasi(g);
  return yuva.tur === 'ifade' && !terimBekleniyor(g.onceki) ? ANAHTAR : yuva;
}

function yanCumleYuvasi(g: YuvaGirdisi): Yuva {
  for (const kural of YUVA_KURALLARI) {
    const yuva = kural(g);
    if (yuva) return yuva;
  }
  // Sorgu olmayan grup (`f(|`, `IN (|`) yan cümlesini dış düzeyden alır.
  for (const halka of g.zincir) {
    const yuva = yanCumle(halka);
    if (yuva) return halka === g.zincir[0] || yuva.tur !== 'iliski' ? yuva : IFADE;
  }
  // Tablo sekmesi kutusu: metnin tamamı örtük tablonun ifadesidir.
  return g.secenekler.ortukTablo ? IFADE : ANAHTAR;
}
