/**
 * Script'i ifadelere bölen küçük SQL lexer'ı (wayfinder 05). Yalnızca sınırları bulur; yazımı bozuk
 * bir ifade bölmeyi engellemez. Tanınanlar: `--` ve iç içe `/* *\/` yorumlar, `'…'`, `E'…'`,
 * `U&'…'`, `$tag$…$tag$`, `"ident"` ve psql `\` meta komutları.
 */

export interface Statement {
  /** İlk anlamlı karakterin (yorum ve boşluk değil) betikteki offset'i. */
  start: number;
  /** Son anlamlı karakterden sonraki offset (`;` ve sondaki yorum hariç). */
  end: number;
  /** `script.slice(start, end)`; sunucuya bu metin gönderilir. */
  text: string;
  /** Baştaki çıplak kelimeler, büyük harfle; ilk kelime olmayan simgede durur (en fazla 8). */
  keywords: string[];
  /** İfadedeki tüm çıplak kelimeler, büyük harfle (dizge, yorum, tırnaklı ad ve dollar-quote dışı). */
  words: string[];
  /** psql `\` meta komutu (satır sonuna kadar sürer). */
  meta: boolean;
  /**
   * Hemen ardından `(` gelen adlar, geçiş sırasıyla (fonksiyon çağrısı adayları): çıplak ad küçük
   * harfe katlanır, tırnaklı ad olduğu gibi kalır. `IN (`, `CAST(` gibi anahtar kelimeler de girer.
   */
  calls: string[];
}

