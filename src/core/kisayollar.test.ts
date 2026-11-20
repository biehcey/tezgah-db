import { describe, expect, it } from 'vitest';
import { navigatorShortcut, rowViewShortcut, scriptShortcut, tableShortcut, type ShortcutKey } from './kisayollar';

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
