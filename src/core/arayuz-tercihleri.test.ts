import { describe, expect, it } from 'vitest';
import { ARAYUZ_TERCIHLERI_VARSAYILAN, gezginSinirlari, normalizeArayuzTercihleri } from './arayuz-tercihleri';

describe('gezginSinirlari', () => {
  it.each([
    [1600, { min: 200, max: 800 }],
    [1024, { min: 200, max: 512 }],
    [301, { min: 150, max: 150 }],
    [Infinity, { min: 200, max: Infinity }],
  ])('pencere %d px: %o', (genislik, beklenen) => {
    expect(gezginSinirlari({ genislik })).toEqual(beklenen);
  });
});

const PENCERE = { genislik: 1600 };

const VARSAYILAN = {
  surum: 1,
  gezgin: { acik: true, genislik: 280 },
  sonucOrani: 0.4,
  sonucDaraltilmis: false,
  tema: 'sistem',
};

describe('normalizeArayuzTercihleri', () => {
  it('varsayılanlar: gezgin açık ve 280 px, sonuç oranı 0.4, açık sonuç alanı, sistem teması', () => {
    expect(ARAYUZ_TERCIHLERI_VARSAYILAN).toEqual(VARSAYILAN);
  });

  it('geçerli tercihler olduğu gibi kalır', () => {
    const tercihler = { surum: 1, gezgin: { acik: false, genislik: 320 }, sonucOrani: 0.6, sonucDaraltilmis: true, tema: 'koyu' };
    expect(normalizeArayuzTercihleri(tercihler, PENCERE)).toEqual(tercihler);
  });

  it.each([
    ['null', null],
    ['dizi', [1, 2]],
    ['dizge', '{"tema":"koyu"}'],
    ['sayı', 42],
    ['undefined', undefined],
  ])('bozuk girdi (%s) varsayılan döner', (_ad, ham) => {
    expect(normalizeArayuzTercihleri(ham, PENCERE)).toEqual(VARSAYILAN);
  });

  it('eksik alanlar varsayılanla dolar', () => {
    expect(normalizeArayuzTercihleri({ tema: 'acik', gezgin: { acik: false } }, PENCERE)).toEqual({
      ...VARSAYILAN,
      tema: 'acik',
      gezgin: { acik: false, genislik: 280 },
    });
  });

  it('bilinmeyen alanlar ve yanlış tipteki değerler atılır', () => {
    const ham = {
      surum: 7,
      yabanci: 'x',
      gezgin: { acik: 'evet', genislik: '300', fazla: 1 },
      sonucOrani: Number.NaN,
      sonucDaraltilmis: 1,
      tema: 'mor',
    };
    expect(normalizeArayuzTercihleri(ham, PENCERE)).toEqual(VARSAYILAN);
  });

  it.each([
    ['alt sınırın altında', 50, 200],
    ['pencerenin yarısından geniş', 1200, 800],
    ['kesirli', 312.6, 313],
    ['sonsuz', Number.POSITIVE_INFINITY, 280],
  ])('gezgin genişliği %s: 200..pencere/2 aralığına sınırlanır', (_ad, genislik, beklenen) => {
    expect(normalizeArayuzTercihleri({ gezgin: { acik: true, genislik } }, PENCERE).gezgin.genislik).toBe(beklenen);
  });

  it('pencerenin yarısı 200 px\'ten darsa gezgin pencereye sığar', () => {
    expect(normalizeArayuzTercihleri({ gezgin: { acik: true, genislik: 280 } }, { genislik: 300 }).gezgin.genislik).toBe(150);
  });

  it('pencere genişliği bilinmiyorsa (sunucu) yalnızca alt sınır uygulanır', () => {
    const pencere = { genislik: Number.POSITIVE_INFINITY };
    expect(normalizeArayuzTercihleri({ gezgin: { acik: true, genislik: 5000 } }, pencere).gezgin.genislik).toBe(5000);
    expect(normalizeArayuzTercihleri({ gezgin: { acik: true, genislik: 10 } }, pencere).gezgin.genislik).toBe(200);
  });

  it.each([
    [0, 0.15],
    [0.1, 0.15],
    [0.5, 0.5],
    [0.9, 0.85],
    [3, 0.85],
  ])('sonuç oranı %s: 0.15..0.85 aralığına sınırlanır → %s', (sonucOrani, beklenen) => {
    expect(normalizeArayuzTercihleri({ sonucOrani }, PENCERE).sonucOrani).toBe(beklenen);
  });

  it.each(['sistem', 'acik', 'koyu'])('tema %s kabul edilir', (tema) => {
    expect(normalizeArayuzTercihleri({ tema }, PENCERE).tema).toBe(tema);
  });
});
