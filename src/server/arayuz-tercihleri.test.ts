import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ARAYUZ_TERCIHLERI_VARSAYILAN } from '../core/arayuz-tercihleri';
import { startTestServer, type TestServer } from './test/sunucu';

const URL = '/api/arayuz-tercihleri';
const TERCIHLER = { surum: 1, gezgin: { acik: false, genislik: 360 }, sonucOrani: 0.3, sonucDaraltilmis: true, tema: 'koyu' };

let t: TestServer | undefined;
afterEach(async () => {
  await t?.close();
  t = undefined;
});

describe('Arayüz tercihleri uçları', () => {
  it('erişim anahtarı olmayan okuma ve yazma reddedilir', async () => {
    t = await startTestServer();
    expect((await t.request(URL)).status).toBe(401);
    const put = await t.request(URL, { method: 'PUT', headers: { origin: t.origin, 'content-type': 'application/json' }, body: JSON.stringify(TERCIHLER) });
    expect(put.status).toBe(401);
    await expect(readdir(t.configDir)).rejects.toThrow();
  });

  it('dosya yokken varsayılan döner ve hiçbir şey yazılmaz', async () => {
    t = await startTestServer();
    expect(await t.api('GET', URL)).toEqual({ status: 200, body: ARAYUZ_TERCIHLERI_VARSAYILAN });
    await expect(readdir(t.configDir)).rejects.toThrow();
  });

  it('yazılan tercihler geri okunur; tezgah.json\'dan ayrı bir dosyaya yazılır', async () => {
    t = await startTestServer();
    expect(await t.api('PUT', URL, TERCIHLER)).toEqual({ status: 200, body: TERCIHLER });
    expect((await t.api('GET', URL)).body).toEqual(TERCIHLER);
    expect(await readdir(t.configDir)).toEqual(['arayuz.json']);
    expect(JSON.parse(await readFile(join(t.configDir, 'arayuz.json'), 'utf8'))).toEqual(TERCIHLER);
  });

  it('bozuk dosyada varsayılan döner; ilk yazma dosyayı düzeltir', async () => {
    t = await startTestServer();
    await mkdir(t.configDir, { recursive: true });
    await writeFile(join(t.configDir, 'arayuz.json'), '{ bozuk');
    expect(await t.api('GET', URL)).toEqual({ status: 200, body: ARAYUZ_TERCIHLERI_VARSAYILAN });
    await t.api('PUT', URL, TERCIHLER);
    expect((await t.api('GET', URL)).body).toEqual(TERCIHLER);
  });

  it('yazılan gövde normalleştirilir: bilinmeyen alanlar atılır, sayılar sınırlanır', async () => {
    t = await startTestServer();
    const res = await t.api('PUT', URL, { ...TERCIHLER, gezgin: { acik: true, genislik: 20 }, sonucOrani: 2, yabanci: 1 });
    expect(res.body).toEqual({ ...TERCIHLER, gezgin: { acik: true, genislik: 200 }, sonucOrani: 0.85 });
    expect(await readFile(join(t.configDir, 'arayuz.json'), 'utf8')).not.toMatch(/yabanci/);
  });
});
