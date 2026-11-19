/**
 * Katalog önbelleği (GLOSSARY): bir hedefin görünür şemalarındaki ilişkiler, kolonları ve tipleri.
 * Sunucu okur ve tutar; arayüz bundan editör tamamlamasını (`tamamlama/`), tablo listesini ve tablo
 * aramasını kurar.
 */
import type { Statement } from './ifade-bolme';

/** `pg_class.relkind`: tablo, view, materialized view, bölümlü tablo, foreign tablo. */
export type RelationKind = 'r' | 'v' | 'm' | 'p' | 'f';
export const RELATION_KINDS: readonly RelationKind[] = ['r', 'v', 'm', 'p', 'f'];

export interface CatalogColumn {
  ad: string;
  /** `format_type(atttypid, atttypmod)`, ör. `character varying(20)`. */
  tip: string;
  tipOid: number;
  notNull: boolean;
  /** `atthasdef`: kolonun varsayılan ifadesi var. */
  varsayilan: boolean;
  /** `attgenerated`: üretilmiş kolon (yazılamaz). */
  uretilmis: boolean;
}

export interface CatalogRelation {
  sema: string;
  ad: string;
  tur: RelationKind;
  /** `attnum` sırasıyla. */
  kolonlar: CatalogColumn[];
  /** PK kolonları, indeks sırasıyla; PK yoksa boş. */
  pk: string[];
  /** `pg_class.reltuples`: tahmini satır sayısı; `-1` hiç analiz edilmedi. */
  reltuples: number;
}

/** `pg_proc.prokind`: fonksiyon, prosedür, aggregate, window. */
export type FunctionKind = 'f' | 'p' | 'a' | 'w';
export const FUNCTION_KINDS: readonly FunctionKind[] = ['f', 'p', 'a', 'w'];

/** Bir fonksiyonun bir aşırı yüklemesi (`pg_proc` satırı). */
export interface CatalogFunction {
  sema: string;
  ad: string;
  tur: FunctionKind;
  /** `pg_get_function_arguments`, ör. `a integer, b text DEFAULT ''::text`. */
  argumanlar: string;
  /** `pg_get_function_result`, ör. `SETOF integer`; prosedürde boş. */
  donus: string;
  /** `proretset`: set-returning (FROM'da kullanılabilir). */
  kumeDondurur: boolean;
  /** `obj_description(oid, 'pg_proc')`. */
  aciklama: string | null;
}

/** `GET …/katalog` yanıtı. */
export interface Catalog {
  /** `(current_schemas(false))[1]`: `search_path`'in ilk (var olan) şeması; yoksa `null`. */
  defaultSchema: string | null;
  /** Katalogun okunduğu görünür şemalar, sunucudaki sırayla. */
  semalar: string[];
  /** Şema, sonra ad sırasıyla. */
  iliskiler: CatalogRelation[];
  /** Görünür şemalar + `pg_catalog` tiplerinin OID → `format_type` adı. */
  tipler: Record<string, string>;
  /** Görünür şemalardaki kullanıcı tipleri (enum, domain, bileşik, aralık…), `format_type` adıyla. */
  kullaniciTipleri: string[];
  /**
   * Görünür şemalar + `pg_catalog` (iç kullanım tipli olanlar süzülmüş); şema, ad sırasıyla,
   * aşırı yükleme başına bir satır.
   */
  fonksiyonlar: CatalogFunction[];
  /** İki ucu da görünür şemalarda olan FK'ler; kaynak şema, ilişki, FK adı sırasıyla. */
  fkler: CatalogForeignKey[];
}

/** FK'nin bir ucu; `kolonlar` FK sırasıyla, öbür ucun `kolonlar`'ıyla eşleşik. */
export interface CatalogForeignKeyEnd {
  sema: string;
  ad: string;
  kolonlar: string[];
}

/** `pg_constraint` (`contype = 'f'`): `kaynak` referans veren, `hedef` referans verilen ilişki. */
export interface CatalogForeignKey {
  ad: string;
  kaynak: CatalogForeignKeyEnd;
  hedef: CatalogForeignKeyEnd;
}

