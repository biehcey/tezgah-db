/** Bir bağlantının sunucu oturumu (gezgin ağacındaki bağlantı ve veritabanı durumu). */
export type ConnectionSession =
  | { durum: 'baglaniyor' }
  | { durum: 'bagli'; veritabanlari: string[] }
  | { durum: 'hata'; hata: string };
