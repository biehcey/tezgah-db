/**
 * Ortam rozetinin yazı rengi: zemine göre WCAG kontrastı daha yüksek olan siyah ya da beyaz.
 * İkisinden biri her `#rrggbb` zeminde en az ~4.58:1 verir, yani 4.5:1 her zaman sağlanır.
 */

export type RozetYaziRengi = '#000000' | '#ffffff';

/** sRGB kanalını (0–255) doğrusal değere çevirir (WCAG 2.x). */
function dogrusal(kanal: number): number {
  const c = kanal / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** `#rrggbb` rengin WCAG göreli parlaklığı (0 siyah, 1 beyaz). */
function goreliParlaklik(renk: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => dogrusal(parseInt(renk.slice(i, i + 2), 16)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function rozetYaziRengi(zemin: string): RozetYaziRengi {
  const l = goreliParlaklik(zemin);
  const beyazla = 1.05 / (l + 0.05);
  const siyahla = (l + 0.05) / 0.05;
  return siyahla > beyazla ? '#000000' : '#ffffff';
}
