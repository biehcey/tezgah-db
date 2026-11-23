export interface Boyut {
  genislik: number;
  yukseklik: number;
}

/**
 * Sağ tık / ⋯ menüsünün sol üst köşesi: istenen noktada açılır, pencereden taşacaksa pencerenin
 * sağ/alt kenarına yaslanır; pencereden büyük menü sol/üst kenardan başlar.
 */
export function menuKonumu(nokta: { x: number; y: number }, menu: Boyut, pencere: Boyut): { left: number; top: number } {
  return {
    left: Math.max(0, Math.min(nokta.x, pencere.genislik - menu.genislik)),
    top: Math.max(0, Math.min(nokta.y, pencere.yukseklik - menu.yukseklik)),
  };
}
