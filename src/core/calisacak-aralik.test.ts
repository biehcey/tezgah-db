import { describe, expect, it } from 'vitest';
import { calisacakAralik, editorSatiri, editoreTasi } from './calisacak-aralik';

describe('editoreTasi / editorSatiri: aralığın konumları editör metnine', () => {
  const EDITOR = 'SELECT 1;\n\nSELECT nope\n  FROM t;';
  const yer = { bas: EDITOR.indexOf('SELECT nope'), editorMetni: EDITOR };

  it('offset aralık başlangıcı kadar, satır aralığın editördeki satırı kadar kayar', () => {
    // `FROM` aralığın 2. satırının 3. sütunu, offset 14.
    expect(editoreTasi({ bas: 14, bit: 18, satir: 2, sutun: 3 }, yer)).toEqual({ bas: yer.bas + 14, bit: yer.bas + 18, satir: 4, sutun: 3 });
  });

  it('aralığın ilk satırındaki sütun aralığın başladığı sütun kadar kayar', () => {
    const metin = 'SELECT 1; SELECT x;';
    const ortada = { bas: metin.indexOf('SELECT x'), editorMetni: metin };
    expect(editoreTasi({ bas: 7, bit: 8, satir: 1, sutun: 8 }, ortada)).toEqual({ bas: 17, bit: 18, satir: 1, sutun: 18 });
  });

  it('aralığın satırı editör satırına çevrilir', () => {
    expect([1, 2].map((s) => editorSatiri(yer, s))).toEqual([3, 4]);
  });

  it('tüm script ofset 0’lı özel durumdur', () => {
    const tum = { bas: 0, editorMetni: EDITOR };
    expect(editoreTasi({ bas: 18, bit: 22, satir: 3, sutun: 8 }, tum)).toEqual({ bas: 18, bit: 22, satir: 3, sutun: 8 });
    expect(editorSatiri(tum, 3)).toBe(3);
  });
});

/**
 * `|` imleci, `[` `]` seçimi işaretler; sonuç aralığın metni (yoksa `null`).
 * Örn. `'select 1;|'` → imleç sonda; `'[select 1]; select 2;'` → seçim.
 */
function aralikMetni(isaretli: string): string | null {
  const secimBas = isaretli.indexOf('[');
  let metin: string;
  let secim: { from: number; to: number };
  let imlec: number;
  if (secimBas !== -1) {
    metin = isaretli.replace('[', '').replace(']', '');
    const secimBit = isaretli.indexOf(']') - 1;
    secim = { from: secimBas, to: secimBit };
    imlec = secimBit;
  } else {
    imlec = isaretli.indexOf('|');
    metin = isaretli.replace('|', '');
    secim = { from: imlec, to: imlec };
  }
  const aralik = calisacakAralik(metin, secim, imlec);
  return aralik && metin.slice(aralik.bas, aralik.bit);
}

describe('calisacakAralik: seçim yokken imlecin ifadesi', () => {
  it.each([
    ['ifadenin içinde', 'select 1;\nsel|ect 2;\nselect 3;', 'select 2;'],
    ['ifadenin başında', 'select 1;\n|select 2;', 'select 2;'],
    ['`;`ten hemen sonra', 'select 1;|\nselect 2;', 'select 1;'],
    ['`;`siz son ifadenin sonunda', 'select 1;\nselect 2|', 'select 2'],
    ['satır sonunda, `;`ten sonraki boşlukta', 'select 1;   |\nselect 2;', 'select 1;'],
    ['satır sonundaki yorumda', 'select 1; -- not|\nselect 2;', 'select 1;'],
    ['ifadeler arasındaki boş satırda önceki ifade', 'select 1;\n\n|\n\nselect 2;', 'select 1;'],
    ['ifadeler arasındaki yorum satırında önceki ifade', 'select 1;\n-- not|\nselect 2;', 'select 1;'],
    ['ifadenin içindeki yorumda', 'select 1\n-- not|\n, 2;', 'select 1\n-- not\n, 2;'],
    ['aynı satırda başlayan ifadenin önündeki boşlukta', 'select 1;\n  |  select 2;', 'select 2;'],
    ['çok satırlı ifadede', 'select 1;\nselect *\n  from t\n  wh|ere x;', 'select *\n  from t\n  where x;'],
    ['dolar tırnaklı gövdenin içinde', "do $$ begin; perform 1|; end $$;\nselect 2;", 'do $$ begin; perform 1; end $$;'],
    ['`;` öncesinde boşluk varsa da `;` dahil', 'select 1 ;|', 'select 1 ;'],
  ])('%s', (_, isaretli, beklenen) => {
    expect(aralikMetni(isaretli)).toBe(beklenen);
  });

  it.each([
    ['boş script', '|'],
    ['yalnızca boşluk', '  \n |\n'],
    ['yalnızca yorum', '-- yalnızca yorum|'],
    ['ilk ifadeden önceki satırda', '|\nselect 1;'],
  ])('%s: null', (_, isaretli) => {
    expect(aralikMetni(isaretli)).toBeNull();
  });
});

describe('calisacakAralik: seçim varken seçim', () => {
  it.each([
    ['ifadenin bir parçası', 'select [1 + 2] from t;', '1 + 2'],
    ['baştaki ve sondaki boşluk kırpılır', 'select 1;[\n  select 2;  \n]select 3;', 'select 2;'],
    ['çok ifadeli seçim', '[select 1;\nselect 2;]\nselect 3;', 'select 1;\nselect 2;'],
    ['dolar tırnaklı gövde bölünmez', "[do $$ begin; perform 1; end $$;]", 'do $$ begin; perform 1; end $$;'],
  ])('%s', (_, isaretli, beklenen) => {
    expect(aralikMetni(isaretli)).toBe(beklenen);
  });

  it.each([
    ['yalnızca boşluk', 'select 1;[   ]\nselect 2;'],
    ['yalnızca yorum', 'select 1;[ -- not ]\nselect 2;'],
  ])('%s: null', (_, isaretli) => {
    expect(aralikMetni(isaretli)).toBeNull();
  });

  it('ters yönlü seçim de aynı aralıktır', () => {
    expect(calisacakAralik('select 1; select 2;', { from: 19, to: 10 }, 10)).toEqual({ bas: 10, bit: 19 });
  });
});
