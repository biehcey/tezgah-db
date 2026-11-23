import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** JSON dosyası okunamadı (`okuma`) ya da geçerli JSON değil (`cozumleme`). Mesaj dosya yolunu içerir. */
export class JsonFileError extends Error {
  readonly asama: 'okuma' | 'cozumleme';
  constructor(file: string, asama: 'okuma' | 'cozumleme', cause: unknown) {
    super(`${file} ${asama === 'okuma' ? 'okunamadı' : 'çözümlenemedi'}: ${(cause as Error).message}`, { cause });
    this.asama = asama;
    this.name = 'JsonFileError';
  }
}

export interface JsonFile {
  readonly file: string;
  /** Dosyanın JSON değeri; dosya yoksa `undefined`. Diğer hatalar `JsonFileError`. */
  read(): Promise<{ raw: unknown } | undefined>;
  /** Dizini kurar ve değeri atomik yazar (2 boşluk girintili, sonda satır sonu). */
  write(value: unknown): Promise<void>;
  /** İşi bu dosyanın sırasına koyar: yazmalar (ve okuyup yazan güncellemeler) birbirini ezmez. */
  serial<T>(job: () => Promise<T>): Promise<T>;
}

/**
 * Yapılandırma dizinindeki tek bir JSON dosyası: ayarlar, arayüz tercihleri, konsol sekmeleri. Biçim
 * ve göç dosyanın sahibinin işidir. `mode` yalnızca POSIX'te etkilidir (ör. `0o600`).
 */
export function createJsonFile(file: string, { mode }: { mode?: number } = {}): JsonFile {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    file,
    async read() {
      let text: string;
      try {
        text = await readFile(file, 'utf8');
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw new JsonFileError(file, 'okuma', err);
      }
      try {
        return { raw: JSON.parse(text) as unknown };
      } catch (err) {
        throw new JsonFileError(file, 'cozumleme', err);
      }
    },
    async write(value) {
      await mkdir(dirname(file), { recursive: true });
      await writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
    },
    serial(job) {
      const run = queue.then(job);
      queue = run.catch(() => {});
      return run;
    },
  };
}

/**
 * Dosyayı geçici dosya + rename ile yazar: okuyan ya da çöken süreç yarım dosya görmez. `mode`
 * yalnızca POSIX'te etkilidir (ör. `0o600`).
 */
export async function writeFileAtomic(file: string, text: string, { mode }: { mode?: number } = {}) {
  const tmp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, text, { encoding: 'utf8', flush: true, mode });
    await renameWithRetry(tmp, file);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

/**
 * Windows'ta hedef dosya o an başka bir süreçte (antivirüs, OneDrive, dizin indeksleyici)
 * açıksa rename kısa süreliğine EPERM/EACCES/EBUSY verebilir.
 */
async function renameWithRetry(from: string, to: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await rename(from, to);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '')) throw err;
      await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt));
    }
  }
}
