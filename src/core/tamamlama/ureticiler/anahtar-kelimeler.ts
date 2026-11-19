/**
 * Anahtar kelimeler: bu ticket'ta düz bir liste, ifade ve anahtar yuvalarında. Bağlama göre
 * tablolar ticket 06'da `ANAHTAR_KELIMELER` yerine yuvaya / önceki kelimeye göre seçilir.
 */
import { ONCELIK } from '../oncelik';
import type { Baglam, Oneri, Uretici } from '../tipler';

export const ANAHTAR_KELIMELER: readonly string[] = [
  'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'SET', 'DELETE FROM', 'VALUES', 'WITH', 'AS', 'DISTINCT',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'USING',
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL', 'NULL', 'TRUE', 'FALSE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
  'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'RETURNING', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
];

/**
 * Anahtar kelimenin önekin harf durumunda yazımı: önek tamamen küçük harfse küçük, değilse
 * (boş önek dahil) BÜYÜK.
 */
export function harfDurumu(b: Pick<Baglam, 'onek'>, anahtar: string): string {
  return b.onek !== '' && b.onek === b.onek.toLowerCase() ? anahtar.toLowerCase() : anahtar.toUpperCase();
}

export function anahtarOnerisi(b: Baglam, anahtar: string): Oneri {
  const yazim = harfDurumu(b, anahtar);
  return { etiket: yazim, tur: 'keyword', eklenecek: yazim, oncelik: ONCELIK.ANAHTAR };
}

export const anahtarKelimeler: Uretici = (b) => {
  if (b.niteleyici || b.tirnakli || (b.yuva.tur !== 'ifade' && b.yuva.tur !== 'anahtar')) return [];
  return ANAHTAR_KELIMELER.map((k) => anahtarOnerisi(b, k));
};
