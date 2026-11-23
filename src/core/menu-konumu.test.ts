import { describe, expect, it } from 'vitest';
import { menuKonumu } from './menu-konumu';

const PENCERE = { genislik: 900, yukseklik: 700 };
const MENU = { genislik: 240, yukseklik: 200 };

describe('menuKonumu', () => {
  it.each([
    ['sığıyorsa istenen nokta kalır', { x: 100, y: 100 }, { left: 100, top: 100 }],
    ['alttan taşarsa pencerenin altına yaslanır', { x: 100, y: 600 }, { left: 100, top: 500 }],
    ['sağdan taşarsa pencerenin sağına yaslanır', { x: 800, y: 100 }, { left: 660, top: 100 }],
    ['negatif nokta sıfıra çekilir', { x: -5, y: -5 }, { left: 0, top: 0 }],
  ])('%s', (_ad, nokta, beklenen) => {
    expect(menuKonumu(nokta, MENU, PENCERE)).toEqual(beklenen);
  });

  it('menü pencereden uzunsa üstten başlar (kaydırılarak görülür)', () => {
    expect(menuKonumu({ x: 100, y: 300 }, { genislik: 240, yukseklik: 900 }, PENCERE)).toEqual({ left: 100, top: 0 });
  });
});
