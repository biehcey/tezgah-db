/**
 * Katalogdan arama dizinleri: katalog nesnesine bağlı olarak bir kez kurulur, her tuşta değil.
 * Her üretici kendi dizinini `katalogaBagli` ile kendi dosyasında tanımlar (FK, fonksiyon…).
 */
import { iliskiAnahtari, type Catalog, type CatalogRelation } from '../katalog';
import type { Baglam } from './tipler';

/** `kur(katalog)`'u katalog nesnesi başına önbelleğe alan fonksiyon. */
export function katalogaBagli<T>(kur: (katalog: Catalog) => T): (katalog: Catalog) => T {
  const onbellek = new WeakMap<Catalog, T>();
  return (katalog) => {
    let dizin = onbellek.get(katalog);
    if (dizin === undefined) {
      dizin = kur(katalog);
      onbellek.set(katalog, dizin);
    }
    return dizin;
  };
}

const iliskiDizini = katalogaBagli((katalog) => {
  const adla = new Map<string, CatalogRelation>();
  const semayla = new Map<string, CatalogRelation[]>();
  for (const r of katalog.iliskiler) {
    adla.set(iliskiAnahtari(r.sema, r.ad), r);
    const liste = semayla.get(r.sema);
    if (liste) liste.push(r);
    else semayla.set(r.sema, [r]);
  }
  return { adla, semayla };
});

/** Görünür şemadaki ilişkiler (katalog sırasıyla); şema görünür değilse boş. */
export function semaninIliskileri(b: Baglam, sema: string): readonly CatalogRelation[] {
  if (!b.katalog || !b.secenekler.gorunurSemalar.includes(sema)) return [];
  return iliskiDizini(b.katalog).semayla.get(sema) ?? [];
}

/**
 * Adı (şema verilmezse önce `defaultSchema`'da, sonra görünür şemalarda sırayla) çözer; görünmez
 * şemadaki ilişki bulunmaz.
 */
export function iliskiBul(b: Baglam, sema: string | null, ad: string): CatalogRelation | null {
  if (!b.katalog) return null;
  const { adla } = iliskiDizini(b.katalog);
  const gorunur = b.secenekler.gorunurSemalar;
  const adaylar = sema !== null ? [sema] : [...(b.katalog.defaultSchema !== null ? [b.katalog.defaultSchema] : []), ...gorunur];
  for (const s of adaylar) {
    if (!gorunur.includes(s)) continue;
    const r = adla.get(iliskiAnahtari(s, ad));
    if (r) return r;
  }
  return null;
}

/** İlişkinin `defaultSchema`'da olup olmadığı (öneksiz yazılır). */
export const varsayilanSemada = (b: Baglam, sema: string) => b.katalog?.defaultSchema === sema;