/** Katalogun tip eşlemesi; "INSERT olarak kopyala" OID'leri bununla çözer. */
export function typeMap(catalog: Catalog): Map<number, string> {
  return new Map(Object.entries(catalog.tipler).map(([oid, ad]) => [Number(oid), ad]));
}

// --- Tablo araması ---

/**
 * Tablo listesi ve Cmd/Ctrl+K tablo araması: görünür şemaların ilişkileri, büyük/küçük harf
 * duyarsız alt dize ("şema.ad" biçimi de eşleşir). Adı sorguyla başlayanlar önce; sonra şema, ad.
 */
export function searchTables(catalog: Catalog, visibleSchemas: readonly string[], query: string): CatalogRelation[] {
  const q = query.trim().toLowerCase();
  const visible = new Set(visibleSchemas);
  const scored: { r: CatalogRelation; prefix: boolean }[] = [];
  for (const r of catalog.iliskiler) {
    if (!visible.has(r.sema)) continue;
    const ad = r.ad.toLowerCase();
    if (q === '' || ad.includes(q) || `${r.sema.toLowerCase()}.${ad}`.includes(q)) {
      scored.push({ r, prefix: q !== '' && (ad.startsWith(q) || `${r.sema.toLowerCase()}.${ad}`.startsWith(q)) });
    }
  }
  const byName = (a: CatalogRelation, b: CatalogRelation) => compare(a.sema, b.sema) || compare(a.ad, b.ad);
  return scored.sort((a, b) => Number(b.prefix) - Number(a.prefix) || byName(a.r, b.r)).map((s) => s.r);
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// --- DDL sonrası yenileme ---

const CATALOG_VERBS = new Set(['CREATE', 'ALTER', 'DROP', 'IMPORT']);

/** Script katalogu değiştirebilen bir ifade içeriyor mu (DDL ya da `SELECT … INTO`). */
export function changesCatalog(statements: readonly Statement[]): boolean {
  return statements.some((s) => {
    const verb = s.keywords[0];
    if (verb === undefined) return false;
    return CATALOG_VERBS.has(verb) || (verb === 'SELECT' && s.words.includes('INTO'));
  });
}

// --- Okuma ---

/** Katalog sorgularının satırları; tüm değerler metin olarak gelir (bkz. sunucunun `RAW_TYPES`'ı). */
export interface CatalogRows {
  /** Görünür şemalar, sunucudaki sırayla. */
  semalar: readonly string[];
  defaultSchema: string | null;
  /** İlişki başına en az bir satır; kolonu olmayan ilişkide kolon alanları `null`. */
  iliskiler: readonly Record<string, string | null>[];
  tipler: readonly Record<string, string | null>[];
  fonksiyonlar: readonly Record<string, string | null>[];
  /** FK kolon çifti başına bir satır (`sira`: FK içindeki 1 tabanlı sıra). */
  fkler: readonly Record<string, string | null>[];
}

/** Postgres'in `bool` metni (`t` ya da `::text` ile `true`). */
export const pgBool = (v: string | null | undefined) => v === 't' || v === 'true';

/** İlişkinin (şema, ad) çiftinden tekil `Map` anahtarı. */
export const iliskiAnahtari = (sema: string, ad: string) => `${sema}\u0000${ad}`;

/**
 * Sorgu satırlarından katalog: kolon satırları ilişkilerine toplanır, PK kolonları indeks sırasına
 * dizilir. Tanınmayan `relkind` atlanır.
 */
export function buildCatalog({ semalar, defaultSchema, iliskiler, tipler, fonksiyonlar, fkler }: CatalogRows): Catalog {
  const relations = new Map<string, CatalogRelation & { pkSira: { ad: string; sira: number }[] }>();
  for (const row of iliskiler) {
    const tur = row.tur as RelationKind;
    if (!RELATION_KINDS.includes(tur) || row.sema == null || row.ad == null) continue;
    const key = iliskiAnahtari(row.sema, row.ad);
    let r = relations.get(key);
    if (!r) {
      const reltuples = Number(row.satir);
      r = { sema: row.sema, ad: row.ad, tur, kolonlar: [], pk: [], reltuples: Number.isFinite(reltuples) ? reltuples : -1, pkSira: [] };
      relations.set(key, r);
    }
    if (row.kolon == null) continue;
    r.kolonlar.push({
      ad: row.kolon,
      tip: row.tip ?? '',
      tipOid: Number(row.tip_oid),
      notNull: pgBool(row.not_null),
      varsayilan: pgBool(row.varsayilan),
      // `attgenerated`: boş dize değilse üretilmiş (`s` stored, PG18'de `v` virtual).
      uretilmis: (row.uretilmis ?? '') !== '',
    });
    if (row.pk_sira != null) r.pkSira.push({ ad: row.kolon, sira: Number(row.pk_sira) });
  }
  const list = [...relations.values()].map(({ pkSira, ...r }) => ({ ...r, pk: pkSira.sort((a, b) => a.sira - b.sira).map((p) => p.ad) }));
  list.sort((a, b) => compare(a.sema, b.sema) || compare(a.ad, b.ad));
  const typeNames: Record<string, string> = {};
  const userTypes: string[] = [];
  for (const row of tipler) {
    if (row.oid == null || row.ad == null) continue;
    typeNames[row.oid] = row.ad;
    if (pgBool(row.kullanici)) userTypes.push(row.ad);
  }
  return {
    defaultSchema,
    semalar: [...semalar],
    iliskiler: list,
    tipler: typeNames,
    kullaniciTipleri: userTypes.sort(compare),
    fonksiyonlar: buildFunctions(fonksiyonlar),
    fkler: buildForeignKeys(fkler),
  };
}

/** Fonksiyon satırları; tanınmayan `prokind` ya da adsız satır atlanır. Aşırı yüklemeler okunduğu sırada kalır. */
function buildFunctions(rows: CatalogRows['fonksiyonlar']): CatalogFunction[] {
  const list: CatalogFunction[] = [];
  for (const row of rows) {
    const tur = row.tur as FunctionKind;
    if (!FUNCTION_KINDS.includes(tur) || row.sema == null || row.ad == null) continue;
    list.push({
      sema: row.sema,
      ad: row.ad,
      tur,
      argumanlar: row.argumanlar ?? '',
      donus: row.donus ?? '',
      kumeDondurur: pgBool(row.kume),
      aciklama: row.aciklama ?? null,
    });
  }
  return list.sort((a, b) => compare(a.sema, b.sema) || compare(a.ad, b.ad));
}

const FK_FIELDS = ['ad', 'kaynak_sema', 'kaynak_ad', 'hedef_sema', 'hedef_ad', 'kaynak_kolon', 'hedef_kolon', 'sira'] as const;

/** FK kolon satırlarını FK başına toplar (anahtar: kaynak şema, ilişki, FK adı); eksik alanlı satır atlanır. */
function buildForeignKeys(rows: CatalogRows['fkler']): CatalogForeignKey[] {
  const fks = new Map<string, { fk: CatalogForeignKey; pairs: { sira: number; kaynak: string; hedef: string }[] }>();
  for (const row of rows) {
    if (FK_FIELDS.some((f) => row[f] == null)) continue;
    const r = row as Record<(typeof FK_FIELDS)[number], string>;
    const key = `${iliskiAnahtari(r.kaynak_sema, r.kaynak_ad)}\u0000${r.ad}`;
    let entry = fks.get(key);
    if (!entry) {
      entry = {
        fk: { ad: r.ad, kaynak: { sema: r.kaynak_sema, ad: r.kaynak_ad, kolonlar: [] }, hedef: { sema: r.hedef_sema, ad: r.hedef_ad, kolonlar: [] } },
        pairs: [],
      };
      fks.set(key, entry);
    }
    entry.pairs.push({ sira: Number(r.sira), kaynak: r.kaynak_kolon, hedef: r.hedef_kolon });
  }
  const list = [...fks.values()].map(({ fk, pairs }) => {
    pairs.sort((a, b) => a.sira - b.sira);
    return { ...fk, kaynak: { ...fk.kaynak, kolonlar: pairs.map((p) => p.kaynak) }, hedef: { ...fk.hedef, kolonlar: pairs.map((p) => p.hedef) } };
  });
  return list.sort((a, b) => compare(a.kaynak.sema, b.kaynak.sema) || compare(a.kaynak.ad, b.kaynak.ad) || compare(a.ad, b.ad));
}
