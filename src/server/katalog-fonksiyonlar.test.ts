import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CatalogFunction } from '../core/katalog';
import { startFakePostgres, type FakePostgres, type FakeResult } from './test/sahte-postgres';
import { createFakeClock } from './test/sahte-saat';
import { describePg, pgUrl, startTestServer, type TestServer } from './test/sunucu';
import { addFakeConnection } from './test/yardimcilar';

let t: TestServer;

const catalogUrl = (id: string, database = 'postgres') => `/api/baglantilar/${id}/veritabanlari/${database}/katalog`;
const result = (columns: string[], rows: (string | null)[][]): FakeResult => ({ columns, rows, command: `SELECT ${rows.length}` });

describe('Katalog önbelleği: fonksiyonlar (sahte Postgres)', () => {
  let fake: FakePostgres;

  beforeEach(async () => {
    fake = await startFakePostgres({ password: 'gizli' });
    fake.resultFor = (sql) => {
      if (sql.includes('pg_catalog.pg_proc')) {
        return result(['sema', 'ad', 'tur', 'argumanlar', 'donus', 'kume', 'aciklama'], [
          ['pg_catalog', 'generate_series', 'f', 'integer, integer', 'SETOF integer', 't', null],
          ['public', 'arsivle', 'p', 'gun integer', '', 'f', 'Eski satırları taşır'],
        ]);
      }
      if (sql.includes('pg_catalog.pg_namespace')) return result(['ad', 'varsayilan'], [['app', 'f'], ['public', 't']]);
      return undefined;
    };
    t = await startTestServer({ clock: createFakeClock() });
  });
  afterEach(async () => {
    await t.close();
    await fake.close();
  });

  it('fonksiyon satırları katalogla aynı salt okunur transaction içinde, görünür şemalar + pg_catalog için okunur', async () => {
    const id = await addFakeConnection(t, fake.port);
    await t.api('PUT', `/api/baglantilar/${id}/veritabani-secimi`, [{ database: 'postgres', schemas: ['public'] }]);
    const res = await t.api('GET', catalogUrl(id));
    expect(res.status).toBe(200);
    expect(res.body.fonksiyonlar).toEqual([
      { sema: 'pg_catalog', ad: 'generate_series', tur: 'f', argumanlar: 'integer, integer', donus: 'SETOF integer', kumeDondurur: true, aciklama: null },
      { sema: 'public', ad: 'arsivle', tur: 'p', argumanlar: 'gun integer', donus: '', kumeDondurur: false, aciklama: 'Eski satırları taşır' },
    ]);
    const proc = fake.queries.findIndex((q) => q.includes('pg_catalog.pg_proc'));
    expect(fake.queries[proc]).toContain("IN (E'pg_catalog', E'public')");
    const begin = fake.queries.findIndex((q) => /^BEGIN .*READ ONLY/.test(q));
    const commit = fake.queries.indexOf('COMMIT');
    expect(begin).toBeLessThan(proc);
    expect(proc).toBeLessThan(commit);
  });
});

