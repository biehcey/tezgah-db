import { describe, expect, it } from 'vitest';
import css from './styles.css?raw';

interface Kural {
  secici: string;
  bildirimler: [ozellik: string, deger: string][];
}

/** Yorumları atıp en içteki `secici { ... }` bloklarını çıkarır (@media içindekiler dahil). */
function kurallar(metin: string): Kural[] {
  const temiz = metin.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...temiz.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    secici: m[1]!.trim().replace(/\s+/g, ' '),
    bildirimler: m[2]!
      .split(';')
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => {
        const i = b.indexOf(':');
        return [b.slice(0, i).trim(), b.slice(i + 1).trim()] as [string, string];
      }),
  }));
}

const KURALLAR = kurallar(css);
/** Token'ların tanımlandığı bloklar (`:root`, tema seçicileri). */
const tokenBloku = (k: Kural) => k.secici.startsWith(':root');
const TOKENLAR = new Map(KURALLAR.filter(tokenBloku).flatMap((k) => k.bildirimler.filter(([o]) => o.startsWith('--'))));
const KULLANIM = KURALLAR.filter((k) => !tokenBloku(k));

/** `ozellik`e uyan ve değeri `uygun` olmayan bildirimler, okunur biçimde. */
const ihlaller = (ozellik: RegExp, uygun: (deger: string) => boolean) =>
  KULLANIM.flatMap((k) =>
    k.bildirimler.filter(([o, d]) => ozellik.test(o) && !uygun(d)).map(([o, d]) => `${k.secici} { ${o}: ${d} }`),
  );

const tokenli = (deger: string, serbest: RegExp) =>
  deger.split(/\s+(?![^(]*\))/).every((parca) => /^var\(--[a-z0-9-]+\)$/.test(parca) || serbest.test(parca));

describe('stil dosyası token sözleşmesi', () => {
  it('stil dosyası okunur', () => {
    expect(KULLANIM.length).toBeGreaterThan(100);
  });

  it('yazı boyutu, köşe yarıçapı ve font ailesi yalnızca token\'dan gelir', () => {
    expect([
      ...ihlaller(/^font-size$/, (d) => tokenli(d, /^inherit$/)),
      ...ihlaller(/^border(-[a-z]+)*-radius$/, (d) => tokenli(d, /^0$/)),
      ...ihlaller(/^font-family$/, (d) => tokenli(d, /^inherit$/)),
    ]).toEqual([]);
  });

  it('boşluklar (padding, margin, gap) boşluk ölçeğinden gelir', () => {
    expect(
      ihlaller(/^(padding|margin|gap|row-gap|column-gap)(-[a-z]+)?$/, (d) => tokenli(d, /^(0|auto|\d+vh)$/)),
    ).toEqual([]);
  });

  it('yazı ölçeği 11 px\'ten küçük değer içermez', () => {
    const boyutlar = [...TOKENLAR].filter(([ad]) => ad.startsWith('--yazi-')).map(([, d]) => parseFloat(d));
    expect(boyutlar.length).toBeGreaterThan(0);
    expect(boyutlar.filter((b) => b < 11)).toEqual([]);
  });

  it('kullanılan her token tanımlıdır', () => {
    const kullanilan = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!));
    // Satır ve başlık yüksekliğini SonucGridi.tsx satır içi stil olarak verir.
    const disaridan = new Set(['--grid-satir', '--grid-baslik']);
    expect([...kullanilan].filter((ad) => !TOKENLAR.has(ad) && !disaridan.has(ad))).toEqual([]);
  });

  it('renkler yalnızca token tanımlarında literal yazılır', () => {
    const renkli = KULLANIM.flatMap((k) =>
      k.bildirimler.filter(([, d]) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(d)).map(([o, d]) => `${k.secici} { ${o}: ${d} }`),
    );
    expect(renkli).toEqual([]);
  });

  it('odak halkası global ve token\'lıdır; odak gizlenmez', () => {
    const halka = KULLANIM.find((k) => k.secici === ':focus-visible');
    expect(halka?.bildirimler).toContainEqual(['outline', '2px solid var(--odak-halkasi)']);
    // Filtre kutusunun editörü kendi çerçevesinin `:focus-within` halkasıyla belli olur.
    const istisna = new Set(['.filtre-editoru .cm-editor.cm-focused']);
    const gizleyen = KULLANIM.filter(
      (k) => !istisna.has(k.secici) && k.bildirimler.some(([o, d]) => o === 'outline' && /^(none|0)$/.test(d)),
    ).map((k) => k.secici);
    expect(gizleyen).toEqual([]);
  });

  it('koyu tema sistemden gelir, `data-theme` verilirse onu izler; prod rengi temadan bağımsızdır', () => {
    const secici = (s: string) => KURALLAR.filter((k) => k.secici === s);
    const koyuSistem = secici(":root:not([data-theme='acik'])");
    const koyuElle = secici(":root[data-theme='koyu']");
    expect(koyuSistem).toHaveLength(1);
    expect(koyuElle).toHaveLength(1);
    expect(koyuSistem[0]!.bildirimler).toEqual(koyuElle[0]!.bildirimler);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='acik'\]\)/);
    const prodTanimlari = KURALLAR.filter(tokenBloku).filter((k) => k.bildirimler.some(([o]) => o === '--env-prod'));
    expect(prodTanimlari.map((k) => k.secici)).toEqual([':root']);
  });

  it('Sorgu geçmişi çekmecesi akıştan çıkar (editörü daraltmaz); Durum çubuğu tek satırdır', () => {
    const kural = (secici: string) => new Map(KULLANIM.find((k) => k.secici === secici)?.bildirimler);
    expect(kural('.gecmis-cekmecesi').get('position')).toBe('absolute');
    expect(kural('.konsol-govde').get('position')).toBe('relative');
    expect(kural('.durum-cubugu').get('white-space')).toBe('nowrap');
    expect(kural('.script-cubugu').get('flex-wrap') ?? 'nowrap').toBe('nowrap');
  });
});
