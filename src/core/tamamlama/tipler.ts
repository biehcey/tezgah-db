/**
 * Tamamlama motorunun (ADR-0005) ortak tipleri. Giriş noktası `tamamla` (`./index`); bağlam
 * analizi `baglam.ts`, yuva kuralları `yuvalar.ts`, öneri üreticileri `ureticiler/`.
 */
import type { Catalog } from '../katalog';

/** CodeMirror `Completion.type`'ı: simge ve sınıf bundan. */
export type OneriTuru = 'keyword' | 'type' | 'property' | 'function' | 'namespace' | 'variable' | 'text';

export interface Oneri {
  /** Listede görünen ve CodeMirror'ın yazılanla eşleştirdiği metin. */
  etiket: string;
  tur: OneriTuru;
  detail?: string;
  info?: string;
  /** `from`–imleç (Enter) ya da `from`–`to` (Tab) aralığına yazılan metin. */
  eklenecek: string;
  /** Eklemeden sonra imlecin `eklenecek` içindeki konumu; yoksa sonu. */
  imlec?: number;
  /** Öncelik bandı (`oncelik.ts`); CodeMirror `boost`'una çevrilir. */
  oncelik: number;
}

export interface TamamlamaSonucu {
  /** Değiştirilecek kelimenin başı (kullanıcı `"` ile başladıysa tırnak dahil). */
  from: number;
  /** İmlecin sağındaki kelime kalanının sonu (Tab bu aralığı değiştirir). */
  to: number;
  oneriler: Oneri[];
}

/**
 * Tablo sekmesinin `WHERE` / `ORDER BY` kutusu: metin bu tablonun FROM'u içinde, bir ifade
 * yuvasında başlar.
 */
export interface OrtukTablo {
  sema: string;
  tablo: string;
  kutu: 'where' | 'orderBy';
}

export interface TamamlamaSecenekleri {
  /** Veritabanı seçiminde görünür şemalar; diğerleri hiçbir yuvada önerilmez. */
  gorunurSemalar: readonly string[];
  ortukTablo?: OrtukTablo;
}

// --- Bağlam (motorun içi; testler buna değil `tamamla`'ya bakar) ---

/**
 * Kapsamdaki bir ilişki (FROM/JOIN/UPDATE/INSERT INTO/DELETE FROM öğesi).
 * `kaynak`: katalog ilişkisi adayı; CTE ve alt sorgu (ticket 02) yeni türler ekler.
 */
export interface KapsamIliskisi {
  /** Yazıldığı gibi nitelik (`şema`), çözülmüş ad (çıplak ad küçük harfe katlanır). */
  sema: string | null;
  ad: string;
  /** Takma ad (çözülmüş); yoksa `null`. */
  takmaAd: string | null;
  kaynak: { tur: 'katalog' } | { tur: 'ortuk' };
}

/**
 * İmlecin yuvası: orada ne beklendiği.
 * - `iliski`: ilişki adı (FROM, JOIN, UPDATE, INSERT INTO, DELETE FROM, …)
 * - `ifade`: kolon/takma ad/fonksiyon içeren ifade (SELECT listesi, WHERE, ON, ORDER BY, …)
 * - `kolon`: yalnızca bir ilişkinin kolonları (`INSERT INTO t (`, `SET` sol tarafı)
 * - `tip`: yalnızca tipler (`::`, `CAST(… AS`, kolon tanımı; `yuvalar-ddl.ts`)
 * - `anahtar`: yalnızca anahtar kelimeler (tanınmayan DDL dahil: ilişki/kolon/fonksiyon yok)
 */
export type Yuva =
  | { tur: 'iliski' }
  | { tur: 'ifade' }
  | { tur: 'kolon'; iliski: KapsamIliskisi }
  | { tur: 'tip' }
  | { tur: 'anahtar' };

/** Bir parantez düzeyindeki simge: alt parantez grupları tek `grup` simgesine katlanır. */
export type DuzeySimgesi =
  | { tur: 'kelime'; deger: string; from: number; to: number }
  | { tur: 'ad'; deger: string; from: number; to: number }
  | { tur: 'sembol'; deger: string; from: number; to: number }
  | { tur: 'diger'; deger: string; from: number; to: number }
  | { tur: 'grup'; from: number; to: number; ic: Duzey };

/** Bir parantez düzeyi: ifadenin kendisi (kök) ya da bir `( … )` grubu. */
export interface Duzey {
  simgeler: DuzeySimgesi[];
  /** Grubun açan `(`'ının offset'i; kökte `-1`. */
  from: number;
  /** Bu düzey bir sorgu mu (`SELECT`/`WITH`/`VALUES`/… ile başlar ya da kök). */
  sorgu: boolean;
}

/** İmlecin düzeyinden köke bir halka. */
export interface ZincirHalkasi {
  duzey: Duzey;
  /** Bu düzeyde imleçten (dış halkalarda imleci içeren gruptan) önceki simgeler. */
  onceki: DuzeySimgesi[];
}

export interface Baglam {
  metin: string;
  imlec: number;
  /** Değiştirilecek kelime: `from`–`to`; `onek` = `from`–imleç arası (tırnak hariç). */
  from: number;
  to: number;
  onek: string;
  /** Kullanıcı adı `"` ile başlattı. */
  tirnakli: boolean;
  /** `x.` / `a.b.` niteleyicisi (çözülmüş adlar); yoksa `null`. */
  niteleyici: string[] | null;
  yuva: Yuva;
  /**
   * İmlecin düzeyinde, imleçten önceki simgeler (yazılan kelime ve niteleyici hariç). Anahtar
   * kelime ve JOIN kuralları (ticket 03, 06) buna bakar.
   */
  onceki: DuzeySimgesi[];
  /** İmlecin düzeyinden köke düzeyler (`zincir[0].onceki === onceki`). */
  zincir: ZincirHalkasi[];
  /** İçten dışa: imlecin sorgu kapsamının ve dış kapsamların ilişkileri (ilişkili alt sorgu). */
  kapsamlar: KapsamIliskisi[][];
  katalog: Catalog | null;
  secenekler: TamamlamaSecenekleri;
}

/** Öneri üreticisi: bağlama uyan önerileri döndürür, uymuyorsa boş dizi. */
export type Uretici = (b: Baglam) => Oneri[];
