/**
 * Anahtar kelimeler (spec "Anahtar kelimeler"): ifade ve anahtar yuvalarında, imlecin yan
 * cümlesine (son yan cümle kelimesi), terim mi operatör mü beklendiğine ve son kelimeye göre
 * `anahtar-tablolari.ts`'deki küçük tablolardan biri. Çok kelimeli gruplar tek öneridir.
 */
import { ONCELIK } from '../oncelik';
import { kelime, sembol } from '../simge';
import type { Baglam, DuzeySimgesi, Oneri, Uretici } from '../tipler';
import * as T from './anahtar-tablolari';

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

type YanCumle =
  | 'select' | 'from' | 'join' | 'on' | 'where' | 'groupBy' | 'orderBy' | 'having' | 'limit' | 'offset'
  | 'insert' | 'values' | 'update' | 'set' | 'delete' | 'returning' | 'with';

interface BulunanYanCumle {
  tur: YanCumle;
  /** Yan cümle kelimesinden imlece kadarki simgeler (bulunduğu düzeyde). */
  sonra: readonly DuzeySimgesi[];
  /** İmlecin kendi sorgu düzeyinde mi: sonraki yan cümleler (`ORDER BY`, `LIMIT`…) yalnızca burada önerilir. */
  sorguda: boolean;
  /** Bulunduğu düzeyin ilk kelimesi (`SELECT`, `UPDATE`, `DELETE`…). */
  deyim: string | null;
}

/** `onceki[j]` bir yan cümle başlatıyorsa türü. */
function yanCumleTuru(onceki: readonly DuzeySimgesi[], j: number): YanCumle | null {
  const k = kelime(onceki[j]);
  const once = kelime(onceki[j - 1]);
  switch (k) {
    case 'SELECT': return 'select';
    case 'FROM': return once === 'DISTINCT' ? null : once === 'DELETE' ? 'delete' : 'from';
    case 'USING': return 'from';
    case 'JOIN': return 'join';
    case 'ON': return 'on';
    case 'WHERE': return 'where';
    case 'BY': return once === 'ORDER' ? 'orderBy' : 'groupBy';
    case 'HAVING': return 'having';
    case 'LIMIT': return 'limit';
    case 'OFFSET': return 'offset';
    case 'INTO': return once === 'INSERT' ? 'insert' : null;
    case 'VALUES': return 'values';
    case 'UPDATE': return 'update';
    case 'SET': return 'set';
    case 'RETURNING': return 'returning';
    case 'WITH': return 'with';
    default: return null;
  }
}

/**
 * İmlecin yan cümlesi: imlecin düzeyinde son yan cümle kelimesi; sorgu olmayan grupta (`f(|`,
 * `IN (|`) dış düzeye çıkılır. Sorgu düzeyinde yan cümle yoksa `null`.
 */
function yanCumleBul({ zincir }: Baglam): BulunanYanCumle | null {
  for (const [i, { duzey, onceki }] of zincir.entries()) {
    for (let j = onceki.length - 1; j >= 0; j--) {
      const tur = yanCumleTuru(onceki, j);
      if (tur) return { tur, sonra: onceki.slice(j + 1), sorguda: i === 0 && duzey.sorgu, deyim: kelime(duzey.simgeler[0]) };
    }
    if (duzey.sorgu) return null;
  }
  return null;
}

/** Terimden önce gelen (ardından terim bekleyen) kelimeler. */
const TERIM_ONCESI = new Set([
  'SELECT', 'DISTINCT', 'ALL', 'WHERE', 'ON', 'HAVING', 'BY', 'SET', 'RETURNING', 'VALUES', 'LIMIT', 'OFFSET',
  'AND', 'OR', 'NOT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'IN', 'LIKE', 'ILIKE', 'BETWEEN', 'IS', 'EXISTS', 'ANY',
  'SOME', 'USING', 'FROM', 'JOIN', 'INTO', 'UPDATE', 'AS', 'WITH', 'SIMILAR', 'TO',
]);

