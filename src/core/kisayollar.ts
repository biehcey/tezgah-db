/**
 * Uygulama geneli kısayollar: tuş olayından eyleme. Ctrl ile Cmd eşdeğerdir. Windows'ta AltGr
 * Ctrl+Alt olarak gelir; AltGr ile yazılan karakterler kısayol sayılmaz.
 *
 * Kısayol kataloğu (`SHORTCUTS`) tooltip'lerin, bağlam menülerinin, paletin ve kısayol sayfasının
 * tek kaynağıdır; görünen metin `shortcutText` ile platforma göre üretilir.
 */

export type Platform = 'mac' | 'diger';

/** Kısayol sayfasındaki gruplar, sırasıyla. */
export const SHORTCUT_GROUPS = ['Genel', 'Editör', 'Grid', 'Tablo sekmesi', 'Palet'] as const;
export type ShortcutGroup = (typeof SHORTCUT_GROUPS)[number];

/** Tek tuş vuruşu. `mod`: macOS'ta Cmd, diğerlerinde Ctrl; `ctrl`: her platformda Ctrl. */
export interface KeyChord {
  mod?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  /** `KeyboardEvent.key` (harfler büyük yazılır). */
  key: string;
}

export interface Shortcut {
  id: string;
  grup: ShortcutGroup;
  aciklama: string;
  /** Eşdeğer vuruşlar (ör. F3 ya da Cmd+G); metinde ` / ` ile ayrılır. */
  tuslar: readonly KeyChord[];
}

const chord = (key: string, mods: Omit<KeyChord, 'key'> = {}): KeyChord => ({ ...mods, key });
const MOD = { mod: true } as const;

export const SHORTCUTS = [
  { id: 'palet', grup: 'Genel', aciklama: 'Hızlı geçiş ve komutlar', tuslar: [chord('K', MOD)] },
  { id: 'gezgin', grup: 'Genel', aciklama: 'Gezgini göster/gizle', tuslar: [chord('B', MOD)] },
  { id: 'gecmis', grup: 'Genel', aciklama: 'Sorgu geçmişi', tuslar: [chord('E', { mod: true, alt: true })] },
  { id: 'kisayollar', grup: 'Genel', aciklama: 'Kısayollar', tuslar: [chord('?')] },

  { id: 'calistir', grup: 'Editör', aciklama: 'Seçimi ya da imleçteki ifadeyi çalıştır', tuslar: [chord('Enter', MOD)] },
  { id: 'dene', grup: 'Editör', aciklama: 'Seçimi ya da imleçteki ifadeyi dene (her zaman geri al)', tuslar: [chord('Enter', { mod: true, shift: true })] },
  { id: 'tumunuCalistir', grup: 'Editör', aciklama: "Tüm script'i çalıştır", tuslar: [chord('Enter', { mod: true, alt: true })] },
  { id: 'tumunuDene', grup: 'Editör', aciklama: "Tüm script'i dene (her zaman geri al)", tuslar: [chord('Enter', { mod: true, alt: true, shift: true })] },
  { id: 'bul', grup: 'Editör', aciklama: 'Ara / değiştir', tuslar: [chord('F', MOD)] },
  { id: 'sonrakiniBul', grup: 'Editör', aciklama: 'Sonraki eşleşme', tuslar: [chord('F3'), chord('G', MOD)] },
  { id: 'oncekiniBul', grup: 'Editör', aciklama: 'Önceki eşleşme', tuslar: [chord('F3', { shift: true }), chord('G', { mod: true, shift: true })] },
  { id: 'tamamla', grup: 'Editör', aciklama: 'Otomatik tamamlamayı aç', tuslar: [chord(' ', { ctrl: true })] },

  { id: 'satirGorunumu', grup: 'Grid', aciklama: 'Satır görünümünü aç/kapat', tuslar: [chord('Enter', { shift: true })] },
  { id: 'hucreDuzenle', grup: 'Grid', aciklama: 'Hücreyi düzenle (yazmaya başlamak ya da çift tık da açar)', tuslar: [chord('F2')] },
  { id: 'nullYap', grup: 'Grid', aciklama: 'NULL yap', tuslar: [chord('N', { mod: true, shift: true })] },
  { id: 'kopyala', grup: 'Grid', aciklama: 'TSV olarak kopyala', tuslar: [chord('C', MOD)] },
  { id: 'tumunuSec', grup: 'Grid', aciklama: 'Tümünü seç', tuslar: [chord('A', MOD)] },
  { id: 'yapistir', grup: 'Grid', aciklama: 'TSV yapıştır (düzenlenebilir grid)', tuslar: [chord('V', MOD)] },

  { id: 'uygula', grup: 'Tablo sekmesi', aciklama: 'Bekleyen değişiklikleri uygula', tuslar: [chord('Enter', MOD)] },
  { id: 'tabloDene', grup: 'Tablo sekmesi', aciklama: 'Bekleyen değişiklikleri dene', tuslar: [chord('Enter', { mod: true, shift: true })] },
  { id: 'tabloSql', grup: 'Tablo sekmesi', aciklama: 'Bekleyen listesi ve üretilen SQL', tuslar: [chord('Enter', { mod: true, alt: true })] },

  { id: 'paletGez', grup: 'Palet', aciklama: 'Sonuçlar arasında gez', tuslar: [chord('ArrowUp'), chord('ArrowDown')] },
  { id: 'paletSec', grup: 'Palet', aciklama: 'Seç (hedefte: hedef yap)', tuslar: [chord('Enter')] },
  { id: 'paletGoster', grup: 'Palet', aciklama: 'Listede göster', tuslar: [chord('Enter', { alt: true })] },
  { id: 'paletKapat', grup: 'Palet', aciklama: 'Kapat', tuslar: [chord('Escape')] },
] as const satisfies readonly Shortcut[];

