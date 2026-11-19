/**
 * Tip ve DDL yuvaları (`yuvalar.ts`'deki `YUVA_KURALLARI`'nın başında).
 *
 * - `tipKurali`: her ifadede `::` ve `CAST(… AS` sonrası tip yuvası.
 * - `ddlKurali`: kökü DDL kelimesiyle başlayan ifadeyi sahiplenir. Tanınan küçük bir kümede
 *   ilişki, kolon ve tip yuvası verir; geri kalan her yerde `anahtar` (ilişki/kolon/fonksiyon
 *   önerilmez). DDL içindeki sorgu (`CREATE VIEW v AS SELECT …`, alt sorgu) olağan kurallara kalır.
 */
import { katalogIliskisi } from './kapsam';
import { adDegeri, adOku, kelime, sembol } from './simge';
import { ANAHTAR, ILISKI, TIP, type DuzeySimgesi, type KapsamIliskisi, type Yuva } from './tipler';
import type { YuvaGirdisi, YuvaKurali } from './yuvalar';

/** `x::|` (iki ayrı `:` simgesi) ve `CAST(x AS |`. */
export const tipKurali: YuvaKurali = ({ onceki, zincir }) => {
  if (sembol(onceki.at(-1), ':') && sembol(onceki.at(-2), ':')) return TIP;
  if (kelime(onceki.at(-1)) === 'AS' && kelime(zincir[1]?.onceki.at(-1)) === 'CAST') return TIP;
  return null;
};

