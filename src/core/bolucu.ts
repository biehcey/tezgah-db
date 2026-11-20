/**
 * Sürüklenebilir bölücünün hesabı. Bölücünün değeri önündeki (dikeyde solundaki, yatayda
 * üstündeki) bölmenin piksel boyudur.
 */

export type BolucuYonu = 'dikey' | 'yatay';

/** Değeri tam piksele yuvarlar ve sınırlar; alan alt sınırdan darsa üst sınır kazanır. */
export function bolucuSinirla(deger: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, deger)));
}

/** Ok tuşunun değeri büyütüp (1) küçülttüğü (-1) yön; bu bölücünün tuşu değilse `null`. */
export function bolucuTusu(yon: BolucuYonu, tus: string): 1 | -1 | null {
  const tuslar: Record<string, 1 | -1> = yon === 'dikey' ? { ArrowRight: 1, ArrowLeft: -1 } : { ArrowDown: 1, ArrowUp: -1 };
  return tuslar[tus] ?? null;
}
