import { describe, expect, it } from 'vitest';
import { navigatorShortcut, tableShortcut, type ShortcutKey } from './kisayollar';

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
