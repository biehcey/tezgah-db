/**
 * Durum çubuğu: uygulamanın en altındaki tek satırın metinleri. Değerler etkin sekmenin
 * çalıştırma görünümünden (`RunView`) türetilir; zaman (kalan süre) dışarıdan verilir.
 */
import { formatRemaining } from './karar-suresi';
import type { SecimOzeti } from './grid/secim-ozeti';
import type { RunView } from './script-calistirma';

export type TransactionDurumuTuru = 'hazir' | 'calisiyor' | 'karar' | 'okuma' | 'bagliDegil';

export interface TransactionDurumu {
  tur: TransactionDurumuTuru;
  metin: string;
}

/**
 * `bagli`: etkin sekmenin hedefi var; `kalanMs`: yerel geri sayımın kalan Karar süresi (yoksa
 * metinde süre yazmaz).
 */
export function transactionDurumu(run: RunView | null, { bagli, kalanMs }: { bagli: boolean; kalanMs: number | null }): TransactionDurumu {
  const sure = kalanMs === null ? '' : ` · ${formatRemaining(kalanMs)}`;
  switch (run?.evre) {
    case 'calisiyor': {
      const biten = run.ifadeler.filter((s) => s.durum === 'basarili').length;
      return { tur: 'calisiyor', metin: `Çalışıyor ${biten}/${run.ifadeler.length}` };
    }
    case 'karar':
      return { tur: 'karar', metin: `Karar bekleniyor${sure}` };
    case 'okuma':
      return { tur: 'okuma', metin: `Okuma açık${sure}` };
    default:
      return bagli ? { tur: 'hazir', metin: 'Hazır' } : { tur: 'bagliDegil', metin: 'Bağlı değil' };
  }
}

export interface SonCalistirma {
  /** Biten ifadelerin süreleri toplamı. */
  ms: number;
  /** Son biten ifadenin satır sayısı (etkilenen ya da dönen); bilinmiyorsa yüklü satırlar. */
  satir: number | null;
  /** Sonucun devamı var: `satir` yüklenenlerdir. */
  devamVar?: true;
}

const SAYI = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** "13 ms · 7 satır"; devamı olan sonuçta "500+ satır". */
export function sonCalistirmaMetni({ ms, satir, devamVar }: SonCalistirma): string {
  return satir === null ? `${ms} ms` : `${ms} ms · ${satir}${devamVar ? '+' : ''} satır`;
}

/** Grid seçiminin metni; tek hücrelik seçimde (her grid'in varsayılanı) `null`. */
export function secimMetni({ hucre, sayisal }: SecimOzeti): string | null {
  if (hucre < 2) return null;
  if (!sayisal) return `${hucre} hücre`;
  return `${hucre} hücre · ${sayisal.adet} sayı · Toplam ${sayisal.toplam} · Ortalama ${sayisal.ortalama}`;
}

/** Tablo sekmesinin özeti: `pg_class.reltuples` tahmini (negatif: bilinmiyor) ve bekleyen değişiklikler. */
export function tabloMetni({ tahmin, bekleyen }: { tahmin: number | null; bekleyen: number }): string | null {
  const parcalar = [
    tahmin !== null && tahmin >= 0 && `≈${SAYI.format(Math.round(tahmin))} satır (tahmini)`,
    bekleyen > 0 && `${bekleyen} bekleyen değişiklik`,
  ].filter((p): p is string => typeof p === 'string');
  return parcalar.length > 0 ? parcalar.join(' · ') : null;
}

/** Son çalıştırmanın süresi ve son ifadesinin satır sayısı; hiçbir ifade bitmediyse `null`. */
export function sonCalistirma(run: RunView | null): SonCalistirma | null {
  const biten = run?.ifadeler.filter((s) => s.ms !== undefined) ?? [];
  const son = biten.at(-1);
  if (!son) return null;
  const ms = biten.reduce((t, s) => t + (s.ms ?? 0), 0);
  if (son.rowCount !== null && son.rowCount !== undefined) return { ms, satir: son.rowCount };
  if (!son.onizleme) return { ms, satir: null };
  return { ms, satir: son.onizleme.satirlar.length, ...(son.onizleme.dahaVar && { devamVar: true as const }) };
}
