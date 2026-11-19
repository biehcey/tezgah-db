/**
 * Fonksiyonlar: ifade yuvasında prosedür dışındakiler, `FROM`/`JOIN` sonrasında yalnızca
 * set-returning olanlar, `CALL` sonrasında yalnızca prosedürler. Ad başına tek öneri (aşırı
 * yüklemeler `detail`'de `+N`, `info`'da tümü); `ad()` eklenir, imleç parantezin içine konur.
 */
import type { CatalogFunction } from '../../katalog';
import { adMetni } from '../adlar';
import { katalogaBagli, varsayilanSemada } from '../dizin';
import { kapsamdaMi } from '../kapsam';
import { ONCELIK } from '../oncelik';
import { kelime } from '../simge';
import type { Baglam, Oneri, Uretici } from '../tipler';
import { sonYanCumle } from '../yuvalar';
import { harfDurumu } from './anahtar-kelimeler';

/** Öneksiz yazılan, her zaman aranan şema. */
const PG_CATALOG = 'pg_catalog';

/** Şema → ad → aşırı yüklemeler (katalog sırasıyla). */
const fonksiyonDizini = katalogaBagli((katalog) => {
  const semayla = new Map<string, Map<string, CatalogFunction[]>>();
  for (const f of katalog.fonksiyonlar) {
    let adla = semayla.get(f.sema);
    if (!adla) semayla.set(f.sema, (adla = new Map()));
    const liste = adla.get(f.ad);
    if (liste) liste.push(f);
    else adla.set(f.ad, [f]);
  }
  return semayla;
});

type Suzgec = (f: CatalogFunction) => boolean;

/** Yuvaya göre hangi fonksiyonlar; bu yuvada fonksiyon yoksa `null`. */
function suzgec(b: Baglam): Suzgec | null {
  switch (b.yuva.tur) {
    case 'ifade':
      return (f) => f.tur !== 'p';
    case 'cagri':
      return (f) => f.tur === 'p';
    case 'iliski':
      return fromYaDaJoin(b) ? (f) => f.kumeDondurur : null;
    default:
      return null;
  }
}

/** İlişki yuvası `FROM` (DELETE FROM değil) ya da `JOIN`'den mi (UPDATE / INSERT INTO / DDL değil). */
function fromYaDaJoin({ onceki }: Baglam): boolean {
  const i = sonYanCumle(onceki);
  const yanCumle = kelime(onceki[i]);
  return yanCumle === 'JOIN' || (yanCumle === 'FROM' && kelime(onceki[i - 1]) !== 'DELETE');
}

const imza = (f: CatalogFunction) => `(${f.argumanlar})${f.donus ? ` → ${f.donus}` : ''}`;

function fonksiyonOnerisi(b: Baglam, parcalar: string[], imzalar: CatalogFunction[], oncelik: number): Oneri {
  const { etiket, eklenecek: ad } = adMetni(b, parcalar);
  const ilk = imzalar[0]!;
  const ek = imzalar.length > 1 ? ` +${imzalar.length - 1}` : '';
  const aciklama = imzalar.find((f) => f.aciklama)?.aciklama;
  const info = imzalar.map((f) => `${f.ad}${imza(f)}`).join('\n') + (aciklama ? `\n\n${aciklama}` : '');
  const argumansiz = imzalar.length === 1 && ilk.argumanlar === '';
  return {
    etiket,
    tur: 'function',
    detail: imza(ilk) + ek,
    info,
    eklenecek: `${ad}()`,
    ...(argumansiz ? {} : { imlec: ad.length + 1 }),
    oncelik,
  };
}

/** Şemanın süzgeçten geçen fonksiyonları, ad başına bir öneri. */
function semaninOnerileri(b: Baglam, sema: string, uygun: Suzgec, onekli: boolean, oncelik: number): Oneri[] {
  const adla = fonksiyonDizini(b.katalog!).get(sema);
  if (!adla) return [];
  return [...adla].flatMap(([ad, hepsi]) => {
    const imzalar = hepsi.filter(uygun);
    return imzalar.length > 0 ? [fonksiyonOnerisi(b, onekli ? [sema, ad] : [ad], imzalar, oncelik)] : [];
  });
}

/**
 * `pg_proc`'ta olmayan (ayrıştırıcının tanıdığı) SQL standardı fonksiyon benzeri yapılar: ad →
 * `detail`, `info`. Yalnızca ifade yuvasında, katalogsuz da; ad anahtar kelime gibi yazılır.
 */
const STANDART_YAPILAR: Readonly<Record<string, readonly [detail: string, info: string]>> = {
  COALESCE: ['(değer, …)', 'İlk NULL olmayan argümanı döndürür.'],
  NULLIF: ['(a, b)', 'a = b ise NULL, değilse a.'],
  GREATEST: ['(değer, …)', 'En büyük argüman (NULL olanlar yok sayılır).'],
  LEAST: ['(değer, …)', 'En küçük argüman (NULL olanlar yok sayılır).'],
  CAST: ['(ifade AS tip)', 'Tip dönüşümü (ifade::tip).'],
};

function standartYapilar(b: Baglam): Oneri[] {
  if (b.yuva.tur !== 'ifade' || b.niteleyici || b.tirnakli) return [];
  return Object.entries(STANDART_YAPILAR).map(([anahtar, [detail, info]]) => {
    const ad = harfDurumu(b, anahtar);
    return { etiket: ad, tur: 'function', detail, info, eklenecek: `${ad}()`, imlec: ad.length + 1, oncelik: ONCELIK.FONKSIYON };
  });
}

export const fonksiyonlar: Uretici = (b) => [...standartYapilar(b), ...katalogFonksiyonlari(b)];

function katalogFonksiyonlari(b: Baglam): Oneri[] {
  const uygun = suzgec(b);
  if (!b.katalog || !uygun) return [];
  const gorunur = b.secenekler.gorunurSemalar;
  if (b.niteleyici) {
    // `şema.`: o şemanın fonksiyonları öneksiz; takma ad / ilişki niteleyicisi kolon üreticisinindir.
    if (b.niteleyici.length !== 1) return [];
    const sema = b.niteleyici[0]!;
    if (kapsamdaMi(b.kapsamlar, sema)) return [];
    if (sema !== PG_CATALOG && !gorunur.includes(sema)) return [];
    return semaninOnerileri(b, sema, uygun, false, ONCELIK.FONKSIYON);
  }
  return [PG_CATALOG, ...gorunur.filter((s) => s !== PG_CATALOG)].flatMap((sema) => {
    const oneksiz = sema === PG_CATALOG || varsayilanSemada(b, sema);
    return semaninOnerileri(b, sema, uygun, !oneksiz, oneksiz ? ONCELIK.FONKSIYON : ONCELIK.DIGER_SEMA);
  });
}
