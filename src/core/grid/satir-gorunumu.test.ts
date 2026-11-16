import { describe, expect, it } from 'vitest';
import { DELETED_REASON, type EditableTable, type GridRow } from './bekleyen';
import { rowView, type RowViewInput } from './satir-gorunumu';

const TABLE: EditableTable = {
  sema: 'public',
  tablo: 'users',
  kolonlar: ['id', 'ad', 'notlar'],
  tipler: ['integer', 'text', 'text'],
  pk: ['id'],
  uretilmis: [],
};
const base = { kolonlar: TABLE.kolonlar, tipler: TABLE.tipler, pk: TABLE.pk, sira: 0, duzenleme: TABLE };
const gridRow = (degerler: GridRow['degerler'], durum: GridRow['durum'], degisen: number[] = [], anahtar = '["1"]'): GridRow => ({
  ref: { yuklu: degerler },
  anahtar,
  degerler,
  durum,
  degisen,
});

describe('rowView: satır görünümünün alanları', () => {
  it('yüklü satırda PK salt okunur; bekleyen değeri olan alan işaretli', () => {
    const view = rowView({ ...base, satir: gridRow(['1', 'Veli', null], null, [1]) });
    expect(view).toMatchObject({ anahtar: '["1"]', baslik: 'Satır 1', silinecek: false, neden: null });
    expect(view.alanlar).toEqual([
      { ad: 'id', tip: 'integer', pk: true, deger: '1', yerTutucu: null, degisti: false, saltOkunur: 'Birincil anahtar (PK) yüklü satırda düzenlenmez', yazilabilir: false },
      { ad: 'ad', tip: 'text', pk: false, deger: 'Veli', yerTutucu: null, degisti: true, saltOkunur: null, yazilabilir: true },
      { ad: 'notlar', tip: 'text', pk: false, deger: null, yerTutucu: 'NULL', degisti: false, saltOkunur: null, yazilabilir: true },
    ]);
  });

  it('eklenen satırda PK yazılır; dokunulmayan alan DEFAULT, NULL yapılan NULL', () => {
    const view = rowView({ ...base, sira: 4, satir: gridRow([null, null, 'x'], 'eklendi', [1, 2], 'yeni:1') });
    expect(view).toMatchObject({ anahtar: 'yeni:1', baslik: 'Yeni satır', neden: null });
    expect(view.alanlar.map((a) => [a.yerTutucu, a.degisti, a.yazilabilir])).toEqual([
      ['DEFAULT', false, true],
      ['NULL', true, true],
      [null, true, true],
    ]);
  });

  it.each<[string, Partial<RowViewInput>, string]>([
    ['silinecek satır', { satir: gridRow(['1', 'Ali', null], 'silinecek') }, DELETED_REASON],
    ['Uygula sürerken', { satir: gridRow(['1', 'Ali', null], null), mesgul: 'Bekleyen değişiklikler uygulanıyor' }, 'Bekleyen değişiklikler uygulanıyor'],
    ['PK’sız tablo (ham satır)', { satir: ['1', 'Ali', null], duzenleme: { kapali: 'Düzenleme kapalı: PK yok' }, pk: [] }, 'Düzenleme kapalı: PK yok'],
  ])('%s: satırın hiçbir alanı yazılmaz, nedeni satırda', (_, input, neden) => {
    const view = rowView({ ...base, ...input } as RowViewInput);
    expect(view.neden).toBe(neden);
    expect(view.alanlar.every((a) => !a.yazilabilir)).toBe(true);
  });

  it('üretilmiş kolon grid’deki nedenle salt okunur', () => {
    const view = rowView({ ...base, duzenleme: { ...TABLE, uretilmis: ['notlar'] }, satir: gridRow(['1', 'Ali', 'x'], null) });
    expect(view.alanlar[2]).toMatchObject({ saltOkunur: '“notlar” üretilmiş (generated) kolon: salt okunur', yazilabilir: false });
  });

  it('konsol sonucu: ham satır, sıra numarası kimlik ve başlık; yalnızca tam değer', () => {
    const view = rowView({ kolonlar: ['a'], tipler: [null], pk: [], sira: 2, duzenleme: { kapali: 'Konsol sonuçları salt okunur' }, satir: ['satır 1\nsatır 2'] });
    expect(view).toEqual({
      anahtar: '2',
      baslik: 'Satır 3',
      silinecek: false,
      neden: 'Konsol sonuçları salt okunur',
      alanlar: [{ ad: 'a', tip: null, pk: false, deger: 'satır 1\nsatır 2', yerTutucu: null, degisti: false, saltOkunur: null, yazilabilir: false }],
    });
  });
});
