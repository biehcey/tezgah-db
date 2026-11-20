import { describe, expect, it } from 'vitest';
import {
  SHORTCUTS,
  SHORTCUT_GROUPS,
  ariaKeyShortcuts,
  historyShortcut,
  navigatorShortcut,
  rowViewShortcut,
  scriptShortcut,
  shortcutText,
  shortcutsPageShortcut,
  tableShortcut,
  type KeyChord,
  type ShortcutId,
  type ShortcutKey,
} from './kisayollar';

const key = (k: Partial<ShortcutKey>): ShortcutKey => ({ key: 'Enter', code: 'Enter', ctrl: false, meta: false, shift: false, alt: false, altGraph: false, ...k });

describe('tableShortcut: Tablo sekmesi kısayolları', () => {
  it.each([
    ['Ctrl+Enter Uygula', key({ ctrl: true }), 'uygula'],
    ['Cmd+Enter Uygula', key({ meta: true }), 'uygula'],
    ['Ctrl+Shift+Enter Dene', key({ ctrl: true, shift: true }), 'dene'],
    ['Cmd+Alt+Enter SQL çekmecesi', key({ meta: true, alt: true }), 'sql'],
    ['Ctrl+Alt+Enter SQL çekmecesi', key({ ctrl: true, alt: true }), 'sql'],
    // Windows'ta Ctrl+Alt AltGraph olarak da gelebilir; Enter karakter yazmadığı için yine SQL.
    ['Ctrl+Alt+Enter AltGraph bildirse de SQL', key({ ctrl: true, alt: true, altGraph: true }), 'sql'],
    ['Ctrl+Alt+Shift+Enter tanımsız', key({ ctrl: true, alt: true, shift: true }), null],
    ['Enter tek başına grid’in', key({}), null],
    ['Shift+Enter düzenleyicinin', key({ shift: true }), null],
    ['başka tuş', key({ key: 'a', code: 'KeyA', ctrl: true }), null],
  ] as const)('%s', (_, k, expected) => {
    expect(tableShortcut(k)).toBe(expected);
  });
});

describe('scriptShortcut: Script editörü kısayolları', () => {
  it.each([
    ['Ctrl+Enter Çalıştır', key({ ctrl: true }), 'calistir'],
    ['Cmd+Enter Çalıştır', key({ meta: true }), 'calistir'],
    ['Ctrl+Shift+Enter Dene', key({ ctrl: true, shift: true }), 'dene'],
    ['Cmd+Shift+Enter Dene', key({ meta: true, shift: true }), 'dene'],
    ['Ctrl+Alt+Enter Tümünü çalıştır', key({ ctrl: true, alt: true }), 'tumunuCalistir'],
    ['Cmd+Alt+Enter Tümünü çalıştır', key({ meta: true, alt: true }), 'tumunuCalistir'],
    // Windows'ta Ctrl+Alt AltGraph olarak da gelebilir; Enter karakter yazmadığı için yine Alt'lı.
    ['Ctrl+Alt+Enter AltGraph bildirse de Tümünü çalıştır', key({ ctrl: true, alt: true, altGraph: true }), 'tumunuCalistir'],
    ['AltGraph tek başına Alt sayılır', key({ ctrl: true, altGraph: true }), 'tumunuCalistir'],
    ['Ctrl+Alt+Shift+Enter Tümünü dene', key({ ctrl: true, alt: true, shift: true }), 'tumunuDene'],
    ['Cmd+Alt+Shift+Enter Tümünü dene', key({ meta: true, alt: true, shift: true }), 'tumunuDene'],
    ['Alt+Enter Ctrl/Cmd’siz değil', key({ alt: true }), null],
    ['Enter tek başına editörün', key({}), null],
    ['Shift+Enter editörün', key({ shift: true }), null],
    ['başka tuş', key({ key: 'a', code: 'KeyA', ctrl: true }), null],
  ] as const)('%s', (_, k, expected) => {
    expect(scriptShortcut(k)).toBe(expected);
  });
});

