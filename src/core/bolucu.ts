/**
 * Bölücü (sürüklenebilir ayırıcı) değeri: tam sayıya yuvarlanır ve min..max aralığına çekilir.
 * Üst sınır alt sınırdan darsa (dar pencere) üst sınır kazanır: içerik pencereye sığar.
 */
export function bolucuDegeri(deger: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(deger)));
}