describePg('Katalog önbelleği: fonksiyonlar (gerçek Postgres)', () => {
  const url = new URL(pgUrl ?? 'postgres://localhost');
  const real = {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)) || 'postgres',
  };
  const SCHEMA = 'tezgah_fonksiyon';
  let admin: pg.Client;

  beforeAll(async () => {
    admin = new pg.Client(real);
    await admin.connect();
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.query(`CREATE SCHEMA ${SCHEMA}`);
    await admin.query(`CREATE FUNCTION ${SCHEMA}.topla(a integer, b integer) RETURNS integer LANGUAGE sql AS 'SELECT a + b'`);
    await admin.query(`CREATE FUNCTION ${SCHEMA}.topla(a numeric, b numeric) RETURNS numeric LANGUAGE sql AS 'SELECT a + b'`);
    await admin.query(`COMMENT ON FUNCTION ${SCHEMA}.topla(integer, integer) IS 'İki tamsayıyı toplar'`);
    await admin.query(`CREATE FUNCTION ${SCHEMA}.sayilar(n integer) RETURNS SETOF integer LANGUAGE sql AS 'SELECT generate_series(1, n)'`);
    await admin.query(`CREATE PROCEDURE ${SCHEMA}.arsivle() LANGUAGE sql AS 'SELECT 1'`);
    await admin.query(`CREATE FUNCTION ${SCHEMA}.tetik() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END'`);
    await admin.query(`CREATE OPERATOR ${SCHEMA}.<~> (LEFTARG = integer, RIGHTARG = integer, FUNCTION = ${SCHEMA}.topla)`);
  });
  afterAll(async () => {
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.end();
  });

  beforeEach(async () => {
    t = await startTestServer({ clock: createFakeClock() });
  });
  afterEach(async () => {
    await t.close();
  });

  async function connect(): Promise<string> {
    const res = await t.api('POST', '/api/baglantilar', { name: 'Gerçek', sslmode: 'prefer', ...real });
    const id = res.body.connection.id;
    await t.api('PUT', `/api/baglantilar/${id}/veritabani-secimi`, [{ database: real.database, schemas: [SCHEMA] }]);
    return id;
  }

  const bul = (fonksiyonlar: CatalogFunction[], sema: string, ad: string) => fonksiyonlar.filter((f) => f.sema === sema && f.ad === ad);

  it('kendi fonksiyonları aşırı yüklemeleri, türleri, SRF ve açıklamayla; pg_catalog iç tipliler olmadan gelir', async () => {
    const id = await connect();
    const { status, body } = await t.api('GET', catalogUrl(id, real.database));
    expect(status).toBe(200);
    const f: CatalogFunction[] = body.fonksiyonlar;
    expect(bul(f, SCHEMA, 'topla')).toEqual([
      { sema: SCHEMA, ad: 'topla', tur: 'f', argumanlar: 'a integer, b integer', donus: 'integer', kumeDondurur: false, aciklama: 'İki tamsayıyı toplar' },
      { sema: SCHEMA, ad: 'topla', tur: 'f', argumanlar: 'a numeric, b numeric', donus: 'numeric', kumeDondurur: false, aciklama: null },
    ]);
    expect(bul(f, SCHEMA, 'sayilar')).toEqual([expect.objectContaining({ donus: 'SETOF integer', kumeDondurur: true })]);
    expect(bul(f, SCHEMA, 'arsivle')).toEqual([expect.objectContaining({ tur: 'p', argumanlar: '' })]);
    // Kullanıcının kendi trigger fonksiyonu süzülmez; süzme yalnızca pg_catalog'da.
    expect(bul(f, SCHEMA, 'tetik')).toHaveLength(1);
    // Operatör gerçekleştiren kullanıcı fonksiyonu da (`<~>` → `topla`) süzülmez: yukarıda iki aşırı yüklemesiyle geldi.

    expect(bul(f, 'pg_catalog', 'count').map((x) => x.tur)).toContain('a');
    expect(bul(f, 'pg_catalog', 'row_number')).toEqual([expect.objectContaining({ tur: 'w', donus: 'bigint' })]);
    expect(bul(f, 'pg_catalog', 'generate_series').every((x) => x.kumeDondurur)).toBe(true);
    expect(bul(f, 'pg_catalog', 'lower')).not.toEqual([]);
    // internal / trigger / handler tipli iç kullanım fonksiyonları
    for (const ad of ['array_agg_transfn', 'suppress_redundant_updates_trigger', 'heap_tableam_handler', 'plpgsql_call_handler', 'bthandler']) {
      expect(bul(f, 'pg_catalog', ad), ad).toEqual([]);
    }
    // cstring'li G/Ç fonksiyonları ve yalnızca bir operatörü gerçekleştiren fonksiyonlar
    for (const ad of ['aclitemin', 'aclitemout', 'aclitemeq', 'date_eq_timestamp', 'date_pl_interval', 'date_mi_interval', 'int4pl']) {
      expect(bul(f, 'pg_catalog', ad), ad).toEqual([]);
    }
    // Operatörü gerçekleştirse de doğrudan çağrılmak için açıklaması olan kalır (`anyarray || anyelement`).
    expect(bul(f, 'pg_catalog', 'array_append')).toHaveLength(1);
    // Görünür olmayan şemalar okunmaz.
    expect(f.every((x) => x.sema === SCHEMA || x.sema === 'pg_catalog')).toBe(true);
  });

  it('CREATE FUNCTION commit edilince katalog yenilenir ve yeni fonksiyon gelir', async () => {
    const id = await connect();
    await t.api('GET', catalogUrl(id, real.database));
    const ws = await t.socket();
    ws.send({
      type: 'run',
      target: { connectionId: id, database: real.database },
      script: `CREATE FUNCTION ${SCHEMA}.yeni_fonksiyon() RETURNS integer LANGUAGE sql AS 'SELECT 1'`,
    });
    await ws.waitFor('kararBekleniyor');
    ws.send({ type: 'commit' });
    expect(await ws.waitFor('bitti')).toMatchObject({ sonuc: 'commit', katalogYenilendi: true });
    const { body } = await t.api('GET', catalogUrl(id, real.database));
    expect(bul(body.fonksiyonlar, SCHEMA, 'yeni_fonksiyon')).toEqual([expect.objectContaining({ tur: 'f', argumanlar: '', donus: 'integer' })]);
  });
});
