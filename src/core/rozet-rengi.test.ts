import { describe, expect, it } from 'vitest';
import { DEFAULT_ENV_COLORS } from './baglanti.js';
import { rozetYaziRengi } from './rozet-rengi.js';

describe('rozetYaziRengi', () => {
  // Beklenenler WCAG kontrast oranlarından elle hesaplandı (beyaz / siyah).
  it.each([
    ['local', '#ffffff'], // 4.76 / 4.41
    ['dev', '#000000'], // 3.30 / 6.37
    ['test', '#000000'], // 3.68 / 5.71
    ['staging', '#000000'], // 3.19 / 6.58
    ['prod', '#ffffff'], // 4.83 / 4.35
  ] as const)('varsayılan %s rengi üstünde %s', (etiket, beklenen) => {
    expect(rozetYaziRengi(DEFAULT_ENV_COLORS[etiket])).toBe(beklenen);
  });

  it('beyaz zeminde siyah, siyah zeminde beyaz', () => {
    expect(rozetYaziRengi('#ffffff')).toBe('#000000');
    expect(rozetYaziRengi('#000000')).toBe('#ffffff');
  });

  it('orta grilerde eşiğin iki yanı', () => {
    expect(rozetYaziRengi('#757575')).toBe('#ffffff'); // 4.61 / 4.56
    expect(rozetYaziRengi('#767676')).toBe('#000000'); // 4.54 / 4.62
    expect(rozetYaziRengi('#808080')).toBe('#000000');
    expect(rozetYaziRengi('#595959')).toBe('#ffffff');
  });

  it('büyük harfli onaltılık kabul edilir', () => {
    expect(rozetYaziRengi('#FFFF00')).toBe('#000000');
    expect(rozetYaziRengi('#1E3A8A')).toBe('#ffffff');
  });
});
