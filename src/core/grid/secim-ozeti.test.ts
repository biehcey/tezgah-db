import { describe, expect, it } from 'vitest';
import { secimOzeti } from './secim-ozeti';

const INT4 = 23;
const INT8 = 20;
const NUMERIC = 1700;
const FLOAT8 = 701;
const MONEY = 790;
const TEXT = 25;

describe('seçim özeti', () => {
  it('sayısal olmayan seçimde yalnızca hücre sayısı', () => {
    expect(secimOzeti([['a', 'b'], ['c', null]], [TEXT, TEXT])).toEqual({ hucre: 4 });
  });

  it('tam sayıların toplamı ve ortalaması; NULL sayılmaz', () => {
    expect(secimOzeti([['1'], [null], ['2']], [INT4])).toEqual({ hucre: 3, sayisal: { adet: 2, toplam: '3', ortalama: '1.5' } });
  });

  it('büyük numeric ve int8 toplamı kesin', () => {
    const ozet = secimOzeti([['12345678901234567890.123456789'], ['0.000000001']], [NUMERIC]);
    expect(ozet.sayisal).toEqual({ adet: 2, toplam: '12345678901234567890.123456790', ortalama: '6172839450617283945.061728' });
    expect(secimOzeti([['9223372036854775807'], ['9223372036854775807']], [INT8]).sayisal?.toplam).toBe('18446744073709551614');
  });

  it('negatif değerler ve en çok 6 kesir basamaklı, yuvarlanmış ortalama', () => {
    expect(secimOzeti([['-1.5'], ['0.25']], [NUMERIC]).sayisal).toEqual({ adet: 2, toplam: '-1.25', ortalama: '-0.625' });
    expect(secimOzeti([['1'], ['1'], ['0']], [INT4]).sayisal?.ortalama).toBe('0.666667');
    expect(secimOzeti([['-1'], ['-1'], ['0']], [INT4]).sayisal?.ortalama).toBe('-0.666667');
  });

  it('float ve money Number ile toplanır; kayan nokta artığı görünmez', () => {
    expect(secimOzeti([['0.1'], ['0.2']], [FLOAT8]).sayisal).toEqual({ adet: 2, toplam: '0.3', ortalama: '0.15' });
    expect(secimOzeti([['$1,234.50'], ['-$0.50']], [MONEY]).sayisal).toEqual({ adet: 2, toplam: '1234', ortalama: '617' });
  });

  it('karışık tipler: yalnızca sayısal kolonlar toplanır; float varsa toplam Number', () => {
    expect(secimOzeti([['x', '2', '0.5']], [TEXT, INT4, FLOAT8])).toEqual({ hucre: 3, sayisal: { adet: 2, toplam: '2.5', ortalama: '1.25' } });
    expect(secimOzeti([['x', '2']], [TEXT, INT4]).sayisal).toEqual({ adet: 1, toplam: '2', ortalama: '2' });
  });

  it('sayı olmayan numeric (NaN, Infinity) ve tipi bilinmeyen kolon sayılmaz', () => {
    expect(secimOzeti([['NaN', '5'], ['3', '7']], [NUMERIC, undefined])).toEqual({ hucre: 4, sayisal: { adet: 1, toplam: '3', ortalama: '3' } });
    expect(secimOzeti([['Infinity']], [FLOAT8])).toEqual({ hucre: 1 });
  });
});
