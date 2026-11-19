/**
 * İfadede terim mi operatör mü bekleniyor: yuva (`yuvalar.ts`, terim bitmişse `anahtar`) ve
 * anahtar kelime tabloları (`ureticiler/anahtar-kelimeler.ts`) aynı kuralı kullanır.
 */
import { kelime, sembol } from './simge';
import type { DuzeySimgesi } from './tipler';

/** Terimden önce gelen (ardından terim bekleyen) kelimeler. */
const TERIM_ONCESI = new Set([
  'SELECT', 'DISTINCT', 'ALL', 'WHERE', 'ON', 'HAVING', 'BY', 'SET', 'RETURNING', 'VALUES', 'LIMIT', 'OFFSET',
  'AND', 'OR', 'NOT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'IN', 'LIKE', 'ILIKE', 'BETWEEN', 'IS', 'EXISTS', 'ANY',
  'SOME', 'USING', 'FROM', 'JOIN', 'INTO', 'UPDATE', 'AS', 'WITH', 'SIMILAR', 'TO',
]);

/** Simgelerin sonunda terim bekleniyor mu (`WHERE |`, `a = |`) yoksa terim bitti mi (`WHERE a |`). */
export function terimBekleniyor(onceki: readonly DuzeySimgesi[]): boolean {
  const son = onceki.at(-1);
  if (!son) return true;
  if (son.tur === 'kelime') return TERIM_ONCESI.has(kelime(son)!);
  if (son.tur !== 'sembol') return false;
  if (/[0-9]/.test(son.deger)) return false;
  // `SELECT *`, `a, *`, `t.*` tamamlanmış terimdir; `a *` çarpmadır.
  if (son.deger === '*') {
    const once = onceki.at(-2);
    return !(once === undefined || kelime(once) === 'SELECT' || sembol(once, ',') || sembol(once, '.'));
  }
  return true;
}
