import { describe, expect, it } from 'vitest';
import { applyEvent, startRunView, type RunView, type ServerEvent } from './script-calistirma';
import {
  acilisSekmesi,
  baslangicSecimi,
  calismaIlerledi,
  editorBoyu,
  gosterilenSekme,
  kendiligindenAcilir,
  kullaniciSecti,
  sonucOraniniBul,
  sonucSekmeleri,
} from './sonuc-alani';

const page = (deger: string) => ({ kolonlar: ['a'], tipler: [25], satirlar: [[deger]], dahaVar: false });

function view(script: string, events: ServerEvent[], deneme = false): RunView {
  return events.reduce(applyEvent, startRunView(script, { deneme }));
}

const SCRIPT = 'SELECT 1;\nINSERT INTO t VALUES (1);\nSELECT 2;\nUPDATE t SET a = 1';
const selectDone = (i: number, deger: string): ServerEvent => ({ type: 'done', i, rowCount: 1, ms: 1, komut: 'SELECT', onizleme: page(deger) });
const dmlDone = (i: number, komut: string): ServerEvent => ({ type: 'done', i, rowCount: 1, ms: 1, komut });
const bitti: ServerEvent = { type: 'bitti', sonuc: 'commit' };

describe('Sonuç alanı: sekme şeridi', () => {
  it('çalıştırma yokken yalnızca Log', () => {
    expect(sonucSekmeleri(null)).toEqual([{ anahtar: 'log', etiket: 'Log' }]);
  });

  it('satır döndüren her ifadeye bir Sonuç sekmesi, sonra Log; Değişiklikler yalnızca Deneme', () => {
    const events = [selectDone(0, 'a'), dmlDone(1, 'INSERT'), selectDone(2, 'b')];
    expect(sonucSekmeleri(view(SCRIPT, events))).toEqual([
      { anahtar: 'sonuc-0', etiket: 'SELECT · satır 1', i: 0 },
      { anahtar: 'sonuc-2', etiket: 'SELECT · satır 3', i: 2 },
      { anahtar: 'log', etiket: 'Log' },
    ]);
    expect(sonucSekmeleri(view(SCRIPT, events, true)).map((s) => s.anahtar)).toEqual(['sonuc-0', 'sonuc-2', 'log', 'degisiklikler']);
  });

  it('kolonsuz önizleme (ör. boş SELECT listesi) sekme açmaz', () => {
    const v = view('SELECT', [{ type: 'done', i: 0, rowCount: 0, ms: 1, komut: 'SELECT', onizleme: { kolonlar: [], satirlar: [] } }]);
    expect(sonucSekmeleri(v).map((s) => s.anahtar)).toEqual(['log']);
  });
});

describe('Sonuç alanı: açılış sekmesi', () => {
  it.each<[string, RunView, string]>([
    ['hata → Log', view(SCRIPT, [selectDone(0, 'a'), { type: 'error', i: 1, ms: 1, sqlstate: '23505', mesaj: 'x', satir: 1, sutun: 1, bas: 0, bit: 1 }, bitti]), 'log'],
    ['hatalı Deneme → Log', view(SCRIPT, [{ type: 'error', i: 0, ms: 1, sqlstate: null, mesaj: 'x', satir: 1, sutun: 1, bas: 0, bit: 1 }, { type: 'bitti', sonuc: 'deneme' }], true), 'log'],
    ['ifadesiz başarısızlık (ör. havuz dolu) → Log', view(SCRIPT, [{ type: 'bitti', sonuc: 'hata', mesaj: 'dolu' }]), 'log'],
    ['Deneme → Değişiklikler', view(SCRIPT, [selectDone(0, 'a'), { type: 'bitti', sonuc: 'deneme' }], true), 'degisiklikler'],
    ['satır döndüren son ifade → onun Sonuç sekmesi', view(SCRIPT, [selectDone(0, 'a'), dmlDone(1, 'INSERT'), selectDone(2, 'b'), dmlDone(3, 'UPDATE'), bitti]), 'sonuc-2'],
    ['hiç sonuç yok → Log', view('INSERT INTO t VALUES (1)', [dmlDone(0, 'INSERT'), bitti]), 'log'],
  ])('%s', (_ad, run, beklenen) => {
    expect(acilisSekmesi(run)).toBe(beklenen);
  });
});

