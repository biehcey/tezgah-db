/** Editörün `tamamla` sonucunu kullanma kuralları: popup kendiliğinden açılır mı, Tab'ın aralığı. */
import { describe, expect, it } from 'vitest';
import { popupAcilir, tabAraligi } from './index';

describe('popupAcilir', () => {
  it.each([
    ['Ctrl+Space, boşluktan sonra', 'SELECT ', 7, 7, true, true],
    ['yazarken, kelime içinde', 'SELECT na', 7, 9, false, true],
    ['yazarken, boşluktan sonra', 'SELECT ', 7, 7, false, false],
    ['yazarken, noktadan sonra', 'SELECT c.', 9, 9, false, true],
    ['yazarken, tırnakla başlanan ad', 'SELECT "', 7, 8, false, true],
  ])('%s', (_, metin, from, imlec, elle, beklenen) => {
    expect(popupAcilir(metin, { from }, imlec, elle)).toBe(beklenen);
  });
});

describe('tabAraligi', () => {
  it.each([
    ['imleç kelime ortasında: kelimenin sonuna kadar', { from: 7, to: 11 }, 9, { from: 7, to: 11 }],
    ['imleç kelime sonunda', { from: 7, to: 9 }, 9, { from: 7, to: 9 }],
    ['popup açıldıktan sonra yazıldı: imlece kadar', { from: 7, to: 9 }, 11, { from: 7, to: 11 }],
  ])('%s', (_, aralik, imlec, beklenen) => {
    expect(tabAraligi(aralik, imlec)).toEqual(beklenen);
  });
});
