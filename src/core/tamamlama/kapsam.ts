/**
 * Bir sorgu düzeyinin ilişkileri: FROM / JOIN / UPDATE / INSERT INTO / DELETE FROM öğeleri,
 * imleçten bağımsız olarak düzeyin tamamından (`SELECT | FROM t` t'yi görür).
 *
 * Alt sorgu (`FROM (SELECT …) s`) ve CTE ilişkileri ticket 02'de buraya eklenir: `grup` simgesi
 * bugün atlanıyor (bkz. `oge`).
 */
import { RESERVED } from './adlar';
import { adDegeri, kelime, sembol } from './simge';
import type { Duzey, DuzeySimgesi, KapsamIliskisi } from './tipler';

/** Ardından ilişki listesi gelen kelimeler (öncekiyle birlikte). */
function iliskiListesiBaslar(simgeler: readonly DuzeySimgesi[], i: number): boolean {
  const k = kelime(simgeler[i]);
  if (k === 'FROM' || k === 'JOIN' || k === 'UPDATE') return true;
  return k === 'INTO' && kelime(simgeler[i - 1]) === 'INSERT';
}

/** Takma ad olamayan (bir sonraki yan cümleyi başlatan) çıplak kelimeler. */
const TAKMA_AD_OLAMAZ = new Set([...RESERVED, 'set', 'values', 'overriding', 'default']);

/** `i`'deki öğeyi (`ad[.ad] [AS] [takma]`) okur; sonraki indeksle. */
function oge(simgeler: readonly DuzeySimgesi[], i: number): { iliski: KapsamIliskisi | null; sonraki: number } {
  // ONLY / LATERAL gibi önekler atlanır.
  while (kelime(simgeler[i]) === 'ONLY' || kelime(simgeler[i]) === 'LATERAL') i++;
  const ilk = simgeler[i];
  const adMi = (s: DuzeySimgesi | undefined) =>
    s !== undefined && (s.tur === 'ad' || (s.tur === 'kelime' && !TAKMA_AD_OLAMAZ.has(s.deger.toLowerCase())));
  if (!ilk || !adMi(ilk)) return { iliski: null, sonraki: i };
  let sema: string | null = null;
  let ad = adDegeri(ilk)!;
  i++;
  if (sembol(simgeler[i], '.') && adMi(simgeler[i + 1])) {
    sema = ad;
    ad = adDegeri(simgeler[i + 1]!)!;
    i += 2;
  }
  // Ardından `(` gelen ad fonksiyon çağrısıdır (ticket 04: set-returning fonksiyon), ilişki değil.
  if (simgeler[i]?.tur === 'grup') return { iliski: null, sonraki: i + 1 };
  if (kelime(simgeler[i]) === 'AS') i++;
  let takmaAd: string | null = null;
  if (adMi(simgeler[i])) {
    takmaAd = adDegeri(simgeler[i]!)!;
    i++;
  }
  return { iliski: { sema, ad, takmaAd, kaynak: { tur: 'katalog' } }, sonraki: i };
}

/** Sorgu düzeyinin ilişkileri, metindeki sırayla. */
export function kapsamIliskileri(duzey: Duzey): KapsamIliskisi[] {
  const simgeler = duzey.simgeler;
  const iliskiler: KapsamIliskisi[] = [];
  for (let i = 0; i < simgeler.length; i++) {
    if (!iliskiListesiBaslar(simgeler, i)) continue;
    let j = i + 1;
    for (;;) {
      const { iliski, sonraki } = oge(simgeler, j);
      if (iliski) iliskiler.push(iliski);
      j = sonraki;
      // Virgülle ayrılmış FROM listesi.
      if (sembol(simgeler[j], ',') && kelime(simgeler[i]) === 'FROM') j++;
      else break;
    }
    i = j - 1;
  }
  return iliskiler;
}
