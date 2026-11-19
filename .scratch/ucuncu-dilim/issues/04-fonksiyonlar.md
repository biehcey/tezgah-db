# 04: Fonksiyonlar

Spec: [Fonksiyonlar](../spec.md#fonksiyonlar), [core: Katalog](../spec.md#core-katalog-değişen), [server: Katalog okuması](../spec.md#server-katalog-okuması-değişen), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** Katalog önbelleği fonksiyonları da okur (görünür şemalar + filtrelenmiş `pg_catalog`). İfade yuvasında fonksiyonlar imzalarıyla önerilir; seçilince `ad()` eklenir ve imleç parantezin içine konur. `FROM` sonrasında yalnızca set-returning fonksiyonlar, `CALL ` sonrasında yalnızca prosedürler önerilir. `CREATE FUNCTION` commit'inden sonra yeni fonksiyon hemen önerilir.

**Blocked by:** 01

**Status:** done (fcf503c)

- [x] core `Catalog.fonksiyonlar`: `{ sema, ad, tur: 'f'|'p'|'a'|'w', argumanlar, donus, kumeDondurur, aciklama }` (aşırı yükleme başına bir satır); `buildCatalog` dönüştürür.
- [x] server: `pg_proc` sorgusu (`prokind` `f|p|a|w`), `pg_get_function_arguments`, `pg_get_function_result`, `proretset`, `obj_description(oid, 'pg_proc')`; `pg_catalog`'da argüman ya da dönüş tipi `internal`, `trigger`, `event_trigger`, `language_handler`, `fdw_handler`, `index_am_handler`, `table_am_handler`, `tsm_handler` olanlar dışarıda.
- [x] Ad başına tek öneri: `detail` = ilk imza `(argümanlar) → dönüş` ve aşırı yükleme varsa ` +N`; `info` = tüm imzalar + açıklama.
- [x] `eklenecek` = `ad()`; imleç parantezin içinde, tek imzalı ve argümansızsa sonunda. `pg_catalog` öneksiz; diğer şemalar `defaultSchema` değilse şema önekli.
- [x] Yuvalar: ifade → tüm fonksiyonlar (prosedürler hariç); ilişki → yalnızca `kumeDondurur`; `CALL` → yalnızca prosedürler; `şema.` → yuvaya göre o şemanın fonksiyonları.
- [x] Fonksiyonlar kendi bandında (JOIN-FK'nin altında, anahtar kelimelerin üstünde).
- [x] Testler: core `buildCatalog`; core `tamamla` (aşırı yükleme detail/info, imleç konumu, SRF FROM'da, prosedür CALL'da, aggregate/window, şema önekli); server katalog entegrasyonu (`describePg`: iç tip filtresi, aşırı yüklemeler, türler, açıklama, `CREATE FUNCTION` commit sonrası `katalogYenilendi` ile gelmesi).

## Comments

- Spec'e işlendi: SRF'ler yalnızca `FROM`/`JOIN` sonrası (UPDATE/INSERT INTO/DELETE FROM değil); yeni `cagri` yuvası (`CALL `), `CALL p(` içi ifade; `defaultSchema` dışı şemaların fonksiyonları `DIGER_SEMA` bandında; `info` biçimi; prosedürde `donus` boş.
- `FROM f(...) takma` (SRF'nin kapsam ilişkisi olarak eklenmesi) bu ticket'ta yapılmadı; kapsam okuyucusu `ad(` dalını hâlâ atlıyor.
- İnceleme: kapsam okuyucusu FROM/JOIN'deki `f(…) [AS] takma [(kolonlar)]`'ı `fonksiyon` kaynaklı ilişki olarak ekler (takma adsızsa fonksiyon adıyla); sonraki FROM öğeleri artık düşmez. Kolonlar yalnızca açık listeden (`AS g(n)`), dönüş tipinden çıkarılmaz; takma ad ifade yuvasında `detail` = `fonksiyon`. `INSERT INTO t (` kolon listesi fonksiyon çağrısı sayılmaz (`RETURNING` t'nin kolonlarını görür).
