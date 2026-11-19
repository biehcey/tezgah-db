import { describe, expect, it } from 'vitest';
import { COMMON_TYPES } from '../kolon-ekle';
import { ONCELIK } from './index';
import { KATALOG } from './test/katalog';
import { etiketler, oneri, tamamlaIsaretli } from './test/yardimci';

const KULLANICI_TIPLI = { ...KATALOG, kullaniciTipleri: ['durum', 'satis.para'] };

describe('tamamla: tip yuvası', () => {
  it.each([
    ['::', 'SELECT id::| FROM customers'],
    ['CAST(… AS', 'SELECT CAST(id AS | FROM customers'],
    ['CREATE TABLE kolon tanımı', 'CREATE TABLE t (id |'],
    ['CREATE TABLE ikinci kolon', 'CREATE TABLE IF NOT EXISTS satis.t (id integer, ad |)'],
    ['ADD COLUMN', 'ALTER TABLE customers ADD COLUMN yas |'],
    ['ADD COLUMN IF NOT EXISTS', 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS yas |'],
    ['ALTER COLUMN … TYPE', 'ALTER TABLE customers ALTER COLUMN name TYPE |'],
    ['yazılan kelime', 'SELECT id::te|'],
  ])('%s sonrası yalnızca tipler: yaygın tipler, ardından kullanıcı tipleri', (_, metin) => {
    const s = tamamlaIsaretli(metin, { katalog: KULLANICI_TIPLI });
    expect(etiketler(s)).toEqual([...COMMON_TYPES, 'durum', 'satis.para']);
  });

  it('tip önerisi tip bandında; kullanıcı tipi ayrıca işaretli', () => {
    const s = tamamlaIsaretli('SELECT id::|', { katalog: KULLANICI_TIPLI });
    expect(oneri(s, 'integer')).toMatchObject({ tur: 'type', eklenecek: 'integer', oncelik: ONCELIK.TIP });
    expect(oneri(s, 'satis.para')).toMatchObject({ tur: 'type', eklenecek: 'satis.para', detail: 'kullanıcı tipi' });
  });

  it('katalog yokken yalnızca yaygın tipler', () => {
    expect(etiketler(tamamlaIsaretli('SELECT id::|', { katalog: null }))).toEqual([...COMMON_TYPES]);
  });

  it('tip yuvasında niteleyiciden sonra ilişki ya da kolon önerilmez', () => {
    expect(tamamlaIsaretli('SELECT id::satis.| FROM customers')).toBeNull();
    expect(tamamlaIsaretli('SELECT id::customers.| FROM customers')).toBeNull();
  });

  it('CREATE TABLE kolon adı ve kısıt yerinde tip önerilmez', () => {
    expect(etiketler(tamamlaIsaretli('CREATE TABLE t (|'), 'type')).toEqual([]);
    expect(etiketler(tamamlaIsaretli('CREATE TABLE t (id integer, |'), 'type')).toEqual([]);
    expect(etiketler(tamamlaIsaretli('CREATE TABLE t (id integer |'), 'type')).toEqual([]);
  });
});

const TUM_ILISKILER = ['Müşteri', 'aktif_musteriler', 'customer_orders', 'customers', 'satis.aylik_ozet', 'satis.siparis'];

describe('tamamla: DDL kolon yuvaları', () => {
  it.each([
    ['ALTER COLUMN', 'ALTER TABLE customers ALTER COLUMN |'],
    ['DROP COLUMN', 'ALTER TABLE customers DROP COLUMN |'],
    ['DROP COLUMN IF EXISTS', 'ALTER TABLE IF EXISTS ONLY customers DROP COLUMN IF EXISTS |'],
    ['RENAME COLUMN', 'ALTER TABLE public.customers RENAME COLUMN na|'],
    ['virgülle ikinci alt komut', 'ALTER TABLE customers ADD COLUMN yas integer, DROP COLUMN |'],
    ['CREATE INDEX … ON t (', 'CREATE INDEX ON customers (|'],
    ['CREATE UNIQUE INDEX CONCURRENTLY ad ON t USING (', 'CREATE UNIQUE INDEX CONCURRENTLY ix ON customers USING btree (|'],
    ['indeks kolon listesinde virgül', 'CREATE INDEX IF NOT EXISTS ix ON ONLY customers (name, |)'],
  ])('%s sonrası yalnızca o tablonun kolonları', (_, metin) => {
    expect(etiketler(tamamlaIsaretli(metin))).toEqual(['id', 'name', 'email']);
  });

  it('şema nitelikli tablonun kolonları', () => {
    expect(etiketler(tamamlaIsaretli('CREATE INDEX ix ON satis.siparis (|'))).toEqual(['id', 'musteri_id', 'tutar']);
  });
});

describe('tamamla: DDL ilişki yuvaları', () => {
  it.each([
    ['ALTER TABLE', 'ALTER TABLE |'],
    ['ALTER TABLE IF EXISTS ONLY', 'ALTER TABLE IF EXISTS ONLY |'],
    ['DROP TABLE', 'DROP TABLE |'],
    ['DROP TABLE IF EXISTS, ikinci öğe', 'DROP TABLE IF EXISTS customers, |'],
    ['DROP VIEW', 'DROP VIEW |'],
    ['TRUNCATE', 'TRUNCATE |'],
    ['TRUNCATE TABLE ONLY', 'TRUNCATE TABLE ONLY customers, |'],
    ['COMMENT ON TABLE', 'COMMENT ON TABLE cus|'],
    ['CREATE INDEX … ON', 'CREATE INDEX ix ON |'],
  ])('%s sonrası yalnızca ilişkiler', (_, metin) => {
    expect(etiketler(tamamlaIsaretli(metin))).toEqual(TUM_ILISKILER);
  });

  it('şema niteleyicisinden sonra o şemanın ilişkileri', () => {
    expect(etiketler(tamamlaIsaretli('DROP TABLE satis.|'))).toEqual(['aylik_ozet', 'siparis']);
  });
});

describe('tamamla: diğer DDL', () => {
  it.each([
    ['CREATE TRIGGER … ON', 'CREATE TRIGGER trg BEFORE INSERT ON |'],
    ['CREATE TRIGGER … EXECUTE FUNCTION', 'CREATE TRIGGER trg BEFORE INSERT ON customers EXECUTE FUNCTION |'],
    ['DROP TABLE adından sonra', 'DROP TABLE customers |'],
    ['COMMENT ON COLUMN', 'COMMENT ON COLUMN customers.|'],
    ['ALTER TABLE alt komut başı', 'ALTER TABLE customers |'],
    ['CREATE TABLE kolon adı', 'CREATE TABLE t (|'],
    ['CREATE TABLE tip parametresi', 'CREATE TABLE t (n numeric(|'],
    ['GRANT', 'GRANT SELECT ON |'],
  ])('%s: yalnızca anahtar kelimeler', (_, metin) => {
    const s = tamamlaIsaretli(metin);
    expect(etiketler(s).length).toBe(etiketler(s, 'keyword').length);
  });

  it('DDL içindeki sorgu olağan yuvaları kullanır', () => {
    expect(etiketler(tamamlaIsaretli('CREATE VIEW v AS SELECT * FROM |'))).toEqual(TUM_ILISKILER);
    expect(etiketler(tamamlaIsaretli('CREATE VIEW v AS SELECT | FROM customers'), 'property')).toEqual(['id', 'name', 'email']);
    expect(etiketler(tamamlaIsaretli('CREATE TABLE t (id integer CHECK (id IN (SELECT id FROM |'))).toEqual(TUM_ILISKILER);
  });
});
