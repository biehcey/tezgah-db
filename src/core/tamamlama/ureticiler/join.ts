/**
 * JOIN önerileri (spec "JOIN önerisi"): `JOIN |` ilişki yuvasında, imleçten önceki katalog
 * ilişkilerinden birine FK ile bağlı her ilişki için (her FK ve her yönde ayrı) `yeni ON yeni.k =
 * taraf.r [AND …]`; `ON |` ifade yuvasında son JOIN'lenen ilişkiyle öncekiler arasındaki koşullar.
 */
import { iliskiAnahtari, type CatalogForeignKey, type CatalogForeignKeyEnd, type CatalogRelation } from '../../katalog';
import { adMetni, identSql } from '../adlar';
import { iliskiBul, katalogaBagli, varsayilanSemada } from '../dizin';
import { kapsamIliskileri } from '../kapsam';
import { ONCELIK } from '../oncelik';
import { kelime } from '../simge';
import type { Baglam, KapsamIliskisi, Oneri, Uretici } from '../tipler';

/** FK'nin bir ilişkiden görünüşü: `bu` ilişkinin ucu, `obur` öbür uç. */
interface FkYonu {
  fk: CatalogForeignKey;
  bu: CatalogForeignKeyEnd;
  obur: CatalogForeignKeyEnd;
}

/** İlişki başına iki yönlü FK dizini (katalog başına bir kez). */
const fkDizini = katalogaBagli((katalog) => {
  const dizin = new Map<string, FkYonu[]>();
  const ekle = (uc: CatalogForeignKeyEnd, yon: FkYonu) => {
    const k = iliskiAnahtari(uc.sema, uc.ad);
    const liste = dizin.get(k);
    if (liste) liste.push(yon);
    else dizin.set(k, [yon]);
  };
  for (const fk of katalog.fkler) {
    ekle(fk.kaynak, { fk, bu: fk.kaynak, obur: fk.hedef });
    // Kendine referans veren FK'de iki yön aynı ilişkide: ikisi de ayrı öneri.
    ekle(fk.hedef, { fk, bu: fk.hedef, obur: fk.kaynak });
  }
  return dizin;
});

/** Kapsamdaki ilişkinin sorguda anıldığı ad: takma ad, yoksa yazıldığı gibi (şemalıysa şemalı). */
const anilanAd = (r: KapsamIliskisi) => (r.takmaAd !== null ? identSql(r.takmaAd) : [...(r.sema !== null ? [r.sema] : []), r.ad].map((p) => identSql(p)).join('.'));

/** `yeni.k1 = taraf.r1 AND …`, FK kolon sırasıyla. */
const kosul = (yeni: string, yeniKolonlar: readonly string[], taraf: string, tarafKolonlar: readonly string[]) =>
  yeniKolonlar.map((k, i) => `${yeni}.${identSql(k)} = ${taraf}.${identSql(tarafKolonlar[i]!)}`).join(' AND ');

/** İmleçten önceki, katalogda bulunan (CTE / alt sorgu olmayan) kapsam ilişkileri, metin sırasıyla. */
function oncekiKatalogIliskileri(b: Baglam): { kapsam: KapsamIliskisi; katalog: CatalogRelation }[] {
  const kapsam = b.kapsamlar[0] ?? [];
  const onceki = kapsamIliskileri({ simgeler: b.onceki, from: -1, sorgu: true });
  return onceki.flatMap((o) => {
    const r = kapsam.find((k) => k.kaynak.tur === 'katalog' && k.sema === o.sema && k.ad === o.ad && k.takmaAd === o.takmaAd);
    const katalog = r && iliskiBul(b, r.sema, r.ad);
    return r && katalog ? [{ kapsam: r, katalog }] : [];
  });
}

function joinOnerileri(b: Baglam): Oneri[] {
  if (!b.katalog) return [];
  const dizin = fkDizini(b.katalog);
  return oncekiKatalogIliskileri(b).flatMap(({ kapsam, katalog }) => {
    const taraf = anilanAd(kapsam);
    return (dizin.get(iliskiAnahtari(katalog.sema, katalog.ad)) ?? []).flatMap(({ fk, bu, obur }) => {
      // Öbür uç görünür şemada olmalı.
      const yeni = iliskiBul(b, obur.sema, obur.ad);
      if (!yeni) return [];
      const parcalar = varsayilanSemada(b, yeni.sema) ? [yeni.ad] : [yeni.sema, yeni.ad];
      const ad = adMetni(b, parcalar);
      const yeniAnilan = parcalar.map((p) => identSql(p)).join('.');
      // Takma adsız aynı ilişki (kendine FK) koşulda ayırt edilemez.
      if (yeniAnilan === taraf) return [];
      const on = ` ON ${kosul(yeniAnilan, obur.kolonlar, taraf, bu.kolonlar)}`;
      return [{ etiket: ad.etiket + on, eklenecek: ad.eklenecek + on, tur: 'text' as const, detail: fk.ad, oncelik: ONCELIK.JOIN_FK }];
    });
  });
}

function onOnerileri(b: Baglam): Oneri[] {
  if (!b.katalog) return [];
  const iliskiler = oncekiKatalogIliskileri(b);
  const son = iliskiler.at(-1);
  if (!son) return [];
  const yeni = anilanAd(son.kapsam);
  const digerleri = iliskiler.slice(0, -1);
  return (fkDizini(b.katalog).get(iliskiAnahtari(son.katalog.sema, son.katalog.ad)) ?? []).flatMap(({ fk, bu, obur }) =>
    digerleri
      .filter((r) => r.katalog.sema === obur.sema && r.katalog.ad === obur.ad)
      .map((taraf): Oneri => {
        const metin = kosul(yeni, bu.kolonlar, anilanAd(taraf.kapsam), obur.kolonlar);
        return { etiket: metin, eklenecek: metin, tur: 'text', detail: fk.ad, oncelik: ONCELIK.JOIN_FK };
      }),
  );
}

const JOIN_TURU = new Set(['LEFT', 'RIGHT', 'FULL', 'INNER', 'OUTER', 'CROSS', 'NATURAL']);

/** `CROSS JOIN` ve `NATURAL … JOIN` ON almaz. */
function onAlir(onceki: Baglam['onceki']): boolean {
  for (let i = onceki.length - 2; i >= 0; i--) {
    const k = kelime(onceki[i]);
    if (k === null || !JOIN_TURU.has(k)) return true;
    if (k === 'CROSS' || k === 'NATURAL') return false;
  }
  return true;
}

export const join: Uretici = (b) => {
  if (b.niteleyici) return [];
  const son = kelime(b.onceki.at(-1));
  if (b.yuva.tur === 'iliski' && son === 'JOIN') return onAlir(b.onceki) ? joinOnerileri(b) : [];
  if (b.yuva.tur === 'ifade' && son === 'ON') return onOnerileri(b);
  return [];
};
