/**
 * Grid seçiminin Durum çubuğundaki özeti: hücre sayısı ve sayısal hücrelerin adedi, toplamı,
 * ortalaması. Tam sayılar ve `numeric` BigInt üzerinden ölçekli ondalıkla kesin toplanır; `float4/8`
 * ve `money` Number'dır. NULL ve sayı olmayan değerler (`NaN`, `Infinity`) sayılmaz.
 */

export interface SecimOzeti {
  hucre: number;
  /** Seçimde sayısal (NULL olmayan) hücre varsa. */
  sayisal?: { adet: number; toplam: string; ortalama: string };
}

/** int2, int4, int8, oid, numeric: kesin. */
const KESIN_OIDS: ReadonlySet<number> = new Set([21, 23, 20, 26, 1700]);
/** float4, float8, money: Number. */
const KAYAN_OIDS: ReadonlySet<number> = new Set([700, 701, 790]);

/** Ortalamanın en fazla kesir basamağı. */
const ORTALAMA_BASAMAK = 6;

const ONDALIK = /^([+-]?)(\d*)(?:\.(\d*))?$/;

/** Ölçekli ondalık: `deger / 10^olcek`. */
interface Ondalik {
  deger: bigint;
  olcek: number;
}

function ondalikOku(metin: string): Ondalik | null {
  const m = ONDALIK.exec(metin.trim());
  if (!m || (m[2] === '' && !m[3])) return null;
  const kesir = m[3] ?? '';
  const deger = BigInt(`${m[2] || '0'}${kesir}`);
  return { deger: m[1] === '-' ? -deger : deger, olcek: kesir.length };
}

const olcekle = (d: Ondalik, olcek: number): bigint => d.deger * 10n ** BigInt(olcek - d.olcek);

function ondalikYaz({ deger, olcek }: Ondalik): string {
  const isaret = deger < 0n ? '-' : '';
  const rakamlar = (deger < 0n ? -deger : deger).toString().padStart(olcek + 1, '0');
  if (olcek === 0) return `${isaret}${rakamlar}`;
  return `${isaret}${rakamlar.slice(0, -olcek)}.${rakamlar.slice(-olcek)}`;
}

/** `pay / payda`, sıfırdan uzağa yuvarlanmış, en fazla `ORTALAMA_BASAMAK` kesirle; sondaki sıfırlar atılır. */
function bolYaz(toplam: Ondalik, adet: number): string {
  let pay = toplam.deger;
  let payda = BigInt(adet);
  if (toplam.olcek <= ORTALAMA_BASAMAK) pay *= 10n ** BigInt(ORTALAMA_BASAMAK - toplam.olcek);
  else payda *= 10n ** BigInt(toplam.olcek - ORTALAMA_BASAMAK);
  const mutlak = pay < 0n ? -pay : pay;
  const bolum = (2n * mutlak + payda) / (2n * payda);
  return kirpSifir(ondalikYaz({ deger: pay < 0n ? -bolum : bolum, olcek: ORTALAMA_BASAMAK }));
}

const kirpSifir = (metin: string): string => (metin.includes('.') ? metin.replace(/\.?0+$/, '') : metin);

/** `money` metni yerel biçimlidir (`$1,234.50`, `-$0.50`); rakam, nokta ve eksi dışındakiler atılır. */
function kayanOku(metin: string, oid: number): number | null {
  const temiz = oid === 790 ? metin.replace(/[^\d.-]/g, '') : metin.trim();
  if (!ONDALIK.test(temiz) && !/^[+-]?\d*\.?\d+e[+-]?\d+$/i.test(temiz)) return null;
  const n = Number(temiz);
  return Number.isFinite(n) ? n : null;
}

/** Kayan nokta toplamının artığı (0.30000000000000004) görünmesin diye 15 anlamlı basamak. */
const kayanYaz = (n: number): string => String(Number(n.toPrecision(15)));

/**
 * `degerler`: seçili aralığın satırları; `tipler`: aralığın kolon OID'leri (bilinmiyorsa
 * `undefined`, o kolon sayısal sayılmaz).
 */
export function secimOzeti(degerler: readonly (readonly (string | null)[])[], tipler: readonly (number | undefined)[]): SecimOzeti {
  let hucre = 0;
  let adet = 0;
  let kesin: Ondalik = { deger: 0n, olcek: 0 };
  let kayan = 0;
  let kayanVar = false;
  for (const satir of degerler) {
    satir.forEach((deger, kolon) => {
      hucre++;
      const oid = tipler[kolon];
      if (deger === null || oid === undefined) return;
      if (KESIN_OIDS.has(oid)) {
        const d = ondalikOku(deger);
        if (!d) return;
        const olcek = Math.max(kesin.olcek, d.olcek);
        kesin = { deger: olcekle(kesin, olcek) + olcekle(d, olcek), olcek };
        adet++;
      } else if (KAYAN_OIDS.has(oid)) {
        const n = kayanOku(deger, oid);
        if (n === null) return;
        kayan += n;
        kayanVar = true;
        adet++;
      }
    });
  }
  if (adet === 0) return { hucre };
  if (!kayanVar) return { hucre, sayisal: { adet, toplam: ondalikYaz(kesin), ortalama: bolYaz(kesin, adet) } };
  const toplam = Number(ondalikYaz(kesin)) + kayan;
  return { hucre, sayisal: { adet, toplam: kayanYaz(toplam), ortalama: String(Number((toplam / adet).toFixed(ORTALAMA_BASAMAK))) } };
}
