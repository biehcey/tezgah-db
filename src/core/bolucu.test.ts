import { describe, expect, it } from 'vitest';
import { bolucuSinirla, bolucuTusu } from './bolucu';

describe('Bölücü', () => {
  it.each([
    [250, 200, 600, 250],
    [150, 200, 600, 200],
    [700, 200, 600, 600],
    [250.6, 200, 600, 251],
    // Alan alt sınırdan darsa üst sınır kazanır.
    [250, 200, 150, 150],
  ])('%d, %d..%d aralığında %d olur', (deger, min, max, beklenen) => {
    expect(bolucuSinirla(deger, min, max)).toBe(beklenen);
  });

  it.each([
    ['dikey', 'ArrowRight', 1],
    ['dikey', 'ArrowLeft', -1],
    ['dikey', 'ArrowDown', null],
    ['yatay', 'ArrowDown', 1],
    ['yatay', 'ArrowUp', -1],
    ['yatay', 'ArrowRight', null],
    ['yatay', 'Enter', null],
  ] as const)('%s bölücüde %s yönü %s', (yon, tus, beklenen) => {
    expect(bolucuTusu(yon, tus)).toBe(beklenen);
  });
});
