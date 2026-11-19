/** Tanımlayıcı adları: çıplak/tırnaklı yazım, etiket ve eklenecek metin. */
import { quoteIdent } from '../grid/sql';
import type { Baglam } from './tipler';

/** Postgres'in ayrılmış anahtar kelimeleri: tanımlayıcı olarak tırnak ister. */
export const RESERVED: ReadonlySet<string> = new Set(
  (
    'all analyse analyze and any array as asc asymmetric authorization binary both case cast check collate collation ' +
    'column concurrently constraint create cross current_catalog current_date current_role current_schema current_time ' +
    'current_timestamp current_user default deferrable desc distinct do else end except false fetch for foreign freeze ' +
    'from full grant group having ilike in initially inner intersect into is isnull join lateral leading left like limit ' +
    'localtime localtimestamp natural not notnull null offset on only or order outer overlaps placing primary references ' +
    'returning right select session_user similar some symmetric system_user table tablesample then to trailing true union ' +
    'unique user using variadic verbose when where window with'
  ).split(' '),
);

/** Çıplak yazılınca aynı adı veren tanımlayıcı mı (küçük harf, anahtar kelime değil). */
export function isBareIdent(name: string): boolean {
  return /^[a-z_][a-z0-9_$]*$/.test(name) && !RESERVED.has(name);
}

/** Tek parçanın SQL yazımı: gerekiyorsa (ya da `tirnak`) tırnaklı. */
export const identSql = (ad: string, tirnak = false) => (tirnak || !isBareIdent(ad) ? quoteIdent(ad) : ad);

/**
 * Nitelikli adın (`[şema, ad]` ya da `[ad]`) etiketi ve eklenecek metni. Kullanıcı `"` ile
 * başladıysa her parça tırnaklıdır (`"satis"."siparis"`) ve etiket eklenecekle aynıdır
 * (CodeMirror yazılan `"Mus`'u etiketle eşleştirir).
 */
export function adMetni(b: Pick<Baglam, 'tirnakli'>, parcalar: readonly string[]): { etiket: string; eklenecek: string } {
  const eklenecek = parcalar.map((p) => identSql(p, b.tirnakli)).join('.');
  return { etiket: b.tirnakli ? eklenecek : parcalar.join('.'), eklenecek };
}