/** Simgelerin sonunda terim bekleniyor mu (`WHERE |`, `a = |`) yoksa terim bitti mi (`WHERE a |`). */
function terimBekleniyor(onceki: readonly DuzeySimgesi[]): boolean {
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

/** Açık (`END`'i gelmemiş) bir `CASE` içinde mi. */
function caseIcinde(onceki: readonly DuzeySimgesi[]): boolean {
  let derinlik = 0;
  for (const s of onceki) {
    const k = kelime(s);
    if (k === 'CASE') derinlik++;
    else if (k === 'END' && derinlik > 0) derinlik--;
  }
  return derinlik > 0;
}

/** Grup başında (`IN (|`, `EXISTS (|`) alt sorgu başlayabilir mi; fonksiyon çağrısı (`f(|`) değil. */
const ALT_SORGU_ONCESI = new Set(['IN', 'EXISTS', 'ANY', 'ALL', 'SOME', 'FROM', 'JOIN', 'AS', 'LATERAL', 'USING']);
function altSorguBasi({ zincir, onceki }: Baglam): boolean {
  const [ic, ust] = zincir;
  if (!ic || !ust || ic.duzey.sorgu || onceki.length > 0) return false;
  const p = ust.onceki.at(-1);
  if (!p) return true;
  if (p.tur === 'kelime') return ALT_SORGU_ONCESI.has(kelime(p)!);
  return p.tur === 'sembol';
}

/** İfade yan cümlesinde terimden sonra gelebilecek yan cümleler. */
function ifadeSonrasi(yc: BulunanYanCumle): readonly string[] {
  if (!yc.sorguda) return [];
  const dml = yc.deyim === 'UPDATE' || yc.deyim === 'DELETE';
  switch (yc.tur) {
    case 'on': return T.ON_SONRASI;
    case 'where': return dml ? T.DML_WHERE_SONRASI : T.WHERE_SONRASI;
    case 'having': return T.HAVING_SONRASI;
    case 'set': return T.SET_SONRASI;
    case 'returning': return ['AS'];
    case 'values': return T.VALUES_SONRASI;
    default: return [];
  }
}

/** Yan cümle bulunmuşken bağlamın tablosu. */
function yanCumleTablosu(b: Baglam, yc: BulunanYanCumle): readonly string[] {
  const { onceki } = b;
  const son = onceki.at(-1);
  const sonKelime = kelime(son);
  const terim = terimBekleniyor(onceki);
  const yeniOge = yc.sonra.length === 0 || sembol(son, ',');
  const sorguda = (liste: readonly string[]) => (yc.sorguda ? liste : []);

  if ((yc.tur === 'from' || yc.tur === 'join' || yc.tur === 'on') && sonKelime && T.JOIN_DEVAMLARI[sonKelime]) {
    return T.JOIN_DEVAMLARI[sonKelime];
  }
  switch (yc.tur) {
    case 'from': return yeniOge ? [] : sorguda(T.FROM_SONRASI);
    case 'join': return yeniOge ? [] : [...T.JOIN_SONRASI, ...sorguda(T.FROM_SONRASI)];
    case 'insert': return yeniOge ? [] : T.INSERT_HEDEFI_SONRASI;
    case 'update': return yeniOge ? [] : T.UPDATE_HEDEFI_SONRASI;
    case 'delete': return yeniOge ? [] : T.DELETE_HEDEFI_SONRASI;
    case 'with':
      if (yc.sonra.length === 0) return ['RECURSIVE'];
      if (son?.tur === 'grup') return ['SELECT', 'INSERT INTO', 'UPDATE', 'DELETE FROM'];
      return sembol(son, ',') || sonKelime === 'RECURSIVE' ? [] : ['AS'];
    case 'groupBy': return terim ? [] : yc.sorguda ? T.GROUP_BY_SONRASI : ['ORDER BY'];
    case 'orderBy': {
      if (terim) return [];
      const sonrasi = sorguda(T.ORDER_BY_SONRASI);
      if (sonKelime === 'FIRST' || sonKelime === 'LAST') return sonrasi;
      if (sonKelime === 'ASC' || sonKelime === 'DESC') return ['NULLS FIRST', 'NULLS LAST', ...sonrasi];
      return [...T.SIRALAMA, ...sonrasi];
    }
    case 'limit': return terim ? [] : ['OFFSET'];
    case 'offset': return terim ? [] : ['LIMIT'];
    case 'select':
      if (terim) return sonKelime === 'SELECT' ? [...T.SELECT_BASI, ...T.TERIM] : T.TERIM;
      return [...T.SELECT_SONRASI, ...T.OPERATOR];
    case 'on':
    case 'where':
    case 'having':
    case 'set':
    case 'returning':
    case 'values':
      if (terim) return yc.tur === 'set' || yc.tur === 'values' ? [...T.TERIM, 'DEFAULT'] : T.TERIM;
      return [...T.OPERATOR, ...ifadeSonrasi(yc)];
  }
}

/** Bağlamın anahtar kelimeleri (BÜYÜK harfle, tekrarsız). */
function bagliAnahtarlar(b: Baglam): readonly string[] {
  const { onceki } = b;
  const son = kelime(onceki.at(-1));
  if (son === 'AS') return []; // takma ad yazılıyor
  if (son === 'NOT' && kelime(onceki.at(-2)) === 'IS') return ['NULL', 'TRUE', 'FALSE', 'DISTINCT FROM'];
  if (son === 'NOT' && onceki.length > 1 && !terimBekleniyor(onceki.slice(0, -1))) return T.OLUMSUZ_OPERATOR;
  if (son && T.DEVAMLAR[son]) return T.DEVAMLAR[son];

  const altSorgu = altSorguBasi(b) ? T.ALT_SORGU_BASI : [];
  const kutu = b.secenekler.ortukTablo?.kutu;
  const yc: BulunanYanCumle | null =
    yanCumleBul(b) ?? (kutu ? { tur: kutu === 'where' ? 'where' : 'orderBy', sonra: onceki, sorguda: false, deyim: null } : null);
  if (!yc) {
    if (onceki.length === 0 && b.zincir.length === 1) return T.IFADE_BASI;
    return altSorgu.length > 0 ? altSorgu : T.GENIS;
  }
  let liste = yanCumleTablosu(b, yc);
  if (caseIcinde(onceki)) {
    if (son === 'CASE') liste = ['WHEN', ...T.TERIM];
    else if (!terimBekleniyor(onceki)) liste = [...T.OPERATOR, ...T.CASE_ICI];
  }
  return [...altSorgu, ...liste];
}

export const anahtarKelimeler: Uretici = (b) => {
  if (b.niteleyici || b.tirnakli || (b.yuva.tur !== 'ifade' && b.yuva.tur !== 'anahtar')) return [];
  return [...new Set(bagliAnahtarlar(b))].map((k) => anahtarOnerisi(b, k));
};
