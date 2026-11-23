import { describe, expect, it } from 'vitest';
import { runActionStates, type RunActionsInput } from './calistirma-eylemleri';
import type { ScriptShortcut } from './kisayollar';

const NONE = { calistir: [], dene: [], tumunuCalistir: [], tumunuDene: [] };
const input = (s: Partial<RunActionsInput> = {}): RunActionsInput => ({
  hedef: true,
  mesgul: false,
  ifadeVar: true,
  aralikVar: true,
  engeller: NONE,
  ...s,
});
const shortcut = (id: ScriptShortcut) => `<${id}>`;

describe('runActionStates: çalıştırma eylemi açık mı, değilse neden', () => {
  it.each<[string, Partial<RunActionsInput>, ScriptShortcut, { kapali: boolean; neden?: string }]>([
    ['her şey hazır', {}, 'calistir', { kapali: false, neden: undefined }],
    ['hedef yok: kapalı, neden çağıranın (palet: hedef seçilmedi)', { hedef: false }, 'tumunuCalistir', { kapali: true, neden: undefined }],
    ['çalışma sürüyor', { mesgul: true }, 'dene', { kapali: true, neden: undefined }],
    ['imleçte ifade yok: aralık eylemleri', { aralikVar: false }, 'calistir', { kapali: true, neden: 'İmleçte çalışacak ifade yok' }],
    ['imleçte ifade yok: tüm script eylemleri etkilenmez', { aralikVar: false }, 'tumunuDene', { kapali: false, neden: undefined }],
    ['boş script: tüm script eylemleri', { ifadeVar: false, aralikVar: false }, 'tumunuCalistir', { kapali: true, neden: 'Script boş' }],
    [
      'engeller satırlarıyla',
      { engeller: { ...NONE, tumunuDene: [{ satir: 2, mesaj: 'A' }, { satir: null, mesaj: 'B' }] } },
      'tumunuDene',
      { kapali: true, neden: 'Satır 2: A\nB' },
    ],
    ['başka eylemin engeli bu eylemi kapatmaz', { engeller: { ...NONE, dene: [{ satir: null, mesaj: 'A' }] } }, 'calistir', { kapali: false, neden: undefined }],
  ])('%s', (_, s, eylem, expected) => {
    expect(runActionStates(input(s), shortcut)[eylem]).toMatchObject(expected);
  });

  it('ipucu: neden varsa neden, yoksa eylemin açıklaması ve kısayolu', () => {
    const states = runActionStates(input({ engeller: { ...NONE, dene: [{ satir: null, mesaj: 'A' }] } }), shortcut);
    expect(states.dene.ipucu).toBe('A');
    expect(states.calistir.ipucu).toBe('Seçimi ya da imleçteki ifadeyi çalıştır (<calistir>)');
    expect(states.tumunuCalistir.ipucu).toBe("Tüm script'i çalıştır (<tumunuCalistir>)");
    expect(states.tumunuDene.ipucu).toBe("Tüm script'i çalıştır ve her zaman geri al (<tumunuDene>)");
  });
});
