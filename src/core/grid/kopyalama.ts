import { NULL_LABEL } from './gosterim';
import { columnAlignment } from './tipler';
import { toTsv, toTsvWithHeader } from './tsv';

/**
 * Grid'in "Kopyala ▸" biçimleri. Girdi seçili satırların tam (kesilmemiş) ham metin değerleridir;
 * NULL `null`. Başlıksız TSV `tsv.ts`'de, INSERT `insert.ts`'dedir.
 */
export interface CopyInput {
  kolonlar: readonly string[];
  /** Kolon tip OID'leri; verilmeyen kolon metin sayılır. */
  tipler?: readonly number[];
  satirlar: readonly (readonly (string | null)[])[];
}

export type CopyFormat = 'tsv' | 'baslikliTsv' | 'csv' | 'markdown' | 'json' | 'insert';

/** "Kopyala ▸" alt menüsündeki sıra ve adlar. */
export const COPY_FORMATS: readonly { bicim: CopyFormat; etiket: string }[] = [
  { bicim: 'tsv', etiket: 'TSV' },
  { bicim: 'baslikliTsv', etiket: 'Başlıklı TSV' },
  { bicim: 'csv', etiket: 'CSV' },
  { bicim: 'markdown', etiket: 'Markdown' },
  { bicim: 'json', etiket: 'JSON' },
  { bicim: 'insert', etiket: 'INSERT' },
];

const FEEDBACK_NAME: Record<CopyFormat, string> = {
  tsv: 'TSV',
  baslikliTsv: 'başlıklı TSV',
  csv: 'CSV',
  markdown: 'Markdown',
  json: 'JSON',
  insert: 'INSERT',
};

/** Kopyaladıktan sonraki kısa bilgi: "3 satır CSV olarak kopyalandı". */
export function copyFeedback(satir: number, bicim: CopyFormat): string {
  return `${satir} satır ${FEEDBACK_NAME[bicim]} olarak kopyalandı`;
}

/** INSERT dışındaki biçimlerin metni; INSERT tablo ve katalog ister (`insertStatements`). */
export function copyAs(bicim: Exclude<CopyFormat, 'insert'>, input: CopyInput): string {
  switch (bicim) {
    case 'tsv':
      return toTsv(input.satirlar);
    case 'baslikliTsv':
      return toTsvWithHeader(input.kolonlar, input.satirlar);
    case 'csv':
      return toCsv(input);
    case 'markdown':
      return toMarkdown(input);
    case 'json':
      return toJson(input);
  }
}

/** RFC 4180: başlık satırı, CRLF satır sonu; NULL boş alan, boş metin `""`. */
export function toCsv({ kolonlar, satirlar }: CopyInput): string {
  return [kolonlar.map(csvField), ...satirlar.map((row) => kolonlar.map((_, c) => csvField(row[c] ?? null)))].map((fields) => fields.join(',')).join('\r\n');
}

function csvField(value: string | null): string {
  if (value === null) return '';
  return value === '' || /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * GFM tablosu: başlık, ayırıcı (sayısal kolon `---:`) ve satırlar. NULL grid'deki gibi `NULL`;
 * `|` kaçışlanır, satır sonları `<br>` olur ki tablo bozulmasın.
 */
export function toMarkdown({ kolonlar, tipler, satirlar }: CopyInput): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const separator = kolonlar.map((_, c) => (columnAlignment(tipler?.[c]) === 'sag' ? '---:' : '---'));
  return [line(kolonlar.map(markdownCell)), line(separator), ...satirlar.map((row) => line(kolonlar.map((_, c) => markdownCell(row[c] ?? null))))].join('\n');
}

function markdownCell(value: string | null): string {
  if (value === null) return NULL_LABEL;
  return value.replaceAll('|', '\\|').replace(/\r\n|\r|\n/g, '<br>');
}

const BOOL = 16;
/** JSON sayısı olarak yazılan tipler: int2, int4, float4, float8. int8 ve numeric hassasiyet için metin kalır. */
const JSON_NUMBER_OIDS: ReadonlySet<number> = new Set([21, 23, 700, 701]);
/** json, jsonb: iç içe yazılır. */
const JSON_OIDS: ReadonlySet<number> = new Set([114, 3802]);

/**
 * Kolon adlarıyla nesne dizisi, iki boşluk girintili. NULL `null`; `bool` true/false; int2/int4/float
 * sayı (NaN, Infinity metin); `json`/`jsonb` iç içe; diğerleri metin. Yinelenen ad `ad_2`, `ad_3`
 * olur. Anahtarlar kolon sırasıyla yazılır (nesne, sayı gibi görünen anahtarı öne alırdı).
 */
export function toJson({ kolonlar, tipler, satirlar }: CopyInput): string {
  if (satirlar.length === 0) return '[]';
  const keys = uniqueKeys(kolonlar).map((k) => JSON.stringify(k));
  const objects = satirlar.map((row) => {
    const fields = keys.map((key, c) => `    ${key}: ${jsonValue(row[c] ?? null, tipler?.[c]).replaceAll('\n', '\n    ')}`);
    return `  {\n${fields.join(',\n')}\n  }`;
  });
  return `[\n${objects.join(',\n')}\n]`;
}

function uniqueKeys(kolonlar: readonly string[]): string[] {
  const used = new Set<string>();
  return kolonlar.map((ad) => {
    let key = ad;
    for (let n = 2; used.has(key); n++) key = `${ad}_${n}`;
    used.add(key);
    return key;
  });
}

function jsonValue(value: string | null, oid: number | undefined): string {
  if (value === null) return 'null';
  if (oid === BOOL && (value === 't' || value === 'f')) return value === 't' ? 'true' : 'false';
  if (oid !== undefined && JSON_NUMBER_OIDS.has(oid) && Number.isFinite(Number(value))) return JSON.stringify(Number(value));
  if (oid !== undefined && JSON_OIDS.has(oid)) {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      // Postgres'ten gelen json geçerlidir; yine de bozuksa metin yazılır.
    }
  }
  return JSON.stringify(value);
}