describe('rowViewShortcut: grid’de satır görünümü', () => {
  it.each([
    ['Shift+Enter kapalıyken açar', key({ shift: true }), false, 'ac'],
    ['Shift+Enter açıkken kapatır', key({ shift: true }), true, 'kapat'],
    ['Esc açıkken kapatır', key({ key: 'Escape', code: 'Escape' }), true, 'kapat'],
    ['Esc kapalıyken bir şey yapmaz', key({ key: 'Escape', code: 'Escape' }), false, null],
    ['Enter tek başına değil', key({}), false, null],
    ['Ctrl+Shift+Enter Dene’nin', key({ ctrl: true, shift: true }), false, null],
    ['Cmd+Shift+Enter Dene’nin', key({ meta: true, shift: true }), true, null],
    ['Alt+Shift+Enter değil', key({ alt: true, shift: true }), false, null],
  ] as const)('%s', (_, k, open, expected) => {
    expect(rowViewShortcut(k, open)).toBe(expected);
  });
});

describe('navigatorShortcut: Ctrl/Cmd+B gezgin', () => {
  it.each([
    ['Ctrl+B', key({ key: 'b', code: 'KeyB', ctrl: true }), true],
    ['Cmd+B', key({ key: 'b', code: 'KeyB', meta: true }), true],
    ['büyük harf düzeninde de', key({ key: 'B', code: 'KeyB', ctrl: true }), true],
    ['Ctrl+Shift+B değil', key({ key: 'B', code: 'KeyB', ctrl: true, shift: true }), false],
    ['AltGr+B değil', key({ key: 'b', code: 'KeyB', ctrl: true, alt: true, altGraph: true }), false],
    ['B tek başına değil', key({ key: 'b', code: 'KeyB' }), false],
  ] as const)('%s', (_, k, expected) => {
    expect(navigatorShortcut(k)).toBe(expected);
  });
});

describe('shortcutText: katalogdaki kısayolun platformdaki yazılışı', () => {
  it.each([
    ['calistir', 'mac', '⌘↵'],
    ['calistir', 'diger', 'Ctrl+Enter'],
    ['tumunuDene', 'mac', '⌥⇧⌘↵'],
    ['tumunuDene', 'diger', 'Ctrl+Alt+Shift+Enter'],
    ['palet', 'mac', '⌘K'],
    ['palet', 'diger', 'Ctrl+K'],
    ['satirGorunumu', 'mac', '⇧↵'],
    ['satirGorunumu', 'diger', 'Shift+Enter'],
    ['tamamla', 'mac', '⌃Space'],
    ['tamamla', 'diger', 'Ctrl+Space'],
    ['kisayollar', 'mac', '?'],
    ['kisayollar', 'diger', '?'],
    ['sonrakiniBul', 'mac', 'F3 / ⌘G'],
    ['sonrakiniBul', 'diger', 'F3 / Ctrl+G'],
    ['paletKapat', 'diger', 'Esc'],
    ['paletGez', 'diger', '↑ / ↓'],
  ] as const)('%s, %s: %s', (id, platform, expected) => {
    expect(shortcutText(id, platform)).toBe(expected);
  });

  it.each([
    ['kopyala', 'mac', 'Meta+C'],
    ['kopyala', 'diger', 'Control+C'],
    ['tumunuDene', 'diger', 'Control+Alt+Shift+Enter'],
    ['tamamla', 'mac', 'Control+Space'],
    ['sonrakiniBul', 'mac', 'F3 Meta+G'],
  ] as const)('ariaKeyShortcuts %s, %s: %s', (id, platform, expected) => {
    expect(ariaKeyShortcuts(id, platform)).toBe(expected);
  });

  it('her kısayolun kimliği tek, açıklaması dolu ve grubu beş gruptan biri', () => {
    const ids = SHORTCUTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SHORTCUTS) {
      expect(s.aciklama).not.toBe('');
      expect(SHORTCUT_GROUPS).toContain(s.grup);
    }
    expect(SHORTCUT_GROUPS).toEqual(['Genel', 'Editör', 'Grid', 'Tablo sekmesi', 'Palet']);
  });
});

