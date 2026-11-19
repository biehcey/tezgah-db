/**
 * Öncelik bantları (spec "Öncelik bantları"): yüksekten düşüğe. CodeMirror `boost`'u
 * (-99…99) olarak eklenir; bant içi sıra CodeMirror'ın eşleşme puanına kalır. Bantlar arası 10'luk
 * boşluk, bir ticket'ın kendi türüne ara değer (ör. `ILISKI + 5`) vermesine yer bırakır.
 */
export const ONCELIK = {
  /** FROM ilişkilerinin kolonları, kapsamdaki takma adlar ve CTE'ler. */
  KAPSAM: 50,
  /** JOIN önerileri (FK'den ON koşuluyla; ticket 03). */
  JOIN_FK: 40,
  /** `defaultSchema`'daki (öneksiz) ilişkiler ve niteleyicinin şemasındaki adlar. */
  ILISKI: 30,
  /** Fonksiyonlar (ticket 04). */
  FONKSIYON: 20,
  /** Tipler (ticket 05). */
  TIP: 10,
  ANAHTAR: 0,
  /** `defaultSchema` dışındaki şemalardan şema önekli adlar. */
  DIGER_SEMA: -20,
} as const;
