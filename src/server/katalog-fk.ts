/**
 * Katalog okumasının FK sorgusu (`buildCatalog`'un `fkler` satırları): FK kolon çifti başına bir
 * satır, `conkey`/`confkey` sırasıyla (`sira`). İki ucun şeması da görünür şemalarda olmalı.
 * Bölümlerdeki türetilmiş FK'ler (`conparentid <> 0`) atlanır: FK bölümlü tablodaki tanımıyla gelir.
 */
import { inList } from './sql-listesi';

/** `schemas`: görünür şemalar (boş olmamalı: `IN ()` geçersizdir). */
export const foreignKeysSql = (schemas: readonly string[]) => `SELECT con.conname AS ad,
    kn.nspname AS kaynak_sema, kc.relname AS kaynak_ad, hn.nspname AS hedef_sema, hc.relname AS hedef_ad,
    ka.attname AS kaynak_kolon, ha.attname AS hedef_kolon, k.sira::text AS sira
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class kc ON kc.oid = con.conrelid
  JOIN pg_catalog.pg_namespace kn ON kn.oid = kc.relnamespace
  JOIN pg_catalog.pg_class hc ON hc.oid = con.confrelid
  JOIN pg_catalog.pg_namespace hn ON hn.oid = hc.relnamespace
  CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(kaynak, hedef, sira)
  JOIN pg_catalog.pg_attribute ka ON ka.attrelid = con.conrelid AND ka.attnum = k.kaynak
  JOIN pg_catalog.pg_attribute ha ON ha.attrelid = con.confrelid AND ha.attnum = k.hedef
  WHERE con.contype = 'f' AND con.conparentid = 0 AND kn.nspname ${inList(schemas)} AND hn.nspname ${inList(schemas)}
  ORDER BY kn.nspname, kc.relname, con.conname, k.sira`;
