import { describe, expect, it } from 'vitest';
import { applyEvent, startRunView, type RunView, type ServerEvent } from './script-calistirma';
import { secimMetni, sonCalistirma, sonCalistirmaMetni, tabloMetni, transactionDurumu } from './durum-cubugu';

const SCRIPT = 'SELECT 1;\nUPDATE t SET a = 1;\nSELECT 2';
const play = (events: ServerEvent[], deneme = false): RunView => events.reduce(applyEvent, startRunView(SCRIPT, { deneme }));
const page = { kolonlar: ['a'], tipler: [23], satirlar: [['1'], ['2']], dahaVar: false };

describe('Durum çubuğu: transaction durumu', () => {
  it('hedef yoksa Bağlı değil, çalıştırma yoksa ya da bittiyse Hazır', () => {
    expect(transactionDurumu(null, { bagli: false, kalanMs: null })).toEqual({ tur: 'bagliDegil', metin: 'Bağlı değil' });
    expect(transactionDurumu(null, { bagli: true, kalanMs: null })).toEqual({ tur: 'hazir', metin: 'Hazır' });
    expect(transactionDurumu(play([{ type: 'bitti', sonuc: 'commit' }]), { bagli: true, kalanMs: null })).toEqual({ tur: 'hazir', metin: 'Hazır' });
  });

  it('çalışırken biten ifade sayısı / toplam', () => {
    const run = play([{ type: 'started', i: 0 }, { type: 'done', i: 0, rowCount: 1, ms: 3, komut: 'SELECT' }, { type: 'started', i: 1 }]);
    expect(transactionDurumu(run, { bagli: true, kalanMs: null })).toEqual({ tur: 'calisiyor', metin: 'Çalışıyor 1/3' });
  });

  it('karar beklenirken ve Okuma açıkken kalan süre', () => {
    const karar = play([{ type: 'kararBekleniyor', commitEdilebilir: true, kalanMs: 300_000 }]);
    expect(transactionDurumu(karar, { bagli: true, kalanMs: 299_500 })).toEqual({ tur: 'karar', metin: 'Karar bekleniyor · 5:00' });
    expect(transactionDurumu(karar, { bagli: true, kalanMs: null })).toEqual({ tur: 'karar', metin: 'Karar bekleniyor' });
    const okuma = play([{ type: 'okumaAcik', kalanMs: 60_000 }]);
    expect(transactionDurumu(okuma, { bagli: true, kalanMs: 59_000 })).toEqual({ tur: 'okuma', metin: 'Okuma açık · 0:59' });
  });
});

describe('Durum çubuğu: son çalıştırma', () => {
  it('çalıştırma yoksa ya da hiçbir ifade bitmediyse yok', () => {
    expect(sonCalistirma(null)).toBeNull();
    expect(sonCalistirma(play([{ type: 'started', i: 0 }]))).toBeNull();
  });

  it('süre ifadelerin toplamı; satır sayısı son biten ifadeninki', () => {
    const run = play([
      { type: 'done', i: 0, rowCount: 2, ms: 3, komut: 'SELECT', onizleme: page },
      { type: 'done', i: 1, rowCount: 7, ms: 10, komut: 'UPDATE' },
    ]);
    expect(sonCalistirma(run)).toEqual({ ms: 13, satir: 7 });
  });

  it('satır sayısı bilinmeyen sonuçta yüklü satırlar', () => {
    const run = play([{ type: 'done', i: 0, rowCount: null, ms: 4, komut: 'SELECT', onizleme: page }]);
    expect(sonCalistirma(run)).toEqual({ ms: 4, satir: 2 });
  });
});

describe('Durum çubuğu: metinler', () => {
  it('son çalıştırma', () => {
    expect(sonCalistirmaMetni({ ms: 13, satir: 7 })).toBe('13 ms · 7 satır');
    expect(sonCalistirmaMetni({ ms: 4, satir: 500, devamVar: true })).toBe('4 ms · 500+ satır');
    expect(sonCalistirmaMetni({ ms: 2, satir: null })).toBe('2 ms');
  });

  it('seçim özeti; tek hücrede yok', () => {
    expect(secimMetni({ hucre: 1, sayisal: { adet: 1, toplam: '5', ortalama: '5' } })).toBeNull();
    expect(secimMetni({ hucre: 4 })).toBe('4 hücre');
    expect(secimMetni({ hucre: 6, sayisal: { adet: 2, toplam: '3', ortalama: '1.5' } })).toBe('6 hücre · 2 sayı · Toplam 3 · Ortalama 1.5');
  });

  it('Tablo sekmesi: tahmini satır ve bekleyen değişiklik', () => {
    expect(tabloMetni({ tahmin: 1234.4, bekleyen: 0 })).toBe('≈1.234 satır (tahmini)');
    expect(tabloMetni({ tahmin: null, bekleyen: 3 })).toBe('3 bekleyen değişiklik');
    expect(tabloMetni({ tahmin: -1, bekleyen: 1 })).toBe('1 bekleyen değişiklik');
    expect(tabloMetni({ tahmin: null, bekleyen: 0 })).toBeNull();
  });
});
