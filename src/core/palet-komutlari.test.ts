import { describe, expect, it } from 'vitest';
import { paletteCommands, type PaletteCommandItem, type PaletteState } from './palet-komutlari';

const state = (s: Partial<PaletteState> = {}): PaletteState => ({
  sekme: 'konsol',
  hedef: true,
  prod: false,
  yazmaModu: false,
  calisma: null,
  tema: 'sistem',
  gezginAcik: true,
  sonucDaraltilmis: false,
  konsolGizli: false,
  ...s,
});

const find = (list: PaletteCommandItem[], id: PaletteCommandItem['id']) => list.find((c) => c.id === id)!;

describe('paletteCommands: Cmd/Ctrl+K komut listesi', () => {
  it('Sonuç alanı komutu duruma göre daraltır ya da açar; konsol sekmesi dışında pasif', () => {
    expect(find(paletteCommands(state()), 'sonucAlani')).toMatchObject({ etiket: 'Sonuç alanını daralt' });
    expect(find(paletteCommands(state({ sonucDaraltilmis: true })), 'sonucAlani').etiket).toBe('Sonuç alanını aç');
    expect(find(paletteCommands(state({ sekme: 'tablo' })), 'sonucAlani').pasif).toBe('konsol sekmesi değil');
    expect(find(paletteCommands(state({ calisma: 'Script çalışıyor' })), 'sonucAlani').pasif).toBeUndefined();
  });

  it('konsol komutları önce, kısayollarıyla', () => {
    const list = paletteCommands(state());
    expect(list.map((c) => [c.etiket, c.kisayol ?? null])).toEqual([
      ['Çalıştır', 'calistir'],
      ['Tümünü çalıştır', 'tumunuCalistir'],
      ['Dene', 'dene'],
      ['Tümünü dene', 'tumunuDene'],
      ['Yazma modunu aç', null],
      ['Yeni konsol', null],
      ['Sorgu geçmişi', 'gecmis'],
      ['Gezgini gizle', 'gezgin'],
      ['Sonuç alanını daralt', null],
      ['Tema: Sistem', null],
      ['Tema: Açık', null],
      ['Tema: Koyu', null],
      ['Kısayollar', 'kisayollar'],
      ['Yeni bağlantı', null],
      ['Yeni klasör', null],
      ['İçe aktar', null],
      ['Çalıştırma kayıtları klasörünü aç', null],
    ]);
    expect(list.filter((c) => c.pasif)).toEqual([find(list, 'yazmaModu')]);
  });

  it('hedefsiz sekmede çalıştırma komutları pasif ve notlu', () => {
    const list = paletteCommands(state({ hedef: false }));
    for (const id of ['calistir', 'tumunuCalistir', 'dene', 'tumunuDene'] as const) {
      expect(find(list, id).pasif).toBe('hedef seçilmedi');
    }
  });

  it('Tablo sekmesinde ve sekme yokken çalıştırma komutları pasif', () => {
    expect(find(paletteCommands(state({ sekme: 'tablo' })), 'calistir').pasif).toBe('konsol sekmesi değil');
    expect(find(paletteCommands(state({ sekme: null, hedef: false })), 'calistir').pasif).toBe('açık sekme yok');
  });

  it('çalışma sürerken (ya da karar beklenirken) çalıştırma ve yazma modu pasif, neden notta', () => {
    const list = paletteCommands(state({ prod: true, calisma: 'Script çalışıyor' }));
    expect(find(list, 'calistir').pasif).toBe('Script çalışıyor');
    expect(find(list, 'tumunuDene').pasif).toBe('Script çalışıyor');
    expect(find(list, 'yazmaModu').pasif).toBe('Script çalışıyor');
    expect(find(list, 'yeniKonsol').pasif).toBeUndefined();
  });

  it('prod olmayan hedefte Yazma modu pasif; prod hedefte etkin ve etiketi duruma göre', () => {
    expect(find(paletteCommands(state()), 'yazmaModu').pasif).toBe('yalnızca prod hedefte');
    const prodCommand = find(paletteCommands(state({ prod: true })), 'yazmaModu');
    expect(prodCommand.etiket).toBe('Yazma modunu aç');
    expect(prodCommand.pasif).toBeUndefined();
    expect(find(paletteCommands(state({ prod: true, yazmaModu: true })), 'yazmaModu').etiket).toBe('Yazma modunu kapat');
    expect(find(paletteCommands(state({ hedef: false })), 'yazmaModu').pasif).toBe('hedef seçilmedi');
  });

  it('bağlantı formu açıkken konsol komutları ve geçmiş pasif', () => {
    const list = paletteCommands(state({ konsolGizli: true }));
    expect(find(list, 'calistir').pasif).toBe('bağlantı formu açık');
    expect(find(list, 'gecmis').pasif).toBe('bağlantı formu açık');
  });

  it('gezgin kapalıyken "Gezgini göster"; etkin tema işaretli', () => {
    const list = paletteCommands(state({ gezginAcik: false, tema: 'koyu' }));
    expect(find(list, 'gezgin').etiket).toBe('Gezgini göster');
    expect(list.filter((c) => c.secili).map((c) => c.id)).toEqual(['tema:koyu']);
  });
});
