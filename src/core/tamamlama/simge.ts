/** Düzey simgeleri üzerinde küçük yardımcılar (yuva kuralları ve kapsam okuyucuları için). */
import type { Token } from '../ifade-bolme';
import type { DuzeySimgesi } from './tipler';

/** Simge çözülmüş ad mı: çıplak kelime küçük harfe katlanır, tırnaklı ad olduğu gibi. */
export function adDegeri(s: DuzeySimgesi | Token): string | null {
  if (s.tur === 'kelime') return s.deger.toLowerCase();
  if (s.tur === 'ad') return s.deger;
  return null;
}

/** Çıplak kelime ise büyük harfle; değilse `null`. */
export const kelime = (s: DuzeySimgesi | undefined): string | null => (s?.tur === 'kelime' ? s.deger.toUpperCase() : null);

/** Verilen tek karakterlik sembol mü. */
export const sembol = (s: DuzeySimgesi | undefined, deger: string): boolean => s?.tur === 'sembol' && s.deger === deger;

/** `simgeler`'in `i`'den başlayan `ad` ya da `şema.ad`'ı ve ardından gelen indeks; yoksa `null`. */
export function adOku(simgeler: readonly DuzeySimgesi[], i: number): { sema: string | null; ad: string; son: number } | null {
  const ilk = simgeler[i] && adDegeri(simgeler[i]!);
  if (!ilk) return null;
  const ikinci = sembol(simgeler[i + 1], '.') && simgeler[i + 2] ? adDegeri(simgeler[i + 2]!) : null;
  return ikinci ? { sema: ilk, ad: ikinci, son: i + 3 } : { sema: null, ad: ilk, son: i + 1 };
}
