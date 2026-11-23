import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { TabsFormatError, emptyTabs, parseTabs, type SavedTabs } from '../core/konsol-sekmeleri';
import { JsonFileError, createJsonFile } from './json-dosyasi';
import { json, methodNotAllowed, readJson } from './http';

/** Sekmeler `tezgah.json`'dan ayrı, kendi dizininde: sık değişen metin bağlantı ayarlarıyla yazılmaz. */
export const TABS_DIR = 'konsol';
export const TABS_FILE = 'sekmeler.json';

/** Script metinleri büyüyebilir; genel 1 MB sınırı bu uç için yetmez. */
const MAX_TABS_BYTES = 16 * 1024 * 1024;

/** Sekme dosyası okunamadı ya da daha yeni bir Tezgah'ın biçiminde; üzerine yazılmaz. */
export class TabsFileError extends Error {
  /** Daha yeni bir Tezgah'ın biçimi: üzerine yazılmaz. */
  readonly newer: boolean;
  constructor(message: string, { newer = false, cause }: { newer?: boolean; cause?: unknown } = {}) {
    super(message, { cause });
    this.newer = newer;
    this.name = 'TabsFileError';
  }
}

export interface TabStore {
  read(): Promise<SavedTabs>;
  /** Biçime göre süzüp atomik yazar (geçici dosya + rename, POSIX'te `0600`); yazılanı döndürür. */
  write(tabs: SavedTabs): Promise<SavedTabs>;
}

export function createTabStore(configDir: string): TabStore {
  const store = createJsonFile(join(configDir, TABS_DIR, TABS_FILE), { mode: 0o600 });

  async function read(): Promise<SavedTabs> {
    let found: { raw: unknown } | undefined;
    try {
      found = await store.read();
    } catch (err) {
      if (err instanceof JsonFileError) throw new TabsFileError(err.message, { cause: err.cause });
      throw err;
    }
    if (!found) return emptyTabs();
    try {
      return parseTabs(found.raw);
    } catch (err) {
      if (!(err instanceof TabsFormatError)) throw err;
      throw new TabsFileError(`${store.file}: ${err.message}`, { newer: err.newer, cause: err });
    }
  }

  return {
    read,
    write(tabs) {
      return store.serial(async () => {
        // Daha yeni bir Tezgah'ın dosyası ezilmez; bozuk ya da eski dosyanın yerine yenisi yazılır.
        await read().catch((err: unknown) => {
          if (err instanceof TabsFileError && err.newer) throw err;
        });
        await store.write(tabs);
        return tabs;
      });
    },
  };
}

/** `/api/konsol-sekmeleri`: oku (GET) ve tümünü yaz (PUT). İsteği ele aldıysa `true` döner. */
export function createTabRoutes({ tabs }: { tabs: TabStore }) {
  async function put(req: IncomingMessage, res: ServerResponse) {
    const raw = await readJson(req, { maxBytes: MAX_TABS_BYTES });
    let parsed: SavedTabs;
    try {
      parsed = parseTabs(raw);
    } catch (err) {
      if (err instanceof TabsFormatError) return json(res, 400, { hata: err.message });
      throw err;
    }
    try {
      json(res, 200, await tabs.write(parsed));
    } catch (err) {
      if (err instanceof TabsFileError && err.newer) return json(res, 409, { hata: err.message });
      throw err;
    }
  }

  return async function handle(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
    if (pathname !== '/api/konsol-sekmeleri') return false;
    if (req.method === 'GET') {
      try {
        json(res, 200, await tabs.read());
      } catch (err) {
        if (err instanceof TabsFileError) json(res, 500, { hata: err.message });
        else throw err;
      }
    } else if (req.method === 'PUT') await put(req, res);
    else methodNotAllowed(res);
    return true;
  };
}
