/**
 * Uygulama geneli kısayollar: tuş olayından eyleme. Ctrl ile Cmd eşdeğerdir. Windows'ta AltGr
 * Ctrl+Alt olarak gelir; AltGr ile yazılan karakterler kısayol sayılmaz.
 */

/** Tuş olayının kısayolu belirleyen alanları (`KeyboardEvent`'ten). */
export interface ShortcutKey {
  key: string;
  code: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  /** `getModifierState('AltGraph')`. */
  altGraph: boolean;
}

export type TableShortcut = 'uygula' | 'dene' | 'sql';

/**
 * Tablo sekmesi: Ctrl/Cmd+Enter Uygula, +Shift Dene, +Alt SQL çekmecesi; diğerleri `null`. Enter
 * karakter yazmaz; Windows'un Ctrl+Alt'a verdiği AltGraph de Alt sayılır.
 */
export function tableShortcut(e: ShortcutKey): TableShortcut | null {
  if (e.key !== 'Enter' || !(e.ctrl || e.meta)) return null;
  if (e.alt || e.altGraph) return e.shift ? null : 'sql';
  return e.shift ? 'dene' : 'uygula';
}

/** Ctrl/Cmd+B: kenar çubuğundaki gezgini gizler/açar. Alt ile `key` klavyeye göre değişir; `code` değişmez. */
export function navigatorShortcut(e: ShortcutKey): boolean {
  return (e.ctrl || e.meta) && !e.shift && !e.alt && !e.altGraph && e.code === 'KeyB';
}

/** DOM `KeyboardEvent`'inin kullanılan alanları (core DOM tiplerini görmez). */
interface DomKey {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  getModifierState: (key: string) => boolean;
}

/** DOM olayından `ShortcutKey`. */
export function shortcutKey(e: DomKey): ShortcutKey {
  return {
    key: e.key,
    code: e.code,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    shift: e.shiftKey,
    alt: e.altKey,
    altGraph: e.getModifierState('AltGraph'),
  };
}