export type ShortcutId = (typeof SHORTCUTS)[number]['id'];

const KEY_NAMES: Record<Platform, Record<string, string>> = {
  mac: { Enter: '↵', Escape: 'Esc', ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓' },
  diger: { Enter: 'Enter', Escape: 'Esc', ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓' },
};

/** Tek vuruşun yazılışı: macOS'ta `⌃⌥⇧⌘` sırasıyla bitişik, diğerlerinde `Ctrl+Alt+Shift+`. */
export function chordText(c: KeyChord, platform: Platform): string {
  const key = KEY_NAMES[platform][c.key] ?? c.key;
  if (platform === 'mac') {
    return `${c.ctrl ? '⌃' : ''}${c.alt ? '⌥' : ''}${c.shift ? '⇧' : ''}${c.mod ? '⌘' : ''}${key}`;
  }
  const mods = [c.mod || c.ctrl ? 'Ctrl' : null, c.alt ? 'Alt' : null, c.shift ? 'Shift' : null].filter(Boolean);
  return [...mods, key].join('+');
}

export function shortcutById(id: ShortcutId): Shortcut {
  return SHORTCUTS.find((s) => s.id === id)!;
}

/** `aria-keyshortcuts` değeri: `Control+Alt+Shift+Enter` biçiminde, eşdeğer vuruşlar boşlukla. */
export function ariaKeyShortcuts(id: ShortcutId, platform: Platform): string {
  return shortcutById(id)
    .tuslar.map((c) => {
      const mods = [c.ctrl || (c.mod && platform === 'diger') ? 'Control' : null, c.alt ? 'Alt' : null, c.shift ? 'Shift' : null];
      if (c.mod && platform === 'mac') mods.push('Meta');
      return [...mods.filter(Boolean), c.key === ' ' ? 'Space' : c.key].join('+');
    })
    .join(' ');
}

/** Katalogdaki kısayolun platformdaki metni; eşdeğer vuruşlar ` / ` ile. */
export function shortcutText(id: ShortcutId, platform: Platform): string {
  return shortcutById(id)
    .tuslar.map((c) => chordText(c, platform))
    .join(' / ');
}

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

export type ScriptShortcut = 'calistir' | 'dene' | 'tumunuCalistir' | 'tumunuDene';

/**
 * Script editörü: Ctrl/Cmd+Enter Çalışacak aralığı çalıştırır, +Shift dener; +Alt tüm script'i
 * çalıştırır, +Alt+Shift dener. Windows'un Ctrl+Alt'a verdiği AltGraph da Alt sayılır.
 */
export function scriptShortcut(e: ShortcutKey): ScriptShortcut | null {
  if (e.key !== 'Enter' || !(e.ctrl || e.meta)) return null;
  if (e.alt || e.altGraph) return e.shift ? 'tumunuDene' : 'tumunuCalistir';
  return e.shift ? 'dene' : 'calistir';
}

/**
 * Grid odaktayken satır görünümü: Shift+Enter açar/kapatır, açıkken Esc kapatır. Değiştiricili
 * Shift+Enter (Ctrl/Cmd: Dene) bu kısayol değildir. Düzenleyicinin Shift+Enter'ı (yeni satır) grid'e ulaşmaz.
 */
export function rowViewShortcut(e: ShortcutKey, open: boolean): 'ac' | 'kapat' | null {
  if (e.ctrl || e.meta || e.alt || e.altGraph) return null;
  if (e.key === 'Enter' && e.shift) return open ? 'kapat' : 'ac';
  if (e.key === 'Escape' && open) return 'kapat';
  return null;
}

/**
 * Grid'de Ctrl/Cmd+C başlıksız TSV kopyalar. Alt'lı vuruş kopyalamaz: Windows'ta AltGr Ctrl+Alt
 * gelir ve bazı düzenlerde AltGr+C bir karakter yazar. Shift'li vuruş da kopyalamaz: Chrome
 * Ctrl/Cmd+Shift+C'yi öğe incelemeye ayırır ve sayfaya iletmez; başlıklı TSV yalnızca menüdedir.
 */
export function gridCopyShortcut(e: ShortcutKey): 'tsv' | null {
  if (!(e.ctrl || e.meta) || e.alt || e.altGraph || e.shift || e.key.toLowerCase() !== 'c') return null;
  return 'tsv';
}

/** Ctrl/Cmd+B: kenar çubuğundaki gezgini gizler/açar. Alt ile `key` klavyeye göre değişir; `code` değişmez. */
export function navigatorShortcut(e: ShortcutKey): boolean {
  return (e.ctrl || e.meta) && !e.shift && !e.alt && !e.altGraph && e.code === 'KeyB';
}

/**
 * Ctrl/Cmd+Alt+E: sorgu geçmişi. Alt ile `key` klavyeye göre değişir, `code` değişmez. Windows'ta
 * AltGr de Ctrl+Alt gelir: AltGr+E (€) yazmaya devam etmeli.
 */
export function historyShortcut(e: ShortcutKey): boolean {
  return (e.ctrl || e.meta) && e.alt && !e.shift && !e.altGraph && e.code === 'KeyE';
}

/**
 * `?`: kısayol sayfası. Karakter olarak bakılır (düzene göre Shift'li ya da AltGr'li yazılır);
 * Ctrl/Cmd/Alt'lı vuruş değildir. Odağın metin alanında olmaması çağıranın işidir.
 */
export function shortcutsPageShortcut(e: ShortcutKey): boolean {
  if (e.key !== '?') return false;
  return e.altGraph || !(e.ctrl || e.meta || e.alt);
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
