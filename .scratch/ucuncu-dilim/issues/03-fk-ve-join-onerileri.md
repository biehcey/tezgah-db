# 03: FK'ler ve JOIN önerileri

Spec: [JOIN önerisi](../spec.md#join-önerisi), [core: Katalog](../spec.md#core-katalog-değişen), [server: Katalog okuması](../spec.md#server-katalog-okuması-değişen), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** Katalog önbelleği FK'leri de okur. `JOIN ` (her JOIN türünde) yazınca FROM'daki katalog ilişkilerinden birine FK ile bağlı ilişkiler ON koşuluyla birlikte listenin başında önerilir (`orders ON orders.customer_id = c.id`); düz ilişki adları altında kalır. `ON ` yazınca son JOIN'lenen ilişkiyle diğerleri arasındaki FK koşulları önerilir.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] core `Catalog.fkler`: `{ ad, kaynak: { sema, ad, kolonlar[] }, hedef: { sema, ad, kolonlar[] } }`, kolonlar FK sırasıyla; `buildCatalog` FK satırlarını dönüştürür.
- [ ] server: katalog okumasına `pg_constraint` (`contype = 'f'`) sorgusu, `conkey`/`confkey` sırasıyla kolon adları; iki ucu da görünür şemalarda olmayan FK alınmaz. Aynı client ve zaman aşımı; ↻ ve DDL commit sonrası yenilenir.
- [ ] JOIN önerileri iki yönlü (referans veren ve referans verilen), her FK için bir öneri (aynı çiftte birden çok FK ayrı); bileşik FK `AND` ile, kolon sırasıyla.
- [ ] `eklenecek`: yeni ilişki adı (gerekirse şema önekli, tırnaklı), `ON <yeni>.<k> = <taraf>.<r>`; taraf takma adı varsa takma ad; yeni ilişkiye takma ad eklenmez.
- [ ] Yalnızca katalog ilişkileri (CTE/alt sorgu değil) FK kaynağıdır.
- [ ] JOIN önerileri JOIN-FK bandında (kolonların altında, fonksiyonların üstünde); tür `text`, `detail`'de FK adı.
- [ ] `ON ` yuvasında FK koşulları ayrıca önerilir.
- [ ] Testler: core `buildCatalog` (FK satırları); core `tamamla` (iki yön, bileşik, çoklu FK, takma adlı/adsız taraf, LEFT/INNER JOIN, `ON` yuvası, görünmez şemaya giden FK yok); server katalog entegrasyonu (`describePg`: bileşik sıra, görünmez şema filtresi).
