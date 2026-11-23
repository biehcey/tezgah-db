import type { StatementStatus } from '../../core/script-calistirma';

/**
 * İfade durumunun editör kenar çubuğundaki metin işareti (CodeMirror gutter'ı DOM'u kendisi kurar;
 * kartlar aynı durumu `DurumIkonu` SVG'siyle gösterir).
 */
export const STATUS_SYMBOLS: Record<StatementStatus, string> = {
  basarili: '✓',
  hatali: '✗',
  calisiyor: '●',
  sirada: '○',
  calistirilmadi: '–',
};

/** Script analizinin işaretlediği ifade: Karışık script'teki transaction dışı ya da reddedilen. */
export type AnalysisMark = 'transactionDisi' | 'reddedilen';

/** Analiz işaretinin satır simgesi, açıklaması ve editördeki satır zemini sınıfı. */
export const ANALYSIS_MARKS: Record<AnalysisMark, { symbol: string; label: string; lineClass: string }> = {
  transactionDisi: { symbol: '⚠', label: 'transaction dışı', lineClass: 'cm-transaction-disi' },
  reddedilen: { symbol: '⛔', label: 'reddedildi', lineClass: 'cm-reddedilen' },
};

export const isAnalysisMark = (mark: StatementStatus | AnalysisMark): mark is AnalysisMark => mark in ANALYSIS_MARKS;

export const STATUS_LABELS: Record<StatementStatus, string> = {
  basarili: 'başarılı',
  hatali: 'hatalı',
  calisiyor: 'çalışıyor…',
  sirada: 'sırada',
  calistirilmadi: 'çalıştırılmadı',
};

/** prod yazma kilidi düğmesinin etiketi ve açıklaması; ikonu `KilitIkonu`. */
export const WRITE_LOCK_LABELS: Record<'salt-okunur' | 'yazma-acik', { etiket: string; eylem: string }> = {
  'salt-okunur': { etiket: 'Salt okunur', eylem: 'Yazma modunu aç' },
  'yazma-acik': { etiket: 'YAZMA AÇIK', eylem: 'Salt okunura dön' },
};