const MAX_KEYWORDS = 8;
/** Çıplak kelimenin ilk ve sonraki karakterleri (Postgres tanıtıcı kuralları). */
export const WORD_START = /[A-Za-z_\u0080-￿]/;
export const WORD_CHAR = /[A-Za-z0-9_$\u0080-￿]/;
const DOLLAR_TAG = /^\$([A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/;

/**
 * Lexer'ın simgesi. Boşluk simge değildir; yorumlar simgedir (bölücü onları atlar, tamamlama
 * imlecin yorumda olup olmadığını onlardan bilir).
 * - `kelime`: çıplak kelime (`deger` olduğu gibi)
 * - `ad`: `"tırnaklı ad"` (`deger` kaçışı çözülmüş ad)
 * - `dizge`: `'…'`, `E'…'`, `U&'…'`, `U&"…"`, `$tag$…$tag$`
 * - `parametre`: `$1`
 * - `yorum`: `--` ya da `/* *\/`
 * - `meta`: psql `\` meta komutu (sondaki boşluk hariç satır sonuna kadar)
 * - `sembol`: diğer tek karakterler (rakamlar dahil)
 */
export interface Token {
  tur: 'kelime' | 'ad' | 'dizge' | 'parametre' | 'yorum' | 'meta' | 'sembol';
  from: number;
  to: number;
  /** Tırnak, dizge ya da blok yorum kapandı mı (diğerlerinde `true`). */
  kapali: boolean;
  /** `kelime` ve `ad` için ad; diğerlerinde kaynak metin. */
  deger: string;
}

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v';

/** Script'in simgeleri, sırayla. */
export function lex(script: string): Token[] {
  const tokens: Token[] = [];
  const n = script.length;
  const push = (tur: Token['tur'], from: number, to: number, kapali = true, deger = script.slice(from, to)) => {
    tokens.push({ tur, from, to, kapali, deger });
  };

  let i = 0;
  while (i < n) {
    const c = script[i]!;
    const next = script[i + 1];

    if (isSpace(c)) {
      i++;
    } else if (c === '-' && next === '-') {
      const nl = script.indexOf('\n', i);
      const to = nl === -1 ? n : nl;
      push('yorum', i, to);
      i = to;
    } else if (c === '/' && next === '*') {
      const to = skipBlockComment(script, i);
      push('yorum', i, to === -1 ? n : to, to !== -1);
      i = to === -1 ? n : to;
    } else if (c === '\\') {
      const nl = script.indexOf('\n', i);
      const lineEnd = nl === -1 ? n : nl;
      push('meta', i, i + script.slice(i, lineEnd).trimEnd().length);
      i = lineEnd;
    } else if (c === "'") {
      const to = skipQuoted(script, i, "'", false);
      push('dizge', i, to === -1 ? n : to, to !== -1);
      i = to === -1 ? n : to;
    } else if (c === '"') {
      const to = skipQuoted(script, i, '"', false);
      const end = to === -1 ? n : to;
      push('ad', i, end, to !== -1, script.slice(i + 1, to === -1 ? n : to - 1).replaceAll('""', '"'));
      i = end;
    } else if (c === '$') {
      const tag = DOLLAR_TAG.exec(script.slice(i, i + 64))?.[0];
      if (tag) {
        const close = script.indexOf(tag, i + tag.length);
        const to = close === -1 ? n : close + tag.length;
        push('dizge', i, to, close !== -1);
        i = to;
      } else {
        // `$1` gibi konumsal parametre.
        let to = i + 1;
        while (to < n && /[0-9]/.test(script[to]!)) to++;
        push('parametre', i, to);
        i = to;
      }
    } else if (WORD_START.test(c)) {
      let to = i + 1;
      while (to < n && WORD_CHAR.test(script[to]!)) to++;
      const word = script.slice(i, to);
      const after = script[to];
      if (after === "'" && (word === 'E' || word === 'e')) {
        const close = skipQuoted(script, to, "'", true);
        push('dizge', i, close === -1 ? n : close, close !== -1);
        i = close === -1 ? n : close;
      } else if ((word === 'U' || word === 'u') && after === '&' && (script[to + 1] === "'" || script[to + 1] === '"')) {
        const close = skipQuoted(script, to + 1, script[to + 1]!, false);
        push('dizge', i, close === -1 ? n : close, close !== -1);
        i = close === -1 ? n : close;
      } else {
        push('kelime', i, to);
        i = to;
      }
    } else {
      push('sembol', i, i + 1);
      i++;
    }
  }
  return tokens;
}

export function splitStatements(script: string): Statement[] {
  const statements: Statement[] = [];
  const n = script.length;
  let start = -1;
  let end = -1;
  let keywords: string[] = [];
  let words: string[] = [];
  let calls: string[] = [];
  /** Son simge bir addı (çıplak ya da tırnaklı): ardından `(` gelirse çağrıdır. */
  let lastName: string | null = null;
  /** Kelime dizisi bir kelime olmayan simgeyle kesildi mi. */
  let keywordsClosed = false;

  const finish = () => {
    if (start !== -1) statements.push({ start, end, text: script.slice(start, end), keywords, words, meta: false, calls });
    start = -1;
    end = -1;
    keywords = [];
    words = [];
    calls = [];
    lastName = null;
    keywordsClosed = false;
  };
  /** Anlamlı simge; ifadeyi başlatır ya da uzatır. */
  const token = (t: Token) => {
    if (start === -1) start = t.from;
    end = t.to;
    if (t.deger === '(' && t.tur === 'sembol' && lastName !== null) calls.push(lastName);
    const word = t.tur === 'kelime' ? t.deger : undefined;
    lastName = t.tur === 'ad' ? t.deger : word !== undefined ? word.toLowerCase() : null;
    if (word !== undefined) words.push(word.toUpperCase());
    if (keywordsClosed) return;
    if (word !== undefined && keywords.length < MAX_KEYWORDS) keywords.push(word.toUpperCase());
    else keywordsClosed = true;
  };

  for (const t of lex(script)) {
    if (t.tur === 'yorum') {
      // Kapanmamış yorum ifadede kalır ki Postgres nedenini söylesin.
      if (!t.kapali && start !== -1) end = n;
    } else if (t.tur === 'sembol' && t.deger === ';') {
      finish();
    } else if (t.tur === 'meta') {
      // psql meta komutu: önceki ifadeyi bitirir ve satır sonuna kadar sürer.
      finish();
      statements.push({ start: t.from, end: t.to, text: t.deger, keywords: [], words: [], meta: true, calls: [] });
    } else token(t);
  }
  finish();
  return statements;
}

/** `open` offset'indeki tırnağın kapanışından sonraki offset; kapanmazsa `-1`. */
function skipQuoted(script: string, open: number, quote: string, backslashEscapes: boolean): number {
  let i = open + 1;
  while (i < script.length) {
    const c = script[i]!;
    if (backslashEscapes && c === '\\') {
      i += 2;
    } else if (c === quote) {
      // Çift tırnak kaçıştır.
      if (script[i + 1] === quote) i += 2;
      else return i + 1;
    } else i++;
  }
  return -1;
}

/** İç içe olabilen `/* *\/` yorumunun kapanışından sonraki offset; kapanmazsa `-1`. */
export function skipBlockComment(script: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < script.length) {
    if (script[i] === '/' && script[i + 1] === '*') {
      depth++;
      i += 2;
    } else if (script[i] === '*' && script[i + 1] === '/') {
      depth--;
      i += 2;
      if (depth === 0) return i;
    } else i++;
  }
  return -1;
}

/** Betikteki offset'in 1 tabanlı satır ve sütunu. */
export function positionOf(script: string, offset: number): { satir: number; sutun: number } {
  let satir = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < script.length; i++) {
    if (script[i] === '\n') {
      satir++;
      lineStart = i + 1;
    }
  }
  return { satir, sutun: offset - lineStart + 1 };
}
