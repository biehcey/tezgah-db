/**
 * Araç çubuğu taşma kuralı: çubuk tek satırda kalır; genişlik yetmezse ikincil eylemler sırayla
 * (baştakinden başlayarak) "⋯" menüsüne taşınır. Birincil eylemler (Çalıştır, Dene, İptal) her
 * zaman görünür.
 */

export interface AracOgesi<A extends string = string> {
  anahtar: A;
  /** Öğenin doğal genişliği (px). */
  genislik: number;
  birincil: boolean;
}

/**
 * Menüye taşınan öğelerin anahtarları, çubuktaki sırayla. `genislik`: çubuğun kullanılabilir
 * genişliği (0: ölçülemedi, hiçbiri taşmaz); `menu`: "⋯" düğmesinin genişliği; `aralik`: öğeler
 * arası boşluk.
 */
export function tasanEylemler<A extends string>(
  ogeler: readonly AracOgesi<A>[],
  { genislik, menu, aralik }: { genislik: number; menu: number; aralik: number },
): A[] {
  if (genislik <= 0) return [];
  const toplam = (liste: readonly { genislik: number }[]) => liste.reduce((t, o) => t + o.genislik, 0) + aralik * Math.max(0, liste.length - 1);
  if (toplam(ogeler) <= genislik) return [];
  const tasan: A[] = [];
  for (const oge of ogeler) {
    if (oge.birincil) continue;
    tasan.push(oge.anahtar);
    const kalan = ogeler.filter((o) => !tasan.includes(o.anahtar));
    if (toplam([...kalan, { genislik: menu }]) <= genislik) break;
  }
  return tasan;
}
