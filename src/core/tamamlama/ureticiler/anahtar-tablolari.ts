/**
 * Anahtar kelime tabloları (spec "Anahtar kelimeler"): her bağlam için küçük sabit listeler.
 * Çok kelimeli gruplar (`ORDER BY`, `IS NOT NULL`) tek öğedir. Hangi tablonun seçileceği
 * `anahtar-kelimeler.ts`'de.
 */

/** İfade (deyim) başı. */
export const IFADE_BASI = [
  'SELECT', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'WITH', 'VALUES', 'TABLE',
  'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'COMMENT ON', 'GRANT', 'REVOKE',
  'EXPLAIN', 'CALL', 'BEGIN', 'COMMIT', 'ROLLBACK', 'VACUUM', 'ANALYZE', 'SHOW',
] as const;

/** Alt sorgu başı (`IN (|`, `EXISTS (|`, `FROM (|`). */
export const ALT_SORGU_BASI = ['SELECT', 'WITH', 'VALUES'] as const;

/**
 * İfadede terim beklenen yer (`WHERE |`, `a = |`, `AND |`). Parantezsiz SQL değer fonksiyonları
 * (`CURRENT_DATE`…) `pg_proc`'ta yoktur, anahtar kelimedir.
 */
export const TERIM = [
  'NOT', 'EXISTS', 'NULL', 'TRUE', 'FALSE', 'CASE',
  'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURRENT_TIME', 'LOCALTIMESTAMP', 'CURRENT_USER',
] as const;

/** İfadede terimden sonra (`WHERE a |`). */
export const OPERATOR = [
  'AND', 'OR', 'IS NULL', 'IS NOT NULL', 'IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN',
  'LIKE', 'NOT LIKE', 'ILIKE', 'NOT ILIKE', 'IS DISTINCT FROM', 'IS NOT DISTINCT FROM',
] as const;

/** Açık bir `CASE` içinde terimden sonra. */
export const CASE_ICI = ['WHEN', 'THEN', 'ELSE', 'END'] as const;

/** `SELECT |`. */
export const SELECT_BASI = ['DISTINCT', 'ALL'] as const;

/** SELECT listesinde terimden sonra (`SELECT a |`). */
export const SELECT_SONRASI = ['AS', 'FROM'] as const;

export const JOIN_TURLERI = ['JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN'] as const;

/** Sorgunun kalanını bağlayan yan cümleler (`UNION` vb.). */
const KUME = ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'] as const;

/** `FROM t |` / `JOIN t … |` sonrası. */
export const FROM_SONRASI = ['AS', 'WHERE', ...JOIN_TURLERI, 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', ...KUME] as const;

/** `JOIN t |` (ON koşulundan önce). */
export const JOIN_SONRASI = ['AS', 'ON', 'USING'] as const;

/** WHERE / ON / GROUP BY / HAVING ifadesinden sonra gelebilecek yan cümleler (SELECT'te). */
export const WHERE_SONRASI = ['GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', ...KUME] as const;
export const ON_SONRASI = ['WHERE', ...JOIN_TURLERI, 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', ...KUME] as const;
export const GROUP_BY_SONRASI = ['HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', ...KUME] as const;
export const HAVING_SONRASI = ['ORDER BY', 'LIMIT', 'OFFSET', ...KUME] as const;
export const ORDER_BY_SONRASI = ['LIMIT', 'OFFSET'] as const;

/** ORDER BY öğesinden sonra (`ORDER BY a |`; ORDER BY kutusu). */
export const SIRALAMA = ['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST'] as const;

/** DML'de ilişkiden sonra. */
export const INSERT_HEDEFI_SONRASI = ['VALUES', 'SELECT', 'DEFAULT VALUES'] as const;
export const UPDATE_HEDEFI_SONRASI = ['AS', 'SET'] as const;
export const DELETE_HEDEFI_SONRASI = ['AS', 'USING', 'WHERE', 'RETURNING'] as const;
/** UPDATE/DELETE'te WHERE ifadesinden sonra. */
export const DML_WHERE_SONRASI = ['RETURNING'] as const;
/** `UPDATE t SET a = 1 |`. */
export const SET_SONRASI = ['FROM', 'WHERE', 'RETURNING'] as const;
/** `INSERT … VALUES (…) |`. */
export const VALUES_SONRASI = ['ON CONFLICT', 'RETURNING'] as const;

/** Son kelimeye göre doğrudan devam (`ORDER |` → `BY`). Diğer tabloların yerine geçer. */
export const DEVAMLAR: Readonly<Record<string, readonly string[]>> = {
  ORDER: ['BY'],
  GROUP: ['BY'],
  PARTITION: ['BY'],
  INSERT: ['INTO'],
  DELETE: ['FROM'],
  NULLS: ['FIRST', 'LAST'],
  IS: ['NULL', 'NOT NULL', 'TRUE', 'FALSE', 'DISTINCT FROM', 'NOT DISTINCT FROM'],
  UNION: ['ALL', 'SELECT'],
  INTERSECT: ['SELECT'],
  EXCEPT: ['SELECT'],
  EXPLAIN: ['ANALYZE', ...IFADE_BASI.filter((k) => k !== 'EXPLAIN')],
  CREATE: [
    'TABLE', 'VIEW', 'MATERIALIZED VIEW', 'INDEX', 'UNIQUE INDEX', 'SCHEMA', 'SEQUENCE', 'FUNCTION',
    'PROCEDURE', 'TRIGGER', 'TYPE', 'EXTENSION', 'OR REPLACE',
  ],
  REPLACE: ['VIEW', 'FUNCTION', 'PROCEDURE', 'TRIGGER'],
  ALTER: ['TABLE', 'VIEW', 'MATERIALIZED VIEW', 'INDEX', 'SCHEMA', 'SEQUENCE', 'FUNCTION', 'PROCEDURE', 'TYPE'],
  DROP: [
    'TABLE', 'VIEW', 'MATERIALIZED VIEW', 'INDEX', 'SCHEMA', 'SEQUENCE', 'FUNCTION', 'PROCEDURE',
    'TRIGGER', 'TYPE', 'EXTENSION',
  ],
};

/** FROM yan cümlesinde, JOIN türünün ilk kelimesinden sonra (`LEFT |` → `JOIN`). */
export const JOIN_DEVAMLARI: Readonly<Record<string, readonly string[]>> = {
  LEFT: ['JOIN', 'OUTER JOIN'],
  RIGHT: ['JOIN', 'OUTER JOIN'],
  FULL: ['JOIN', 'OUTER JOIN'],
  INNER: ['JOIN'],
  CROSS: ['JOIN'],
  NATURAL: ['JOIN'],
};

/** Terimden sonra `NOT |` (`a NOT |`). */
export const OLUMSUZ_OPERATOR = ['IN', 'LIKE', 'ILIKE', 'BETWEEN'] as const;

/** Bağlam çıkarılamadığında: geniş liste (boş listeden iyidir). */
export const GENIS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'SET', 'DELETE FROM', 'VALUES', 'WITH', 'AS', 'DISTINCT',
  ...JOIN_TURLERI, 'ON', 'USING', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'IS NULL',
  'IS NOT NULL', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'GROUP BY', 'HAVING', 'ORDER BY',
  ...SIRALAMA, 'LIMIT', 'OFFSET', ...KUME, 'RETURNING', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'DEFAULT',
  'PRIMARY KEY', 'REFERENCES', 'NOT NULL', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'IF EXISTS', 'IF NOT EXISTS',
] as const;
