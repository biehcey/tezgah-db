import { describe, expect, it } from 'vitest';
import { tasanEylemler } from './arac-cubugu';

const oge = (anahtar: string, genislik: number, birincil = false) => ({ anahtar, genislik, birincil });
const OGELER = [oge('mod', 80, true), oge('tumunuDene', 100), oge('dene', 70, true), oge('tumunuCalistir', 120), oge('calistir', 90, true)];

describe('araç çubuğu taşması', () => {
  it('hepsi sığıyorsa ya da genişlik ölçülemiyorsa hiçbiri taşmaz', () => {
    expect(tasanEylemler(OGELER, { genislik: 460, menu: 32, aralik: 0 })).toEqual([]);
    expect(tasanEylemler(OGELER, { genislik: 0, menu: 32, aralik: 0 })).toEqual([]);
  });

  it('sığmayınca ikincil eylemler baştan başlayarak menüye taşınır; menü düğmesi yer kaplar', () => {
    // 460 - 100 = 360, ama menü düğmesiyle 392 > 380.
    expect(tasanEylemler(OGELER, { genislik: 380, menu: 32, aralik: 0 })).toEqual(['tumunuDene', 'tumunuCalistir']);
    expect(tasanEylemler(OGELER, { genislik: 400, menu: 32, aralik: 0 })).toEqual(['tumunuDene']);
  });

  it('öğeler arası boşluk hesaba katılır; birincil eylemler hiç taşmaz', () => {
    expect(tasanEylemler(OGELER, { genislik: 460, menu: 32, aralik: 8 })).toEqual(['tumunuDene']);
    expect(tasanEylemler(OGELER, { genislik: 100, menu: 32, aralik: 8 })).toEqual(['tumunuDene', 'tumunuCalistir']);
  });
});
