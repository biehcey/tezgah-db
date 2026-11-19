/**
 * Yuva tespiti: imleçte ne beklendiği. `YUVA_KURALLARI` sırayla denenir, `null` döndürmeyen ilk
 * kural kazanır; hiçbiri uymazsa yan cümle tablosuna (`YAN_CUMLELER`) bakılır.
 *
 * Yeni yuvalar kendi kuralını ekler: tip yuvası (`::`, `CAST(… AS`, kolon tanımı) ve DDL
 * yuvaları (ticket 05) `YUVA_KURALLARI`'nın başına, DDL ilişki yuvaları (`ALTER TABLE`, `DROP
 * TABLE`, `TRUNCATE`…) `YAN_CUMLELER`'e.
 */
import { adDegeri, kelime, sembol } from './simge';
import type { Baglam, DuzeySimgesi, KapsamIliskisi, Yuva, ZincirHalkasi } from './tipler';

/** Kuralların gördüğü bağlam (yuva henüz yok). */
export type YuvaGirdisi = Omit<Baglam, 'yuva'>;
export type YuvaKurali = (g: YuvaGirdisi) => Yuva | null;

/** `onceki`'nin sonundaki `ad` ya da `ad.ad`; yoksa `null`. */
function sondakiAd(onceki: readonly DuzeySimgesi[]): { sema: string | null; ad: string; bas: number } | null {
  const n = onceki.length;
  const son = onceki[n - 1];
  const ad = son && adDegeri(son);
  if (!ad) return null;
  const sema = sembol(onceki[n - 2], '.') && onceki[n - 3] ? adDegeri(onceki[n - 3]!) : null;
  return sema ? { sema, ad, bas: n - 3 } : { sema: null, ad, bas: n - 1 };
}

const katalogIliskisi = (sema: string | null, ad: string): KapsamIliskisi => ({ sema, ad, takmaAd: null, kaynak: { tur: 'katalog' } });

/** `INSERT INTO t (|`: grubun hemen önünde `INSERT INTO ad` varsa o ilişkinin kolonları. */
const insertKolonListesi: YuvaKurali = ({ zincir }) => {
  const [ic, ust] = zincir;
  if (!ic || !ust || ic.duzey.sorgu) return null;
  const hedef = sondakiAd(ust.onceki);
  if (!hedef || kelime(ust.onceki[hedef.bas - 1]) !== 'INTO' || kelime(ust.onceki[hedef.bas - 2]) !== 'INSERT') return null;
  return { tur: 'kolon', iliski: katalogIliskisi(hedef.sema, hedef.ad) };
};

/** `UPDATE t SET |` ve `SET a = 1, |`: atanan kolon, yani UPDATE'in ilişkisinin kolonları. */
const setSolTarafi: YuvaKurali = ({ onceki }) => {
  const set = onceki.findLastIndex((s) => kelime(s) === 'SET');
  if (set === -1 || onceki.slice(set + 1).some((s) => YAN_CUMLELER[kelime(s) ?? ''])) return null;
  const son = onceki.at(-1)!;
  if (son !== onceki[set] && !sembol(son, ',')) return null;
  const update = onceki.findLastIndex((s, i) => i < set && kelime(s) === 'UPDATE');
  if (update === -1) return null;
  // `UPDATE [ONLY] [şema.]ad [[AS] takma] SET`
  const ara = onceki.slice(update + 1, set).filter((s) => kelime(s) !== 'ONLY');
  const nitelikli = sembol(ara[1], '.') && ara[2] !== undefined;
  const ad = ara[nitelikli ? 2 : 0] && adDegeri(ara[nitelikli ? 2 : 0]!);
  if (!ad) return null;
  return { tur: 'kolon', iliski: katalogIliskisi(nitelikli ? adDegeri(ara[0]!) : null, ad) };
};

/** Önceki simgeler bir ilişki listesinde yeni öğe bekliyor mu (`FROM |`, `FROM a, |`). */
const yeniOge = (sonra: readonly DuzeySimgesi[], virgul: boolean) =>
  sonra.length === 0 || (virgul && sembol(sonra.at(-1), ','));

const ILISKI: Yuva = { tur: 'iliski' };
const IFADE: Yuva = { tur: 'ifade' };
const ANAHTAR: Yuva = { tur: 'anahtar' };

/**
 * Yan cümle başlatan kelime → yuva. `sonra`: kelimeden imlece kadarki simgeler (bu düzeyde),
 * `once`: kelimeden önceki simgeler.
 */
export const YAN_CUMLELER: Record<string, (sonra: readonly DuzeySimgesi[], once: readonly DuzeySimgesi[]) => Yuva> = {
  FROM: (sonra) => (yeniOge(sonra, true) ? ILISKI : ANAHTAR),
  JOIN: (sonra) => (yeniOge(sonra, false) ? ILISKI : ANAHTAR),
  UPDATE: (sonra) => (yeniOge(sonra, false) ? ILISKI : ANAHTAR),
  INTO: (sonra, once) => (kelime(once.at(-1)) === 'INSERT' && yeniOge(sonra, false) ? ILISKI : ANAHTAR),
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
export const YUVA_KURALLARI: YuvaKurali[] = [insertKolonListesi, setSolTarafi];

/** Halkada son yan cümle kelimesine göre yuva; yan cümle yoksa `null`. */
function yanCumle({ onceki }: ZincirHalkasi): Yuva | null {
  const i = onceki.findLastIndex((s) => YAN_CUMLELER[kelime(s) ?? ''] !== undefined);
  if (i === -1) return null;
  return YAN_CUMLELER[kelime(onceki[i])!]!(onceki.slice(i + 1), onceki.slice(0, i));
}

export function yuvaBul(g: YuvaGirdisi): Yuva {
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