/** Kökteki ilk kelimesi bunlardan biri olan ifade DDL sayılır. */
const DDL_BASLARI = new Set(['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'COMMENT', 'GRANT', 'REVOKE']);
/**
 * DDL içinde olağan kurallara bırakılan sorgu başları (`CREATE VIEW v AS SELECT`). `TABLE` yok:
 * DDL'de (`CREATE TABLE`) sorgu başlatmaz.
 */
const DDL_ICI_SORGU_BASLARI = new Set(['SELECT', 'WITH', 'VALUES']);
/** Ad listelerinde atlanan niteleyici kelimeler (`IF [NOT] EXISTS`, `ONLY`). */
const DOLGU = new Set(['IF', 'NOT', 'EXISTS', 'ONLY']);
/** `CREATE TABLE` grubunda kolon değil kısıt başlatan kelimeler. */
const TABLO_KISITLARI = new Set(['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'CHECK', 'FOREIGN', 'EXCLUDE', 'LIKE']);

/** Ad listesi (`DROP TABLE a, b`): `virgullu` ise virgülden sonra da yeni öğe beklenir. */
const ILISKI_LISTELERI: { bas: string[]; virgullu: boolean }[] = [
  { bas: ['DROP', 'MATERIALIZED', 'VIEW'], virgullu: true },
  { bas: ['DROP', 'TABLE'], virgullu: true },
  { bas: ['DROP', 'VIEW'], virgullu: true },
  { bas: ['TRUNCATE', 'TABLE'], virgullu: true },
  { bas: ['TRUNCATE'], virgullu: true },
  { bas: ['COMMENT', 'ON', 'TABLE'], virgullu: false },
];

const dolgusuz = (simgeler: readonly DuzeySimgesi[]) => simgeler.filter((s) => !DOLGU.has(kelime(s) ?? ''));

/** `simgeler` verilen kelimelerle mi başlıyor. */
const ileBaslar = (simgeler: readonly DuzeySimgesi[], kelimeler: readonly string[]) => kelimeler.every((k, i) => kelime(simgeler[i]) === k);

/** Son `,`'den sonraki simgeler (virgül yoksa tümü). */
const sonOge = (simgeler: readonly DuzeySimgesi[]) => simgeler.slice(simgeler.findLastIndex((s) => sembol(s, ',')) + 1);

/** `ALTER TABLE t` sonrasındaki alt komut (son virgülden sonrası). */
function alterTableAltKomutu(parca: readonly DuzeySimgesi[], iliski: KapsamIliskisi): Yuva {
  const k = parca.map((s) => kelime(s));
  if (k[1] === 'COLUMN' && (k[0] === 'DROP' || k[0] === 'RENAME' || k[0] === 'ALTER') && dolgusuz(parca.slice(2)).length === 0) {
    return { tur: 'kolon', iliski };
  }
  // `ADD COLUMN [IF NOT EXISTS] ad |`
  if (k[0] === 'ADD' && k[1] === 'COLUMN') {
    const geri = dolgusuz(parca.slice(2));
    if (geri.length === 1 && adDegeri(geri[0]!)) return TIP;
  }
  // `ALTER COLUMN ad [SET DATA] TYPE |`
  if (k[0] === 'ALTER' && k[1] === 'COLUMN' && adDegeri(parca[2]!) !== null) {
    const geri = k.slice(3).join(' ');
    if (geri === 'TYPE' || geri === 'SET DATA TYPE') return TIP;
  }
  return ANAHTAR;
}

/** Kök düzeydeki DDL ifadesinin yuvası. */
function kokYuvasi(onceki: readonly DuzeySimgesi[]): Yuva {
  for (const { bas, virgullu } of ILISKI_LISTELERI) {
    if (!ileBaslar(onceki, bas)) continue;
    const sonra = dolgusuz(onceki.slice(bas.length));
    return sonra.length === 0 || (virgullu && sembol(sonra.at(-1), ',')) ? ILISKI : ANAHTAR;
  }
  if (ileBaslar(onceki, ['ALTER', 'TABLE'])) {
    const sonra = dolgusuz(onceki.slice(2));
    if (sonra.length === 0) return ILISKI;
    const ad = adOku(sonra, 0);
    if (!ad) return ANAHTAR;
    const ust = sembol(sonra[ad.son], '*') ? ad.son + 1 : ad.son;
    return alterTableAltKomutu(sonOge(sonra.slice(ust)), katalogIliskisi(ad));
  }
  // `CREATE [UNIQUE] INDEX … ON |`
  const on = indeksHedefi(onceki);
  if (on !== null && dolgusuz(onceki.slice(on + 1)).length === 0) return ILISKI;
  return ANAHTAR;
}

/** `CREATE [UNIQUE] INDEX … ON`'daki `ON`'un indeksi; indeks tanımı değilse `null`. */
function indeksHedefi(onceki: readonly DuzeySimgesi[]): number | null {
  if (kelime(onceki[0]) !== 'CREATE') return null;
  const index = kelime(onceki[1]) === 'UNIQUE' ? 2 : 1;
  if (kelime(onceki[index]) !== 'INDEX') return null;
  const on = onceki.findIndex((s, i) => i > index && kelime(s) === 'ON');
  return on === -1 ? null : on;
}

/** Kökün hemen altındaki gruptaki DDL yuvası: `CREATE TABLE t (`, `CREATE INDEX … ON t (`. */
function grupYuvasi(icteki: readonly DuzeySimgesi[], kok: readonly DuzeySimgesi[]): Yuva {
  const oge = sonOge(icteki);
  // `CREATE [TEMP …] TABLE [IF NOT EXISTS] ad (`: kolon adından sonra tip.
  const table = kok.findIndex((s) => kelime(s) === 'TABLE');
  if (kelime(kok[0]) === 'CREATE' && table !== -1) {
    const sonra = dolgusuz(kok.slice(table + 1));
    const ad = adOku(sonra, 0);
    if (ad && ad.son === sonra.length && oge.length === 1 && adDegeri(oge[0]!) && !TABLO_KISITLARI.has(kelime(oge[0]) ?? '')) return TIP;
    return ANAHTAR;
  }
  // `CREATE INDEX … ON [ONLY] t [USING yöntem] (`: öğe başında kolon.
  const on = indeksHedefi(kok);
  if (on !== null) {
    const sonra = dolgusuz(kok.slice(on + 1));
    const ad = adOku(sonra, 0);
    const kalan = ad ? sonra.slice(ad.son).map((s) => kelime(s) ?? adDegeri(s)) : null;
    const yontemli = kalan !== null && (kalan.length === 0 || (kalan.length === 2 && kalan[0] === 'USING'));
    if (ad && yontemli && oge.length === 0) return { tur: 'kolon', iliski: katalogIliskisi(ad) };
  }
  return ANAHTAR;
}

export const ddlKurali: YuvaKurali = ({ zincir }: YuvaGirdisi) => {
  const kok = zincir.at(-1)!.onceki;
  if (!DDL_BASLARI.has(kelime(kok[0]) ?? '')) return null;
  // DDL içindeki sorgu olağan kurallara kalır.
  if (zincir.some((h) => h.duzey.sorgu && h !== zincir.at(-1))) return null;
  if (kok.some((s) => DDL_ICI_SORGU_BASLARI.has(kelime(s) ?? ''))) return null;
  if (zincir.length === 1) return kokYuvasi(kok);
  if (zincir.length === 2) return grupYuvasi(zincir[0]!.onceki, kok);
  return ANAHTAR;
};