/** Katalogdaki tanımın iki platformdaki tuş olayı (Ctrl ve Cmd). */
function eventsOf(id: ShortcutId): ShortcutKey[] {
  const { tuslar } = SHORTCUTS.find((s) => s.id === id)!;
  return tuslar.flatMap((c: KeyChord): ShortcutKey[] => {
    const base = {
      key: c.key.length === 1 && !c.shift ? c.key.toLowerCase() : c.key,
      code: /^[A-Z]$/.test(c.key) ? `Key${c.key}` : c.key,
      shift: c.shift ?? false,
      alt: c.alt ?? false,
      altGraph: false,
    };
    return c.mod
      ? [{ ...base, ctrl: true, meta: false }, { ...base, ctrl: false, meta: true }]
      : [{ ...base, ctrl: c.ctrl ?? false, meta: false }];
  });
}

describe('eşleyiciler katalogla tutarlı', () => {
  it.each([
    ['calistir', (e: ShortcutKey) => scriptShortcut(e), 'calistir'],
    ['dene', (e: ShortcutKey) => scriptShortcut(e), 'dene'],
    ['tumunuCalistir', (e: ShortcutKey) => scriptShortcut(e), 'tumunuCalistir'],
    ['tumunuDene', (e: ShortcutKey) => scriptShortcut(e), 'tumunuDene'],
    ['uygula', (e: ShortcutKey) => tableShortcut(e), 'uygula'],
    ['tabloDene', (e: ShortcutKey) => tableShortcut(e), 'dene'],
    ['tabloSql', (e: ShortcutKey) => tableShortcut(e), 'sql'],
    ['satirGorunumu', (e: ShortcutKey) => rowViewShortcut(e, false), 'ac'],
    ['gezgin', (e: ShortcutKey) => navigatorShortcut(e), true],
    ['gecmis', (e: ShortcutKey) => historyShortcut(e), true],
    ['kisayollar', (e: ShortcutKey) => shortcutsPageShortcut(e), true],
  ] as const)('%s', (id, matcher, expected) => {
    const events = eventsOf(id);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(matcher(e)).toBe(expected);
  });
});

describe('historyShortcut: Ctrl/Cmd+Alt+E sorgu geçmişi', () => {
  it.each([
    ['Ctrl+Alt+E', key({ key: 'e', code: 'KeyE', ctrl: true, alt: true }), true],
    ['Cmd+Alt+E (Alt ile key değişir)', key({ key: '´', code: 'KeyE', meta: true, alt: true }), true],
    ['AltGr+E (€) yazmaya devam eder', key({ key: '€', code: 'KeyE', ctrl: true, alt: true, altGraph: true }), false],
    ['Ctrl+Alt+Shift+E değil', key({ key: 'E', code: 'KeyE', ctrl: true, alt: true, shift: true }), false],
    ['Ctrl+E değil', key({ key: 'e', code: 'KeyE', ctrl: true }), false],
  ] as const)('%s', (_, k, expected) => {
    expect(historyShortcut(k)).toBe(expected);
  });
});

describe('shortcutsPageShortcut: ? kısayol sayfası', () => {
  it.each([
    ['?', key({ key: '?', code: 'Slash', shift: true }), true],
    ['Shift’siz düzende ?', key({ key: '?', code: 'Minus' }), true],
    ['Ctrl+? değil', key({ key: '?', code: 'Slash', ctrl: true, shift: true }), false],
    ['AltGr ile yazılan ? da kısayol (karakter yazılmayan yerde)', key({ key: '?', code: 'Comma', ctrl: true, alt: true, altGraph: true }), true],
    ['/ değil', key({ key: '/', code: 'Slash' }), false],
  ] as const)('%s', (_, k, expected) => {
    expect(shortcutsPageShortcut(k)).toBe(expected);
  });
});
