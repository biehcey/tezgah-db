/** Tipler: tip yuvasında yaygın tipler ("+ Kolon" formuyla aynı liste), ardından kullanıcı tipleri. */
import { typeSuggestions } from '../../kolon-ekle';
import { ONCELIK } from '../oncelik';
import type { Uretici } from '../tipler';

export const tipler: Uretici = (b) => {
  if (b.yuva.tur !== 'tip' || b.niteleyici) return [];
  const kullanici = new Set(b.katalog?.kullaniciTipleri ?? []);
  return typeSuggestions([...kullanici]).map((tip) => ({
    etiket: tip,
    tur: 'type' as const,
    eklenecek: tip,
    oncelik: ONCELIK.TIP,
    ...(kullanici.has(tip) ? { detail: 'kullanıcı tipi' } : {}),
  }));
};
