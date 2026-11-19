/**
 * Katalog sorgularına gömülen değerler. Sahte Postgres parametreli sorguya satır döndürmediğinden
 * adlar sorgu metnine gömülür.
 */

/** Metin literal'i, `standard_conforming_strings`'ten bağımsız: `E'…'` içinde ters bölü ve tek tırnak kaçışlanır. */
export const literal = (value: string) => `E'${value.replaceAll('\\', '\\\\').replaceAll("'", "''")}'`;

/** `IN ('a', 'b')`. */
export const inList = (values: readonly string[]) => `IN (${values.map(literal).join(', ')})`;
