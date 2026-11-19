import { describe, expect, it } from 'vitest';
import { buildCatalog } from './katalog';

const fkSatiri = (ad: string, kaynak: string, hedef: string, kaynakKolon: string, hedefKolon: string, sira: string) => {
  const [kaynakSema, kaynakAd] = kaynak.split('.');
  const [hedefSema, hedefAd] = hedef.split('.');
  return {
    ad,
    kaynak_sema: kaynakSema!,
    kaynak_ad: kaynakAd!,
    hedef_sema: hedefSema!,
    hedef_ad: hedefAd!,
    kaynak_kolon: kaynakKolon,
    hedef_kolon: hedefKolon,
    sira,
  };
};

describe('buildCatalog: FK satırları', () => {
  it('kolon satırları FK başına toplanır, kolonlar FK sırasıyla eşleşik dizilir', () => {
    const katalog = buildCatalog({
      semalar: ['public'],
      defaultSchema: 'public',
      iliskiler: [],
      tipler: [],
      fkler: [
        fkSatiri('kalem_siparis_fk', 'public.kalem', 'public.siparis', 'siparis_yil', 'yil', '2'),
        fkSatiri('kalem_siparis_fk', 'public.kalem', 'public.siparis', 'siparis_no', 'no', '1'),
        fkSatiri('orders_customer_fk', 'public.orders', 'public.customers', 'customer_id', 'id', '1'),
      ],
    });
    expect(katalog.fkler).toEqual([
      {
        ad: 'kalem_siparis_fk',
        kaynak: { sema: 'public', ad: 'kalem', kolonlar: ['siparis_no', 'siparis_yil'] },
        hedef: { sema: 'public', ad: 'siparis', kolonlar: ['no', 'yil'] },
      },
      {
        ad: 'orders_customer_fk',
        kaynak: { sema: 'public', ad: 'orders', kolonlar: ['customer_id'] },
        hedef: { sema: 'public', ad: 'customers', kolonlar: ['id'] },
      },
    ]);
  });

  it('aynı adlı FK farklı tablolarda ayrı FK; eksik alanlı satır atlanır', () => {
    const katalog = buildCatalog({
      semalar: ['a', 'b'],
      defaultSchema: 'a',
      iliskiler: [],
      tipler: [],
      fkler: [
        fkSatiri('fk', 'a.t1', 'b.h', 'x', 'id', '1'),
        fkSatiri('fk', 'b.t2', 'b.h', 'y', 'id', '1'),
        { ...fkSatiri('bozuk', 'a.t3', 'b.h', 'z', 'id', '1'), hedef_kolon: null },
      ],
    });
    expect(katalog.fkler.map((f) => `${f.kaynak.sema}.${f.kaynak.ad}.${f.ad}`)).toEqual(['a.t1.fk', 'b.t2.fk']);
  });
});