describe('Sonuç alanı: seçili sekme', () => {
  const running = view(SCRIPT, [selectDone(0, 'a')]);
  const finished = applyEvent(running, bitti);

  it('çalıştırma başında açılış kuralı uygulanır (Deneme: Değişiklikler, aksi Log)', () => {
    expect(baslangicSecimi(startRunView(SCRIPT))).toEqual({ secili: 'log', elle: false });
    expect(baslangicSecimi(startRunView(SCRIPT, { deneme: true }))).toEqual({ secili: 'degisiklikler', elle: false });
  });

  it('çalışma bitince en anlamlı sekme açılır', () => {
    expect(calismaIlerledi({ secili: 'log', elle: false }, running, finished)).toEqual({ secili: 'sonuc-0', elle: false });
  });

  it('kullanıcı çalışma sürerken sekme değiştirdiyse bitişte dokunulmaz', () => {
    const secim = kullaniciSecti({ secili: 'log', elle: false }, 'log');
    expect(calismaIlerledi(secim, running, finished)).toBe(secim);
  });

  it('şeritte olmayan seçim (eski çalıştırmanın sonucu, çalıştırma yok) Log gösterir', () => {
    expect(gosterilenSekme({ secili: 'sonuc-0', elle: true }, running)).toBe('sonuc-0');
    expect(gosterilenSekme({ secili: 'sonuc-2', elle: true }, running)).toBe('log');
    expect(gosterilenSekme(null, null)).toBe('log');
  });

  it('karar beklenmeye geçmek de bitiştir; sonraki olaylar seçimi değiştirmez', () => {
    const karar = applyEvent(running, { type: 'kararBekleniyor', commitEdilebilir: true, kalanMs: 1000 });
    const secim = calismaIlerledi({ secili: 'log', elle: false }, running, karar);
    expect(secim).toEqual({ secili: 'sonuc-0', elle: false });
    const commit = applyEvent(karar, bitti);
    expect(calismaIlerledi({ secili: 'log', elle: false }, karar, commit)).toEqual({ secili: 'log', elle: false });
  });
});

describe('Sonuç alanı: editör/sonuç oranı', () => {
  it.each([
    // Bölücünün değeri editörün boyudur; oran Sonuç alanınındır.
    [600, 1000, 0.4],
    [445, 768, 0.421],
    [100, 1000, 0.85],
    [950, 1000, 0.15],
  ])('editör %d px, toplam %d px → oran %d', (editor, toplam, oran) => {
    expect(sonucOraniniBul(editor, toplam)).toBe(oran);
  });

  it('oranın editör boyu ve sınırları', () => {
    expect(editorBoyu(0.4, 1000)).toEqual({ deger: 600, min: 150, max: 850 });
  });
});

describe('Sonuç alanı: daraltılmışken kendiliğinden açılma', () => {
  const bos = startRunView(SCRIPT);
  const sonuclu = applyEvent(bos, selectDone(0, 'a'));
  it.each<[string, RunView | null, RunView, boolean]>([
    ['yeni sonuç geldi', bos, sonuclu, true],
    ['karar beklenmeye başlandı', sonuclu, applyEvent(sonuclu, { type: 'kararBekleniyor', commitEdilebilir: true, kalanMs: 1000 }), true],
    ['sonuçsuz ifade bitti', bos, applyEvent(bos, dmlDone(1, 'INSERT')), false],
    ['yeni çalıştırma başladı', sonuclu, startRunView(SCRIPT), false],
    ['karar sürerken süre uzatıldı', applyEvent(sonuclu, { type: 'kararBekleniyor', commitEdilebilir: true, kalanMs: 1000 }), applyEvent(applyEvent(sonuclu, { type: 'kararBekleniyor', commitEdilebilir: true, kalanMs: 1000 }), { type: 'uzatildi', kalanMs: 2000 }), false],
  ])('%s', (_ad, onceki, simdiki, beklenen) => {
    expect(kendiligindenAcilir(onceki, simdiki)).toBe(beklenen);
  });
});
