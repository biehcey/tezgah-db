import { SONUC_ORANI_EN_AZ, SONUC_ORANI_EN_COK } from './arayuz-tercihleri';
import type { RunView, StatementView } from './script-calistirma';

/**
 * Sonuç alanı: konsol sekmesinde editörün altındaki tek sekme şeridi. Şeridin sekmeleri, hangi
 * sekmenin açılacağı ve daraltılmış alanın ne zaman kendiliğinden açılacağı buradan türetilir.
 */

export type SonucSekmesiAnahtari = 'log' | 'degisiklikler' | `sonuc-${number}`;

export interface SonucAlaniSekmesi {
  anahtar: SonucSekmesiAnahtari;
  etiket: string;
  /** Sonuç sekmesinin ifade indeksi. */
  i?: number;
}

const LOG: SonucAlaniSekmesi = { anahtar: 'log', etiket: 'Log' };
const DEGISIKLIKLER: SonucAlaniSekmesi = { anahtar: 'degisiklikler', etiket: 'Değişiklikler' };

/** Satır döndüren (kolonlu önizlemesi olan) ifadeler. */
function sonuclar(run: RunView | null): StatementView[] {
  return run?.ifadeler.filter((s) => s.onizleme && s.onizleme.kolonlar.length > 0) ?? [];
}

export const sonucAnahtari = (i: number): SonucSekmesiAnahtari => `sonuc-${i}`;

/** Şeritteki sekmeler sırasıyla: ifade başına Sonuç sekmeleri, Log, (Deneme'de) Değişiklikler. */
export function sonucSekmeleri(run: RunView | null): SonucAlaniSekmesi[] {
  const tabs: SonucAlaniSekmesi[] = sonuclar(run).map((s) => ({ anahtar: sonucAnahtari(s.i), etiket: `${s.komut} · satır ${s.satir}`, i: s.i }));
  tabs.push(LOG);
  if (run?.deneme) tabs.push(DEGISIKLIKLER);
  return tabs;
}

/**
 * Açılacak sekme: hata → Log; Deneme → Değişiklikler; satır döndüren son ifade → onun Sonuç
 * sekmesi; hiçbiri yoksa Log.
 */
export function acilisSekmesi(run: RunView): SonucSekmesiAnahtari {
  if (run.sonuc === 'hata' || run.sonuc === 'reddedildi' || run.ifadeler.some((s) => s.hata)) return 'log';
  if (run.deneme) return 'degisiklikler';
  const son = sonuclar(run).at(-1);
  return son ? sonucAnahtari(son.i) : 'log';
}

/** Şeridin seçimi; `elle`: kullanıcı bu çalıştırmada sekme seçti, bitişte zorla değiştirilmez. */
export interface SekmeSecimi {
  secili: SonucSekmesiAnahtari;
  elle: boolean;
}

export const baslangicSecimi = (run: RunView): SekmeSecimi => ({ secili: acilisSekmesi(run), elle: false });

export const kullaniciSecti = (_secim: SekmeSecimi, secili: SonucSekmesiAnahtari): SekmeSecimi => ({ secili, elle: true });

/** Çalışma bitti (karar, Okuma ya da sonuç): kullanıcı sekme seçmediyse açılış sekmesi açılır. */
export function calismaIlerledi(secim: SekmeSecimi, onceki: RunView | null, simdiki: RunView): SekmeSecimi {
  if (onceki?.evre !== 'calisiyor' || simdiki.evre === 'calisiyor' || secim.elle) return secim;
  return { secili: acilisSekmesi(simdiki), elle: false };
}

/** Görünen sekme: seçili sekme şeritte yoksa (ör. eski çalıştırmanın sonucu) Log. */
export function gosterilenSekme(secim: SekmeSecimi | null, run: RunView | null): SonucSekmesiAnahtari {
  return secim && sonucSekmeleri(run).some((t) => t.anahtar === secim.secili) ? secim.secili : 'log';
}

/**
 * Bölücünün değeri editörün piksel boyudur; tercih Sonuç alanının orandır. Oran
 * `SONUC_ORANI_EN_AZ..EN_COK` aralığında ve üç basamağa yuvarlanır.
 */
export function sonucOraniniBul(editor: number, toplam: number): number {
  const oran = Math.min(SONUC_ORANI_EN_COK, Math.max(SONUC_ORANI_EN_AZ, 1 - editor / toplam));
  return Math.round(oran * 1000) / 1000;
}

/** Oranın bölücüdeki karşılığı: editörün boyu ve sınırları, tam piksel. */
export function editorBoyu(oran: number, toplam: number): { deger: number; min: number; max: number } {
  const px = (sonucOrani: number) => Math.round((1 - sonucOrani) * toplam);
  return { deger: px(oran), min: px(SONUC_ORANI_EN_COK), max: px(SONUC_ORANI_EN_AZ) };
}

/** Daraltılmış Sonuç alanı yeni bir sonuç gelince ya da karar beklenmeye başlanınca açılır. */
export function kendiligindenAcilir(onceki: RunView | null, simdiki: RunView): boolean {
  if (simdiki.evre === 'karar' && onceki?.evre !== 'karar') return true;
  return onceki !== null && sonuclar(simdiki).length > sonuclar(onceki).length;
}
