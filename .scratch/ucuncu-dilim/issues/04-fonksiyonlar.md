# 04: Fonksiyonlar

Spec: [Fonksiyonlar](../spec.md#fonksiyonlar), [core: Katalog](../spec.md#core-katalog-değişen), [server: Katalog okuması](../spec.md#server-katalog-okuması-değişen), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** Katalog önbelleği fonksiyonları da okur (görünür şemalar + filtrelenmiş `pg_catalog`). İfade yuvasında fonksiyonlar imzalarıyla önerilir; seçilince `ad()` eklenir ve imleç parantezin içine konur. `FROM` sonrasında yalnızca set-returning fonksiyonlar, `CALL ` sonrasında yalnızca prosedürler önerilir. `CREATE FUNCTION` commit'inden sonra yeni fonksiyon hemen önerilir.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] core `Catalog.fonksiyonlar`: `{ sema, ad, tur: 'f'|'p'|'a'|'w', argumanlar, donus, kumeDondurur, aciklama }` (aşırı yükleme başına bir satır); `buildCatalog` dönüştürür.
- [ ] server: `pg_proc` sorgusu (`prokind` `f|p|a|w`), `pg_get_function_arguments`, `pg_get_function_result`, `proretset`, `obj_description(oid, 'pg_proc')`; `pg_catalog`'da argüman ya da dönüş tipi `internal`, `trigger`, `event_trigger`, `language_handler`, `fdw_handler`, `index_am_handler`, `table_am_handler`, `tsm_handler` olanlar dışarıda.
- [ ] Ad başına tek öneri: `detail` = ilk imza `(argümanlar) → dönüş` ve aşırı yükleme varsa ` +N`; `info` = tüm imzalar + açıklama.
- [ ] `eklenecek` = `ad()`; imleç parantezin içinde, tek imzalı ve argümansızsa sonunda. `pg_catalog` öneksiz; diğer şemalar `defaultSchema` değilse şema önekli.
- [ ] Yuvalar: ifade → tüm fonksiyonlar (prosedürler hariç); ilişki → yalnızca `kumeDondurur`; `CALL` → yalnızca prosedürler; `şema.` → yuvaya göre o şemanın fonksiyonları.
- [ ] Fonksiyonlar kendi bandında (JOIN-FK'nin altında, anahtar kelimelerin üstünde).
- [ ] Testler: core `buildCatalog`; core `tamamla` (aşırı yükleme detail/info, imleç konumu, SRF FROM'da, prosedür CALL'da, aggregate/window, şema önekli); server katalog entegrasyonu (`describePg`: iç tip filtresi, aşırı yüklemeler, türler, açıklama, `CREATE FUNCTION` commit sonrası `katalogYenilendi` ile gelmesi).
