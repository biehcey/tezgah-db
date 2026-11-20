import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import type { ServerEvent } from '../core/script-calistirma';
import { createFakeClock } from './test/sahte-saat';
import { describePg, pgUrl, startTestServer, type TestServer, type TestSocket } from './test/sunucu';

type Bildirim = Extract<ServerEvent, { type: 'bildirim' }>;

let t: TestServer;
let ws: TestSocket;
beforeEach(async () => {
  t = await startTestServer({ clock: createFakeClock() });
  ws = await t.socket();
});
afterEach(async () => {
  ws.close();
  await t.close();
});

const bildirimler = (events: ServerEvent[]) => events.filter((e): e is Bildirim => e.type === 'bildirim');

describePg('Sunucu bildirimleri: gerçek Postgres', () => {
  const url = new URL(pgUrl ?? 'postgres://localhost');
  const real = {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)) || 'postgres',
  };
  const TABLE = 'tezgah_test_bildirim';
  let admin: pg.Client;
  let connectionId: string;

  beforeAll(async () => {
    admin = new pg.Client(real);
    await admin.connect();
    await admin.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (id int)`);
  });
  afterAll(async () => {
    await admin.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await admin.end();
  });
  beforeEach(async () => {
    const res = await t.api('POST', '/api/baglantilar', { name: 'Yerel', ...real });
    connectionId = res.body.connection.id;
  });

  const run = (script: string, ek: Record<string, unknown> = {}) =>
    ws.send({ type: 'run', target: { connectionId, database: real.database }, script, ...ek });

  it('DO bloğunun NOTICE, INFO ve WARNING’i çalışan ifadenin indeksi, seviyesi, DETAIL ve HINT’iyle, ifade bitmeden gelir', async () => {
    run(
      [
        'SELECT 1',
        `DO $$ BEGIN
  RAISE NOTICE 'merhaba %', 1;
  RAISE INFO 'bilgi';
  RAISE WARNING 'dikkat' USING DETAIL = 'ayrıntı', HINT = 'öneri';
END $$`,
      ].join(';\n'),
    );
    await ws.waitFor('kararBekleniyor');
    expect(bildirimler(ws.events)).toEqual([
      { type: 'bildirim', i: 1, seviye: 'NOTICE', mesaj: 'merhaba 1' },
      { type: 'bildirim', i: 1, seviye: 'INFO', mesaj: 'bilgi' },
      { type: 'bildirim', i: 1, seviye: 'WARNING', mesaj: 'dikkat', detay: 'ayrıntı', ipucu: 'öneri' },
    ]);
    // Geldikçe: ifadenin `done`'ından önce.
    const types = ws.events.map((e) => e.type);
    expect(types.indexOf('bildirim')).toBeLessThan(types.lastIndexOf('done'));
    ws.send({ type: 'rollback' });
    expect(await ws.waitFor('bitti')).toEqual({ type: 'bitti', sonuc: 'rollback' });
  });

  it('çalıştırma başına ilk 1000 bildirim gönderilir; gerisi bitti’de sayılır', async () => {
    run(`DO $$ BEGIN FOR n IN 1..1005 LOOP RAISE NOTICE 'n%', n; END LOOP; END $$`);
    await ws.waitFor('kararBekleniyor');
    ws.send({ type: 'rollback' });
    expect(await ws.waitFor('bitti')).toEqual({ type: 'bitti', sonuc: 'rollback', bildirimFazlasi: 5 });
    const gelen = bildirimler(ws.events);
    expect(gelen).toHaveLength(1000);
    expect(gelen.at(-1)!.mesaj).toBe('n1000');
  });

  it('dinleyici çalıştırma bitince kalkar: aynı client’la sonraki çalıştırmada eski dinleyiciden bildirim gelmez', async () => {
    const pid = async () => {
      await ws.waitFor('kararBekleniyor');
      const done = ws.events.find((e): e is Extract<ServerEvent, { type: 'done' }> => e.type === 'done' && e.i === 0);
      ws.send({ type: 'rollback' });
      await ws.waitFor('bitti');
      return done!.onizleme!.satirlar[0]![0];
    };
    const script = `SELECT pg_backend_pid();\nDO $$ BEGIN RAISE NOTICE 'tek'; END $$`;
    run(script);
    const ilk = await pid();
    ws.events.length = 0;
    run(script);
    expect(await pid()).toBe(ilk);
    expect(bildirimler(ws.events).map((b) => b.mesaj)).toEqual(['tek']);
  });

  it('Deneme modunda bildirim gelir', async () => {
    run(`DO $$ BEGIN RAISE NOTICE 'deneme'; END $$`, { deneme: true });
    expect(await ws.waitFor('bitti')).toEqual({ type: 'bitti', sonuc: 'deneme' });
    expect(bildirimler(ws.events)).toEqual([{ type: 'bildirim', i: 0, seviye: 'NOTICE', mesaj: 'deneme' }]);
  });

  it('Autocommit’te bildirim gelir (VACUUM VERBOSE’un INFO’ları)', async () => {
    run(`VACUUM (VERBOSE) ${TABLE}`);
    expect(await ws.waitFor('bitti')).toMatchObject({ sonuc: 'autocommit' });
    const gelen = bildirimler(ws.events);
    expect(gelen.length).toBeGreaterThan(0);
    expect(gelen.every((b) => b.i === 0 && b.seviye === 'INFO')).toBe(true);
  });
});
