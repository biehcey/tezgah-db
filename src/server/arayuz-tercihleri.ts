import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ARAYUZ_TERCIHLERI_VARSAYILAN, normalizeArayuzTercihleri, type ArayuzTercihleri } from '../core/arayuz-tercihleri';
import { writeFileAtomic } from './ayar-deposu';
import { json, methodNotAllowed, readJson } from './http';

/** Arayüz tercihleri `tezgah.json`'dan ayrı: bağlantı ayarlarının sürüm/göç mekanizmasına girmez. */
export const PREFERENCES_FILE = 'arayuz.json';

/** Sunucu pencereyi bilmez: genişliğin üst sınırını arayüz kendi penceresiyle uygular. */
const UNKNOWN_WINDOW = { genislik: Number.POSITIVE_INFINITY };

export interface PreferenceStore {
  /** Dosya yoksa ya da bozuksa varsayılanlar. */
  read(): Promise<ArayuzTercihleri>;
  /** Normalleştirip atomik yazar; yazılanı döndürür. */
  write(raw: unknown): Promise<ArayuzTercihleri>;
}

export function createPreferenceStore(configDir: string): PreferenceStore {
  const file = join(configDir, PREFERENCES_FILE);
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<ArayuzTercihleri> {
    let text: string;
    try {
      text = await readFile(file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(ARAYUZ_TERCIHLERI_VARSAYILAN);
      throw err;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      // Bozuk dosya varsayılanlara düşer; ilk yazma onu düzeltir.
      raw = null;
    }
    return normalizeArayuzTercihleri(raw, UNKNOWN_WINDOW);
  }

  async function write(raw: unknown): Promise<ArayuzTercihleri> {
    const preferences = normalizeArayuzTercihleri(raw, UNKNOWN_WINDOW);
    await mkdir(configDir, { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify(preferences, null, 2)}\n`, { mode: 0o600 });
    return preferences;
  }

  return {
    read,
    write(raw) {
      const run = queue.then(() => write(raw));
      queue = run.catch(() => {});
      return run;
    },
  };
}

/** `/api/arayuz-tercihleri`: oku (GET) ve yaz (PUT). Hiçbir veritabanına bağlanmaz. */
export function createPreferenceRoutes({ preferences }: { preferences: PreferenceStore }) {
  return async function handle(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
    if (pathname !== '/api/arayuz-tercihleri') return false;
    if (req.method === 'GET') json(res, 200, await preferences.read());
    else if (req.method === 'PUT') json(res, 200, await preferences.write(await readJson(req)));
    else methodNotAllowed(res);
    return true;
  };
}
