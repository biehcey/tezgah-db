/**
 * Büyük katalogda performans (ticket 07): dizinler katalog nesnesi başına bir kez kurulur ve
 * dizin kurulduktan sonra tek `tamamla` çağrısı süre bütçesinin altında kalır.
 */
import { describe, expect, it } from 'vitest';
import type { Catalog } from '../katalog';
import { tamamla } from './index';
import { BUYUK_GORUNUR, buyukKatalog, tablo } from './test/buyuk-katalog';
import { iliski, kolon } from './test/katalog';
import { etiketler } from './test/yardimci';

// core'un tsconfig'i Node / DOM tiplerini içermez; ölçüm saati test çalışırken globalde var.
declare const performance: { now(): number };

const cagir = (katalog: Catalog, isaretli: string) => {
  const imlec = isaretli.indexOf('|');
  return tamamla(isaretli.slice(0, imlec) + isaretli.slice(imlec + 1), imlec, katalog, { gorunurSemalar: BUYUK_GORUNUR });
};

const BUYUK_FROM = Array.from({ length: 12 }, (_, i) => `${tablo(i)} a${i}`).join(' JOIN ');

/** Temsilî yuvalar: her biri büyük bir aday listesi üretir. */
const YUVALAR: [string, string][] = [
  ['çok FROM ilişkili ifade', `SELECT a0.id, | FROM ${BUYUK_FROM}`],
  ['fonksiyon ağırlıklı ifade', 'SELECT * FROM t0001 WHERE |'],
  ['ilişki', 'SELECT * FROM |'],
  ['JOIN', 'SELECT * FROM t0001 JOIN |'],
  ['ON', 'SELECT * FROM t0001 JOIN s0007 ON |'],
  ['şema.', 'SELECT * FROM satis.|'],
  ['takma ad.', `SELECT a3.| FROM ${BUYUK_FROM}`],
];

/** Katalogun dizin kaynaklarını (ilişki, fonksiyon, FK listeleri) okuma sayısını sayan vekil. */
function sayacli(katalog: Catalog): { katalog: Catalog; okuma: () => number } {
  let okuma = 0;
  const izlenen = new Set<PropertyKey>(['iliskiler', 'fonksiyonlar', 'fkler']);
  const vekil = new Proxy(katalog, {
    get(hedef, ad, alici) {
      if (izlenen.has(ad)) okuma++;
      return Reflect.get(hedef, ad, alici) as unknown;
    },
  });
  return { katalog: vekil, okuma: () => okuma };
}

describe('dizin önbelleği', () => {
  it('aynı katalogla sonraki çağrılar dizinleri yeniden kurmaz', () => {
    const { katalog, okuma } = sayacli(buyukKatalog());
    for (const [, isaretli] of YUVALAR) cagir(katalog, isaretli);
    expect(okuma()).toBeGreaterThan(0);
    const ilk = okuma();
    for (const [, isaretli] of YUVALAR) cagir(katalog, isaretli);
    expect(okuma()).toBe(ilk);
  });

  it('yenilenen katalog (yeni nesne) yeni dizinle çözülür', () => {
    const eski = buyukKatalog();
    expect(etiketler(cagir(eski, 'SELECT * FROM yeni_t|'), 'type')).not.toContain('yeni_tablo');
    const yeni: Catalog = { ...eski, iliskiler: [...eski.iliskiler, iliski('public', 'yeni_tablo', [kolon('yeni_kolon')])] };
    expect(etiketler(cagir(yeni, 'SELECT * FROM yeni_t|'), 'type')).toContain('yeni_tablo');
    expect(etiketler(cagir(yeni, 'SELECT | FROM yeni_tablo'), 'property')).toEqual(['yeni_kolon']);
  });
});

describe('süre bütçesi', () => {
  // Bütçe 10 ms (geliştirici makinesinde yuvaların medyanı ~0,1–4 ms). Paralel test yükü altındaki
  // CI'da makine farkına karşı eşik cömert, ölçüm ısınmadan sonra tekrarların medyanı.
  const ESIK_MS = 30;
  const TEKRAR = 15;

  const katalog = buyukKatalog();
  it.each(YUVALAR)('%s', (_, isaretli) => {
    for (let i = 0; i < 3; i++) expect(cagir(katalog, isaretli)?.oneriler.length).toBeGreaterThan(0);
    const sureler = Array.from({ length: TEKRAR }, () => {
      const bas = performance.now();
      cagir(katalog, isaretli);
      return performance.now() - bas;
    }).sort((a, b) => a - b);
    expect(sureler[Math.floor(TEKRAR / 2)]).toBeLessThan(ESIK_MS);
  });
});
