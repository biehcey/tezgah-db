import { describe, expect, it } from 'vitest';
import { bolucuDegeri } from './bolucu';

describe('bolucuDegeri', () => {
  it.each([
    ['aralıktaki değer kalır', 300, 200, 512, 300],
    ['alt sınırın altı alt sınıra çekilir', 150, 200, 512, 200],
    ['üst sınırın üstü üst sınıra çekilir', 600, 200, 512, 512],
    ['tam sayıya yuvarlanır', 296.6, 200, 512, 297],
    ['üst sınır alt sınırdan darsa üst sınır kazanır', 280, 200, 150, 150],
  ])('%s', (_ad, deger, min, max, beklenen) => {
    expect(bolucuDegeri(deger, min, max)).toBe(beklenen);
  });
});
