import { homedir } from 'node:os';
import { join, posix, win32 } from 'node:path';
import { emptySettings, migrateSettings, type Settings } from '../core/ayarlar';
import { JsonFileError, createJsonFile } from './json-dosyasi';

export const SETTINGS_FILE = 'tezgah.json';

/** Ayar dosyası okunamadı ya da çözümlenemedi; dosyanın üzerine yazılmaz. */
export class SettingsFileError extends Error {
  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = 'SettingsFileError';
  }
}

export interface SettingsStore {
  read(): Promise<Settings>;
  /**
   * Ayarın kopyası üzerinde `change`'i çalıştırır ve değiştiyse atomik olarak yazar. Güncellemeler
   * sıraya girer; `change` hata fırlatırsa hiçbir şey yazılmaz.
   */
  update<T>(change: (settings: Settings) => T): Promise<T>;
}

/**
 * OS yapılandırma dizini: macOS `~/Library/Application Support/Tezgah`, Windows `%APPDATA%\Tezgah`.
 * Diğer platformlar (yalnızca geliştirme/CI) XDG kuralını izler.
 */
export function defaultConfigDir({
  env = process.env,
  platform = process.platform,
  home = homedir(),
}: { env?: NodeJS.ProcessEnv; platform?: NodeJS.Platform; home?: string } = {}): string {
  if (platform === 'win32') return win32.join(env.APPDATA ?? win32.join(home, 'AppData', 'Roaming'), 'Tezgah');
  if (platform === 'darwin') return posix.join(home, 'Library', 'Application Support', 'Tezgah');
  return posix.join(env.XDG_CONFIG_HOME ?? posix.join(home, '.config'), 'tezgah');
}

export function createSettingsStore(configDir: string): SettingsStore {
  const store = createJsonFile(join(configDir, SETTINGS_FILE));

  async function read(): Promise<Settings> {
    let found: { raw: unknown } | undefined;
    try {
      found = await store.read();
    } catch (err) {
      if (err instanceof JsonFileError) throw new SettingsFileError(err.message, { cause: err.cause });
      throw err;
    }
    if (!found) return emptySettings();
    try {
      return migrateSettings(found.raw);
    } catch (err) {
      throw new SettingsFileError(`${store.file} çözümlenemedi: ${(err as Error).message}`, { cause: err });
    }
  }

  return {
    read,
    update<T>(change: (settings: Settings) => T): Promise<T> {
      return store.serial(async () => {
        const current = await read();
        const settings = structuredClone(current);
        const result = change(settings);
        if (JSON.stringify(settings) !== JSON.stringify(current)) await store.write(settings);
        return result;
      });
    },
  };
}
