/** JOIN önerileri (ticket 03): FK'den ON koşuluyla, JOIN ve ON yuvalarında. */
import { describe, expect, it } from 'vitest';
import type { Catalog, CatalogForeignKey } from '../katalog';
import { ONCELIK } from './oncelik';
import { GORUNUR, KATALOG, iliski, kolon } from './test/katalog';
import { etiketler, oneri, tamamlaIsaretli } from './test/yardimci';

const fk = (ad: string, kaynak: string, kaynakKolonlar: string[], hedef: string, hedefKolonlar: string[]): CatalogForeignKey => {
  const [ks, ka] = kaynak.split('.');
  const [hs, ha] = hedef.split('.');
  return { ad, kaynak: { sema: ks!, ad: ka!, kolonlar: kaynakKolonlar }, hedef: { sema: hs!, ad: ha!, kolonlar: hedefKolonlar } };
};

/** Fixture katalog + FK'ler ve FK için birkaç ilişki. */
const FK_KATALOG: Catalog = {
  ...KATALOG,
  iliskiler: [
    ...KATALOG.iliskiler,
    iliski('public', 'belgeler', [kolon('id'), kolon('created_by'), kolon('updated_by')]),
    iliski('public', 'calisanlar', [kolon('id'), kolon('yonetici_id')]),
    iliski('public', 'kalem', [kolon('siparis_no'), kolon('siparis_yil'), kolon('sira')]),
    iliski('public', 'kullanicilar', [kolon('id'), kolon('ad', 'text')]),
    iliski('public', 'siparis_baslik', [kolon('no'), kolon('yil')]),
    iliski('public', 'Sipariş Notu', [kolon('id'), kolon('Müşteri Id')]),
  ],
  fkler: [
    fk('sir_customer_fk', 'gizli.sir', ['id'], 'public.customers', ['id']),
    fk('belgeler_created_by_fk', 'public.belgeler', ['created_by'], 'public.kullanicilar', ['id']),
    fk('belgeler_updated_by_fk', 'public.belgeler', ['updated_by'], 'public.kullanicilar', ['id']),
    fk('calisanlar_yonetici_fk', 'public.calisanlar', ['yonetici_id'], 'public.calisanlar', ['id']),
    fk('customer_orders_customer_fk', 'public.customer_orders', ['customer_id'], 'public.customers', ['id']),
    fk('kalem_baslik_fk', 'public.kalem', ['siparis_yil', 'siparis_no'], 'public.siparis_baslik', ['yil', 'no']),
    fk('siparis_musteri_fk', 'satis.siparis', ['musteri_id'], 'public.customers', ['id']),
    fk('not_musteri_fk', 'public.Sipariş Notu', ['Müşteri Id'], 'public.Müşteri', ['id']),
  ],
};

const tamamla = (isaretli: string) => tamamlaIsaretli(isaretli, { katalog: FK_KATALOG, gorunurSemalar: GORUNUR });
const joinler = (isaretli: string) => etiketler(tamamla(isaretli), 'text');

