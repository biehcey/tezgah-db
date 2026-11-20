/**
 * Arayüz tercihleri: gezgin görünürlüğü ve genişliği, editör/sonuç oranı, Sonuç alanının
 * daraltılmışlığı ve tema. Bağlantı ayarlarından (`tezgah.json`) ayrı dosyada saklanır.
 */

export type Tema = 'sistem' | 'acik' | 'koyu';

export const TEMALAR: readonly Tema[] = ['sistem', 'acik', 'koyu'];

export interface ArayuzTercihleri {
  surum: 1;
  gezgin: { acik: boolean; genislik: number };
  /** Konsol sekmesinde Sonuç alanının yüksekliğe oranı. */
  sonucOrani: number;
  sonucDaraltilmis: boolean;
  tema: Tema;
}

/** Normalleştirmenin sınırladığı pencere ölçüsü; bilinmiyorsa (sunucu) `Infinity`. */
export interface Pencere {
  genislik: number;
}

export const GEZGIN_EN_DAR = 200;
export const SONUC_ORANI_EN_AZ = 0.15;
export const SONUC_ORANI_EN_COK = 0.85;

export const ARAYUZ_TERCIHLERI_VARSAYILAN: Readonly<ArayuzTercihleri> = Object.freeze({
  surum: 1,
  gezgin: Object.freeze({ acik: true, genislik: 280 }),
  sonucOrani: 0.4,
  sonucDaraltilmis: false,
  tema: 'sistem',
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Ham değeri (dosyadan ya da istekten) şemaya oturtur: bilinmeyen alanlar atılır, eksik ya da
 * yanlış tipteki alanlar varsayılanla dolar, sayılar sınırlanır. Gezgin genişliği
 * 200..pencere/2'dir; pencere bu kadar darsa pencereye sığmak (pencere/2) alt sınırdan önce gelir.
 */
export function normalizeArayuzTercihleri(ham: unknown, pencere: Pencere): ArayuzTercihleri {
  const v = ARAYUZ_TERCIHLERI_VARSAYILAN;
  const t = isRecord(ham) ? ham : {};
  const gezgin = isRecord(t.gezgin) ? t.gezgin : {};
  const genislik = finite(gezgin.genislik) ? gezgin.genislik : v.gezgin.genislik;
  return {
    surum: 1,
    gezgin: {
      acik: typeof gezgin.acik === 'boolean' ? gezgin.acik : v.gezgin.acik,
      genislik: Math.round(Math.min(pencere.genislik / 2, Math.max(GEZGIN_EN_DAR, genislik))),
    },
    sonucOrani: clamp(finite(t.sonucOrani) ? t.sonucOrani : v.sonucOrani, SONUC_ORANI_EN_AZ, SONUC_ORANI_EN_COK),
    sonucDaraltilmis: typeof t.sonucDaraltilmis === 'boolean' ? t.sonucDaraltilmis : v.sonucDaraltilmis,
    tema: TEMALAR.includes(t.tema as Tema) ? (t.tema as Tema) : v.tema,
  };
}
