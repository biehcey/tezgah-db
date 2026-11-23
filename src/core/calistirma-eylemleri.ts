/**
 * Script ekranının çalıştırma eylemleri (Çalıştır, Dene, Tümünü çalıştır, Tümünü dene) şu an
 * çalışabilir mi, çalışamıyorsa neden. Kısayol, araç çubuğu düğmesi, "⋯" menüsü ve palet aynı
 * cevabı kullanır.
 */
import type { ScriptShortcut } from './kisayollar';

export interface BlockReason {
  satir: number | null;
  mesaj: string;
}

export interface RunActionsInput {
  /** Hedef seçili. */
  hedef: boolean;
  /** Çalışma sürüyor ya da karar bekleniyor. */
  mesgul: boolean;
  /** Script'te en az bir ifade var. */
  ifadeVar: boolean;
  /** Çalışacak aralık (seçim ya da imleçteki ifade) var. */
  aralikVar: boolean;
  /** Eylem başına `runBlockReasons` (aralık eylemlerinde satırlar editörün satırları). */
  engeller: Readonly<Record<ScriptShortcut, readonly BlockReason[]>>;
}

export interface RunActionState {
  kapali: boolean;
  /**
   * Kapalılığın script'ten gelen nedeni; hedef yokken ya da çalışma sürerken yok (onları çağıran
   * zaten gösterir: kilit, hedef başlığı, paletin kendi notu).
   */
  neden?: string;
  /** Düğmenin açıklaması: neden ya da eylem ve kısayolu. */
  ipucu: string;
}

export const NO_RANGE_MESSAGE = 'İmleçte çalışacak ifade yok';
export const EMPTY_SCRIPT_MESSAGE = 'Script boş';

const DESCRIPTIONS: Record<ScriptShortcut, string> = {
  calistir: 'Seçimi ya da imleçteki ifadeyi çalıştır',
  dene: 'Seçimi ya da imleçteki ifadeyi çalıştır ve her zaman geri al',
  tumunuCalistir: "Tüm script'i çalıştır",
  tumunuDene: "Tüm script'i çalıştır ve her zaman geri al",
};

export function formatReason({ satir, mesaj }: BlockReason): string {
  return satir === null ? mesaj : `Satır ${satir}: ${mesaj}`;
}

function reason(eylem: ScriptShortcut, s: RunActionsInput): string | undefined {
  const range = eylem === 'calistir' || eylem === 'dene';
  if (range && !s.aralikVar) return NO_RANGE_MESSAGE;
  if (!range && !s.ifadeVar) return EMPTY_SCRIPT_MESSAGE;
  const engeller = s.engeller[eylem];
  return engeller.length > 0 ? engeller.map(formatReason).join('\n') : undefined;
}

/** Dört eylemin durumu; `kisayolMetni` eylemin platformdaki kısayol yazısı. */
export function runActionStates(
  s: RunActionsInput,
  kisayolMetni: (eylem: ScriptShortcut) => string,
): Record<ScriptShortcut, RunActionState> {
  const state = (eylem: ScriptShortcut): RunActionState => {
    const neden = reason(eylem, s);
    return {
      kapali: !s.hedef || s.mesgul || neden !== undefined,
      neden,
      ipucu: neden ?? `${DESCRIPTIONS[eylem]} (${kisayolMetni(eylem)})`,
    };
  };
  return { calistir: state('calistir'), dene: state('dene'), tumunuCalistir: state('tumunuCalistir'), tumunuDene: state('tumunuDene') };
}