describe('JOIN yuvası: FK önerileri', () => {
  it('referans verilen taraftan: FK ile bağlı ilişki ON koşuluyla, takma adla', () => {
    const s = tamamla('SELECT * FROM customers c JOIN |');
    expect(oneri(s, 'customer_orders ON customer_orders.customer_id = c.id')).toEqual({
      etiket: 'customer_orders ON customer_orders.customer_id = c.id',
      eklenecek: 'customer_orders ON customer_orders.customer_id = c.id',
      tur: 'text',
      detail: 'customer_orders_customer_fk',
      oncelik: ONCELIK.JOIN_FK,
    });
    // Düz ilişki adları da önerilir.
    expect(etiketler(s, 'type')).toContain('customer_orders');
  });

  it('iki yön: referans veren taraftan referans verilen ilişki; takma adsız taraf adıyla anılır', () => {
    expect(joinler('SELECT * FROM customer_orders JOIN |')).toEqual(['customers ON customers.id = customer_orders.customer_id']);
  });

  it('defaultSchema dışındaki yeni ilişki şema önekli; şemalı yazılmış taraf şemalı anılır', () => {
    expect(joinler('SELECT * FROM customers JOIN |')).toEqual([
      'customer_orders ON customer_orders.customer_id = customers.id',
      'satis.siparis ON satis.siparis.musteri_id = customers.id',
    ]);
    expect(joinler('SELECT * FROM satis.siparis JOIN |')).toEqual(['customers ON customers.id = satis.siparis.musteri_id']);
  });

  it('tırnak isteyen adlar eklenecekte tırnaklı; tırnaklı taraf tırnaklı anılır', () => {
    expect(oneri(tamamla('SELECT * FROM "Müşteri" JOIN |'), 'Sipariş Notu ON "Sipariş Notu"."Müşteri Id" = "Müşteri".id')).toMatchObject({
      eklenecek: '"Sipariş Notu" ON "Sipariş Notu"."Müşteri Id" = "Müşteri".id',
    });
    expect(joinler('SELECT * FROM "Sipariş Notu" n JOIN |')).toEqual(['Müşteri ON "Müşteri".id = n."Müşteri Id"']);
  });

  it('görünmez şemaya giden FK önerilmez', () => {
    expect(joinler('SELECT * FROM customers c JOIN |')).not.toContainEqual(expect.stringContaining('sir'));
  });

  it('bileşik FK: koşullar FK kolon sırasıyla AND ile', () => {
    expect(joinler('SELECT * FROM kalem k JOIN |')).toEqual(['siparis_baslik ON siparis_baslik.yil = k.siparis_yil AND siparis_baslik.no = k.siparis_no']);
  });

  it('aynı çiftte birden çok FK: her biri ayrı öneri, detail FK adı', () => {
    const s = tamamla('SELECT * FROM kullanicilar u JOIN |');
    expect(etiketler(s, 'text')).toEqual(['belgeler ON belgeler.created_by = u.id', 'belgeler ON belgeler.updated_by = u.id']);
    expect(oneri(s, 'belgeler ON belgeler.updated_by = u.id').detail).toBe('belgeler_updated_by_fk');
  });

  it('kendine referans veren FK: takma adlı tarafta iki yön, takma adsız tarafta öneri yok', () => {
    expect(joinler('SELECT * FROM calisanlar c JOIN |')).toEqual([
      'calisanlar ON calisanlar.id = c.yonetici_id',
      'calisanlar ON calisanlar.yonetici_id = c.id',
    ]);
    expect(joinler('SELECT * FROM calisanlar JOIN |')).toEqual([]);
  });

  it('FROM ve önceki JOIN ilişkilerinin hepsi FK kaynağıdır', () => {
    expect(joinler('SELECT * FROM kalem k, customers c JOIN |')).toEqual([
      'siparis_baslik ON siparis_baslik.yil = k.siparis_yil AND siparis_baslik.no = k.siparis_no',
      'customer_orders ON customer_orders.customer_id = c.id',
      'satis.siparis ON satis.siparis.musteri_id = c.id',
    ]);
  });

  it.each(['LEFT JOIN', 'INNER JOIN', 'left outer join', 'RIGHT JOIN', 'FULL OUTER JOIN'])('%s sonrası aynı öneriler', (tur) => {
    expect(joinler(`SELECT * FROM customer_orders o ${tur} |`)).toEqual(['customers ON customers.id = o.customer_id']);
  });

  it.each(['CROSS JOIN', 'NATURAL JOIN', 'NATURAL LEFT JOIN'])('ON almayan %s sonrası FK önerisi yok, ilişkiler var', (tur) => {
    const s = tamamla(`SELECT * FROM customer_orders o ${tur} |`);
    expect(etiketler(s, 'text')).toEqual([]);
    expect(etiketler(s, 'type')).toContain('customers');
  });

  it('yazılan önekle eşleşen etiket; JOIN dışındaki ilişki yuvasında yok', () => {
    const s = tamamla('SELECT * FROM customer_orders o JOIN cus|');
    expect(s?.from).toBe('SELECT * FROM customer_orders o JOIN '.length);
    expect(etiketler(s, 'text')).toEqual(['customers ON customers.id = o.customer_id']);
    expect(joinler('SELECT * FROM customer_orders o, |')).toEqual([]);
  });

  it('CTE ve alt sorgu FK kaynağı değildir (katalog tablosuyla aynı adlı CTE de)', () => {
    expect(joinler('WITH customers AS (SELECT 1 AS id) SELECT * FROM customers c JOIN |')).toEqual([]);
    expect(joinler('SELECT * FROM (SELECT * FROM customers) c JOIN |')).toEqual([]);
    expect(joinler('WITH x AS (SELECT 1) SELECT * FROM x, customer_orders o JOIN |')).toEqual(['customers ON customers.id = o.customer_id']);
  });

  it('katalog yokken JOIN önerisi yok', () => {
    expect(etiketler(tamamlaIsaretli('SELECT * FROM customers c JOIN |', { katalog: null }), 'text')).toEqual([]);
  });
});

describe('ON yuvası: FK koşulları', () => {
  it('son JOIN lenen ilişkiyle öncekiler arasındaki koşullar, iki yönde', () => {
    expect(joinler('SELECT * FROM customers c JOIN customer_orders o ON |')).toEqual(['o.customer_id = c.id']);
    expect(joinler('SELECT * FROM customer_orders o LEFT JOIN customers ON |')).toEqual(['customers.id = o.customer_id']);
  });

  it('bileşik ve çoklu FK; detail FK adı', () => {
    expect(joinler('SELECT * FROM siparis_baslik b JOIN kalem k ON |')).toEqual(['k.siparis_yil = b.yil AND k.siparis_no = b.no']);
    const s = tamamla('SELECT * FROM belgeler b JOIN kullanicilar u ON |');
    expect(etiketler(s, 'text')).toEqual(['u.id = b.created_by', 'u.id = b.updated_by']);
    expect(oneri(s, 'u.id = b.created_by')).toMatchObject({ detail: 'belgeler_created_by_fk', oncelik: ONCELIK.JOIN_FK });
  });

  it('kolonlar da önerilir; FK yoksa yalnızca kolonlar', () => {
    const s = tamamla('SELECT * FROM customers c JOIN customer_orders o ON |');
    expect(etiketler(s, 'property')).toContain('customer_id');
    expect(joinler('SELECT * FROM customers c JOIN kalem k ON |')).toEqual([]);
  });
});
