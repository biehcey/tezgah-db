import { describe, expect, it } from 'vitest';
import { copyFeedback, toCsv, toJson, toMarkdown } from './kopyalama';

const INT4 = 23;
const TEXT = 25;

describe('CSV olarak kopyalama', () => {
  it('başlık satırıyla; alanlar virgülle, satırlar CRLF ile ayrılır', () => {
    expect(
      toCsv({
        kolonlar: ['id', 'ad'],
        tipler: [INT4, TEXT],
        satirlar: [
          ['1', 'Ali'],
          ['2', 'Ayşe'],
        ],
      }),
    ).toBe('id,ad\r\n1,Ali\r\n2,Ayşe');
  });

  it('NULL boş alan, boş metin "" yazılır', () => {
    expect(toCsv({ kolonlar: ['a', 'b', 'c'], satirlar: [[null, '', 'x']] })).toBe('a,b,c\r\n,"",x');
  });

  it('virgül, çift tırnak ya da satır sonu içeren alan tırnaklanır, içteki tırnak ikilenir; başlık da', () => {
    expect(
      toCsv({
        kolonlar: ['a,b', 'c'],
        satirlar: [
          ['1,5', 'say "hi"'],
          ['x\ny', 'p\r\nq'],
        ],
      }),
    ).toBe('"a,b",c\r\n"1,5","say ""hi"""\r\n"x\ny","p\r\nq"');
  });

  it('satır yoksa yalnızca başlık', () => {
    expect(toCsv({ kolonlar: ['id'], satirlar: [] })).toBe('id');
  });
});

describe('Markdown olarak kopyalama', () => {
  it('başlık ve ayırıcı satırıyla; sayısal kolon `---:` ile sağa yaslı', () => {
    expect(
      toMarkdown({
        kolonlar: ['id', 'ad'],
        tipler: [INT4, TEXT],
        satirlar: [
          ['1', 'Ali'],
          ['2', 'Ayşe'],
        ],
      }),
    ).toBe(['| id | ad |', '| ---: | --- |', '| 1 | Ali |', '| 2 | Ayşe |'].join('\n'));
  });

  it('NULL `NULL` yazılır, boş metin boş hücredir', () => {
    expect(toMarkdown({ kolonlar: ['a', 'b'], satirlar: [[null, '']] })).toBe(['| a | b |', '| --- | --- |', '| NULL |  |'].join('\n'));
  });

  it('hücre ve başlıktaki `|` kaçışlanır, satır sonları `<br>` olur', () => {
    expect(toMarkdown({ kolonlar: ['a|b'], satirlar: [['x | y'], ['p\nq\r\nr']] })).toBe(['| a\\|b |', '| --- |', '| x \\| y |', '| p<br>q<br>r |'].join('\n'));
  });
});

describe('kopyalama geri bildirimi', () => {
  it('satır sayısı ve biçimle', () => {
    expect(copyFeedback(3, 'csv')).toBe('3 satır CSV olarak kopyalandı');
    expect(copyFeedback(1, 'baslikliTsv')).toBe('1 satır başlıklı TSV olarak kopyalandı');
    expect(copyFeedback(2, 'insert')).toBe('2 satır INSERT olarak kopyalandı');
  });
});

describe('JSON olarak kopyalama', () => {
  const BOOL = 16;
  const INT2 = 21;
  const INT8 = 20;
  const NUMERIC = 1700;
  const FLOAT4 = 700;
  const FLOAT8 = 701;
  const JSON_OID = 114;
  const JSONB = 3802;
  const parsed = (input: Parameters<typeof toJson>[0]) => JSON.parse(toJson(input)) as unknown;

  it('kolon adlarıyla nesne dizisi; NULL `null`, boş metin ""', () => {
    expect(
      parsed({
        kolonlar: ['ad', 'not'],
        tipler: [TEXT, TEXT],
        satirlar: [
          ['Ali', null],
          ['', 'x'],
        ],
      }),
    ).toEqual([
      { ad: 'Ali', not: null },
      { ad: '', not: 'x' },
    ]);
  });

  it('bool true/false; int2, int4, float4, float8 sayı; int8 ve numeric hassasiyet için metin', () => {
    const kolonlar = ['b', 'k', 'i', 'f4', 'f8', 'buyuk', 'tutar'];
    const tipler = [BOOL, INT2, INT4, FLOAT4, FLOAT8, INT8, NUMERIC];
    expect(
      parsed({
        kolonlar,
        tipler,
        satirlar: [
          ['t', '-3', '42', '1.5', '2.25', '9007199254740993', '0.10000000000000000001'],
          ['f', '0', '0', '0', '-1e+20', '1', '1'],
        ],
      }),
    ).toEqual([
      {
        b: true,
        k: -3,
        i: 42,
        f4: 1.5,
        f8: 2.25,
        buyuk: '9007199254740993',
        tutar: '0.10000000000000000001',
      },
      { b: false, k: 0, i: 0, f4: 0, f8: -1e20, buyuk: '1', tutar: '1' },
    ]);
  });

  it('JSON sayısı olmayan float (NaN, Infinity) metin kalır', () => {
    expect(
      parsed({
        kolonlar: ['f'],
        tipler: [FLOAT8],
        satirlar: [['NaN'], ['-Infinity']],
      }),
    ).toEqual([{ f: 'NaN' }, { f: '-Infinity' }]);
  });

  it('json ve jsonb değerleri iç içe JSON olur', () => {
    expect(
      parsed({
        kolonlar: ['j', 'jb'],
        tipler: [JSON_OID, JSONB],
        satirlar: [
          ['{"a": [1, "x"]}', '"metin"'],
          [null, 'null'],
        ],
      }),
    ).toEqual([
      { j: { a: [1, 'x'] }, jb: 'metin' },
      { j: null, jb: null },
    ]);
  });

  it('yinelenen kolon adları `ad`, `ad_2`, `ad_3` diye ayrışır; var olan `ad_2` ile çakışmaz', () => {
    expect(
      parsed({
        kolonlar: ['ad', 'ad', 'ad_2', 'ad'],
        satirlar: [['a', 'b', 'c', 'd']],
      }),
    ).toEqual([{ ad: 'a', ad_2: 'b', ad_2_2: 'c', ad_3: 'd' }]);
  });

  it('girintili yazılır; iç içe JSON da girintiye uyar; satır yoksa boş dizi', () => {
    expect(
      toJson({
        kolonlar: ['id', 'j'],
        tipler: [INT4, JSONB],
        satirlar: [['1', '{"a": 1}']],
      }),
    ).toBe('[\n  {\n    "id": 1,\n    "j": {\n      "a": 1\n    }\n  }\n]');
    expect(toJson({ kolonlar: ['id'], satirlar: [] })).toBe('[]');
  });

  it('anahtarlar kolon sırasını korur, sayı gibi görünen ad da', () => {
    expect(toJson({ kolonlar: ['b', '2', 'a'], satirlar: [['x', 'y', 'z']] })).toBe('[\n  {\n    "b": "x",\n    "2": "y",\n    "a": "z"\n  }\n]');
  });
});
