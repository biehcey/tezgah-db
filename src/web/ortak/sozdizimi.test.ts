import { PostgreSQL } from '@codemirror/lang-sql';
import { highlightCode } from '@lezer/highlight';
import { describe, expect, it } from 'vitest';
import { sqlVurguStili } from './sozdizimi';

/** Kod parçası → o parçanın aldığı `color` değeri (renksizse `undefined`). */
function renkler(code: string): Map<string, string | undefined> {
  const kurallar = sqlVurguStili.module?.getRules() ?? '';
  const renk = (sinif: string) =>
    sinif
      .split(' ')
      .map((s) => new RegExp(`\\.${s}\\s*\\{[^}]*color:\\s*([^;}]+)`).exec(kurallar)?.[1]?.trim())
      .find(Boolean);
  const sonuc = new Map<string, string | undefined>();
  const tree = PostgreSQL.language.parser.parse(code);
  highlightCode(
    code,
    tree,
    sqlVurguStili,
    (text, classes) => {
      if (text.trim()) sonuc.set(text, classes ? renk(classes) : undefined);
    },
    () => {},
  );
  return sonuc;
}

describe('SQL renklendirmesi', () => {
  it('anahtar kelime, dizge, sayı, yorum ve adlar sözdizimi token\'larından renk alır', () => {
    const r = renkler("SELECT ad, 42 FROM musteri WHERE durum = 'x' AND aktif IS NULL -- yorum");
    expect(r.get('SELECT')).toBe('var(--sozdizimi-anahtar)');
    expect(r.get('WHERE')).toBe('var(--sozdizimi-anahtar)');
    expect(r.get("'x'")).toBe('var(--sozdizimi-dizge)');
    expect(r.get('42')).toBe('var(--sozdizimi-sayi)');
    expect(r.get('-- yorum')).toBe('var(--sozdizimi-yorum)');
    expect(r.get('musteri')).toBe('var(--sozdizimi-ad)');
    expect(r.get('NULL')).toBe('var(--sozdizimi-sabit)');
  });

  it('tip adları ve tırnaklı adlar da token\'lı renk alır', () => {
    const r = renkler('SELECT "Kolon"::integer');
    expect(r.get('integer')).toBe('var(--sozdizimi-tip)');
    expect(r.get('"Kolon"')).toBe('var(--sozdizimi-ad)');
  });

  it('stildeki her renk bir CSS değişkenidir (tema değişince editör yeniden kurulmaz)', () => {
    const kurallar = sqlVurguStili.module?.getRules() ?? '';
    const degerler = [...kurallar.matchAll(/color:\s*([^;}]+)/g)].map((m) => m[1]!.trim());
    expect(degerler.length).toBeGreaterThan(0);
    for (const d of degerler) expect(d).toMatch(/^var\(--sozdizimi-[a-z]+\)$/);
  });
});
