import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { ARAYUZ_TERCIHLERI_VARSAYILAN, normalizeArayuzTercihleri, type ArayuzTercihleri } from '../core/arayuz-tercihleri';
import { JsonFileError, createJsonFile } from './json-dosyasi';
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
  const store = createJsonFile(join(configDir, PREFERENCES_FILE), { mode: 0o600 });

  async function read(): Promise<ArayuzTercihleri> {
    let found: { raw: unknown } | undefined;
    try {
      found = await store.read();
    } catch (err) {
      if (!(err instanceof JsonFileError)) throw err;
      if (err.asama === 'okuma') throw err.cause;
      // Bozuk dosya varsayılanlara düşer; ilk yazma onu düzeltir.
      found = { raw: null };
    }
    if (!found) return structuredClone(ARAYUZ_TERCIHLERI_VARSAYILAN);
    return normalizeArayuzTercihleri(found.raw, UNKNOWN_WINDOW);
  }

  return {
    read,
    write(raw) {
      return store.serial(async () => {
        const preferences = normalizeArayuzTercihleri(raw, UNKNOWN_WINDOW);
        await store.write(preferences);
        return preferences;
      });
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
