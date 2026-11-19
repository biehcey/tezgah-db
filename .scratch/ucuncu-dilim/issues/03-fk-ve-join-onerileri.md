# 03: FK'ler ve JOIN önerileri

Spec: [JOIN önerisi](../spec.md#join-önerisi), [core: Katalog](../spec.md#core-katalog-değişen), [server: Katalog okuması](../spec.md#server-katalog-okuması-değişen), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** Katalog önbelleği FK'leri de okur. `JOIN ` (her JOIN türünde) yazınca FROM'daki katalog ilişkilerinden birine FK ile bağlı ilişkiler ON koşuluyla birlikte listenin başında önerilir (`orders ON orders.customer_id = c.id`); düz ilişki adları altında kalır. `ON ` yazınca son JOIN'lenen ilişkiyle diğerleri arasındaki FK koşulları önerilir.

**Blocked by:** 01

**Status:** done (ffd6764)

- [x] core `Catalog.fkler`: `{ ad, kaynak: { sema, ad, kolonlar[] }, hedef: { sema, ad, kolonlar[] } }`, kolonlar FK sırasıyla; `buildCatalog` FK satırlarını dönüştürür.
- [x] server: katalog okumasına `pg_constraint` (`contype = 'f'`) sorgusu, `conkey`/`confkey` sırasıyla kolon adları; iki ucu da görünür şemalarda olmayan FK alınmaz. Aynı client ve zaman aşımı; ↻ ve DDL commit sonrası yenilenir.
- [x] JOIN önerileri iki yönlü (referans veren ve referans verilen), her FK için bir öneri (aynı çiftte birden çok FK ayrı); bileşik FK `AND` ile, kolon sırasıyla.
- [x] `eklenecek`: yeni ilişki adı (gerekirse şema önekli, tırnaklı), `ON <yeni>.<k> = <taraf>.<r>`; taraf takma adı varsa takma ad; yeni ilişkiye takma ad eklenmez.
- [x] Yalnızca katalog ilişkileri (CTE/alt sorgu değil) FK kaynağıdır.
- [x] JOIN önerileri JOIN-FK bandında (kolonların altında, fonksiyonların üstünde); tür `text`, `detail`'de FK adı.
- [x] `ON ` yuvasında FK koşulları ayrıca önerilir.
- [x] Testler: core `buildCatalog` (FK satırları); core `tamamla` (iki yön, bileşik, çoklu FK, takma adlı/adsız taraf, LEFT/INNER JOIN, `ON` yuvası, görünmez şemaya giden FK yok); server katalog entegrasyonu (`describePg`: bileşik sıra, görünmez şema filtresi).

## Comments

- Kod: `src/core/tamamlama/ureticiler/join.ts`, `src/server/katalog-fk.ts`; testler `src/core/katalog-fk.test.ts`, `src/core/tamamlama/tamamla-join.test.ts`, `src/server/katalog.test.ts` (sahte + `describePg`, `npm run test:pg` ile koştu).
- Spec'ten ayrılanlar spec'e yazıldı: FK kaynağı imleçten önce yazılmış ilişkiler; `CROSS JOIN` / `NATURAL … JOIN` sonrasında FK önerisi yok (ON almaz); kendine FK'de takma adsız tarafa öneri yok; bölümlere türetilen FK kopyaları (`conparentid <> 0`) okunmaz.
- CTE/alt sorgu: üretici yalnızca `kaynak.tur === 'katalog'` olan ve katalogda çözülen kapsam ilişkilerini kullanır. Katalogdaki bir tabloyla aynı adlı CTE'nin (`WITH customers AS (…) … FROM customers JOIN`) dışlanması ticket 02'nin CTE'leri kapsamda `kaynak.tur: 'cte'` olarak işaretlemesine dayanır; o durumun testi 02 birleşince eklenmeli.
