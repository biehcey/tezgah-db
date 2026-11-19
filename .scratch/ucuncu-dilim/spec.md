# Spec: Üçüncü dilim (IntelliJ benzeri, bağlam bilen tamamlama)

Status: ready-for-agent

Kaynak: grilling 2026-11-17/19 (Q1–Q15, tüm öneriler kabul). Terimler [GLOSSARY.md](../../GLOSSARY.md)'deki anlamlarıyla kullanılır: Hedef, Veritabanı seçimi, Sekme, Tablo sekmesi, Katalog önbelleği, Tamamlama bağlamı. İlgili ADR: [ADR-0005](../../docs/adr/0005-kendi-tamamlama-motoru.md) (kendi tamamlama motorumuz; lang-sql yalnızca renklendirir). İkinci dilimin [spec'i](../ikinci-dilim/spec.md) ve değişmez kurallar (açılışta bağlantı yok, katalog yalnızca kullanıcı eylemiyle) değişmeden geçerlidir; bu dilim ikinci dilimin "Şema bilen tamamlama" bölümünü genişletir ve onun "tamamlamada fonksiyonlar" kapsam dışı maddesini kaldırır.

## Problem Statement

İkinci dilimle editörde tablo ve kolon adları tamamlanıyor, ama tamamlama nerede olduğumu bilmiyor. `FROM ` yazınca kolonlar, `SELECT ` yazınca tablolar da önüme geliyor; `SELECT ` yazdığımda FROM'daki tabloların kolonlarını öneksiz göremiyorum, önce `tablo.` yazmam gerekiyor. `JOIN` yazarken hangi tablonun FK ile bağlı olduğunu ve ON koşulunu ezbere yazıyorum. Fonksiyon adlarını ve imzalarını (`date_trunc`'ın argüman sırası, `jsonb_*` ailesi, kendi yazdığım fonksiyonlar) başka yerden bakıyorum. CTE'lerin ve alt sorgu takma adlarının kolonları önerilmiyor. Aynı adlı kolon iki tabloda varsa hangisini eklediğimi göremiyorum. Tip yazarken (`::`, `CAST`, kolon tanımı) öneri yok. DataGrip'te alıştığım "yazdıkça doğru şeyi öner" deneyimi yok.

## Solution

Tamamlama core'daki kendi motorumuza taşınır (ADR-0005). Motor imlecin **Tamamlama bağlamını** metinden çıkarır ve yalnızca o noktada anlamlı olanı önerir:

- İlişki adı beklenen yerde (`FROM`, `JOIN`, `UPDATE`, `INSERT INTO`, `DELETE FROM`, bazı DDL'ler) ilişkiler; ifade beklenen yerde (`SELECT` listesi, `WHERE`, `ON`, `ORDER BY`, `GROUP BY`, `HAVING`, `SET`) FROM'daki ilişkilerin kolonları öneksiz, takma adlar ve fonksiyonlar; tip beklenen yerde tipler; diğer yerlerde bağlama uygun anahtar kelimeler.
- CTE'ler ve alt sorgu takma adları ilişki gibi tanınır, kolonları çıkarılabildiği kadar önerilir.
- `JOIN ` yazınca FK ile bağlı tablolar ON koşuluyla birlikte listenin başında önerilir.
- Fonksiyonlar (kullanıcı ve filtrelenmiş yerleşik) imzalarıyla önerilir, seçilince imleç parantezin içine konur.
- Öneriler bağlama göre sıralanır; CodeMirror'ın bulanık eşleşmesi (`cuo` → `customer_orders`) korunur.
- Tuşlar IntelliJ gibidir: popup yazarken açılır, Ctrl+Space elle açar, Enter ekler, Tab imleçteki kelimenin kalanını değiştirir.
- Aynı motor konsol/Script editöründe ve Tablo sekmesinin `WHERE`/`ORDER BY` kutularında çalışır.

Katalog önbelleği FK'leri ve fonksiyonları da okur. Katalog yokken motor yalnızca anahtar kelimeleri ve metinden çıkan adları önerir; tamamlama hiçbir zaman katalog isteği tetiklemez.

## User Stories

### Bağlam

1. Geliştirici olarak `FROM ` yazınca yalnızca tabloları, view'ları ve materialized view'ları görmek istiyorum, böylece listede kolonlar ve anahtar kelimeler arasında aramam.
2. Geliştirici olarak `JOIN `, `UPDATE `, `INSERT INTO `, `DELETE FROM ` sonrasında da yalnızca ilişkileri görmek istiyorum.
3. Geliştirici olarak `INSERT INTO`, `UPDATE` ve `DELETE FROM` sonrasında view'ların da önerilmesini istiyorum (güncellenebilir view olabilir), ama ilişki türünün `detail`'de yazmasını istiyorum, böylece neyi seçtiğimi bilirim.
4. Geliştirici olarak `SELECT ` yazınca FROM'daki tabloların kolonlarını öneksiz görmek istiyorum, böylece `tablo.` yazmadan kolon seçebilirim.
5. Geliştirici olarak FROM henüz yazılmamışken (`SELECT | FROM t` değil, `SELECT |`) aynı ifadenin devamında FROM varsa onun kolonlarını görmek istiyorum, böylece önce FROM'u yazıp SELECT'e dönmem gerekmez.
6. Geliştirici olarak `WHERE`, `ON`, `ORDER BY`, `GROUP BY`, `HAVING` içinde FROM'daki tabloların kolonlarını görmek istiyorum.
7. Geliştirici olarak `UPDATE t SET ` sonrasında t'nin kolonlarını görmek istiyorum.
8. Geliştirici olarak `DELETE FROM t WHERE ` sonrasında t'nin kolonlarını görmek istiyorum.
9. Geliştirici olarak `INSERT INTO t (` içinde t'nin kolonlarını görmek istiyorum.
10. Geliştirici olarak ifade bağlamında takma adların (`c`, `o`) ve takma adsız tablo adlarının da önerilmesini istiyorum, böylece `c.` yazmaya hızlı başlarım.
11. Geliştirici olarak kolon önerilerinde kolon tipini `detail`'de görmek istiyorum.
12. Geliştirici olarak motorun yalnızca imlecin bulunduğu ifadeye bakmasını istiyorum, böylece script'teki başka ifadelerin tabloları karışmaz.
13. Geliştirici olarak iç içe alt sorguda imlecin bulunduğu SELECT'in FROM'unun geçerli olmasını istiyorum.
14. Geliştirici olarak ilişkili alt sorguda (`WHERE EXISTS (SELECT … WHERE x.id = |)`) dış sorgunun ilişkilerinin de görünmesini istiyorum.
15. Geliştirici olarak yorumların ve dizgelerin içinde tamamlama açılmamasını istiyorum.
16. Geliştirici olarak yarım ya da sözdizimi hatalı SQL'de de motorun makul bir bağlam çıkarmasını istiyorum, çünkü yazarken SQL hep yarımdır.

### Nitelikli adlar

17. Geliştirici olarak `takma_ad.` ya da `tablo.` yazınca yalnızca o ilişkinin kolonlarını görmek istiyorum.
18. Geliştirici olarak `şema.` yazınca, ilişki beklenen yerde o şemanın ilişkilerini (ve set-returning fonksiyonlarını), ifade beklenen yerde o şemanın tablolarını ve fonksiyonlarını görmek istiyorum.
19. Geliştirici olarak `şema.tablo.` yazınca o tablonun kolonlarını görmek istiyorum.
20. Geliştirici olarak `search_path`'in ilk şemasındaki ilişkilerin öneksiz, diğer görünür şemalardakilerin `şema.` ile önerilmesini istiyorum (ikinci dilimdeki kural).
21. Geliştirici olarak Veritabanı seçiminde görünür kılmadığım şemaların hiçbir bağlamda önerilmemesini istiyorum.
22. Geliştirici olarak büyük harf, boşluk ya da ayrılmış kelime içeren adların tırnaklı eklenmesini istiyorum, böylece eklenen SQL çalışır.
23. Geliştirici olarak tırnakla başladığım bir adı (`"Mus`) da tamamlayabilmek istiyorum.

### CTE ve alt sorgular

24. Geliştirici olarak `WITH x AS (…)` ile tanımladığım x'in ilişki beklenen yerde önerilmesini istiyorum.
25. Geliştirici olarak CTE'nin kolonlarının, açık kolon listesinden (`WITH x(a, b) AS`) ya da iç SELECT'in basit kolon adlarından ve `AS` takma adlarından çıkarılıp önerilmesini istiyorum.
26. Geliştirici olarak `FROM (SELECT …) s` alt sorgusunun s takma adının ve kolonlarının aynı kuralla önerilmesini istiyorum.
27. Geliştirici olarak kolonları çıkarılamayan (`SELECT *`, adsız ifade) CTE ya da alt sorgunun yine ad olarak önerilmesini ama kolon önerilmemesini istiyorum, böylece yanlış kolon görmem.
28. Geliştirici olarak `WITH RECURSIVE` CTE'nin kendi gövdesinde de önerilmesini istiyorum.

### Belirsiz kolonlar

29. Geliştirici olarak aynı adlı kolon FROM'daki birden çok ilişkide varsa listede ayrı satırlarda, `detail`'de ilişki adıyla görmek istiyorum.
30. Geliştirici olarak belirsiz bir kolonu seçince `takma_ad.kolon` (takma ad yoksa `tablo.kolon`) eklenmesini istiyorum, böylece sorgu "ambiguous column" hatası vermez.
31. Geliştirici olarak belirsiz olmayan kolonların öneksiz eklenmesini istiyorum.

### JOIN önerisi

32. Geliştirici olarak `JOIN ` yazınca FROM'daki tablolardan birine FK ile bağlı tabloları ON koşuluyla birlikte görmek istiyorum (`orders ON orders.customer_id = c.id`).
33. Geliştirici olarak hem benim tablomdan referans verilen hem benim tabloma referans veren tabloların önerilmesini istiyorum.
34. Geliştirici olarak bileşik FK'lerde koşulların FK kolon sırasıyla `AND` ile bağlanmasını istiyorum.
35. Geliştirici olarak koşulda FROM'daki tarafın takma adının (varsa) kullanılmasını, yeni eklenen tablonun tam adıyla yazılmasını istiyorum.
36. Geliştirici olarak aynı tablo çiftinde birden çok FK varsa her biri için ayrı öneri görmek istiyorum (ör. `created_by` ve `updated_by`).
37. Geliştirici olarak JOIN önerilerinin listenin başında, düz ilişki adlarının altında da yer almasını istiyorum, böylece koşulsuz JOIN de yazabilirim.
38. Geliştirici olarak `LEFT JOIN`, `INNER JOIN` vb. tüm JOIN türlerinde aynı önerileri görmek istiyorum.
39. Geliştirici olarak `ON ` yazınca (koşulu kendim yazmak istersem) son JOIN'lenen tabloyla diğerleri arasındaki FK koşullarının önerilmesini istiyorum.
40. Geliştirici olarak FK'nin öbür ucu görünmez bir şemadaysa o FK'nin önerilmemesini istiyorum.

### Fonksiyonlar

41. Geliştirici olarak ifade bağlamında fonksiyonların önerilmesini istiyorum.
42. Geliştirici olarak görünür şemalardaki kendi fonksiyonlarımın ve prosedürlerimin önerilmesini istiyorum.
43. Geliştirici olarak `pg_catalog`'un kullanışlı fonksiyonlarının (aggregate ve window dahil) önerilmesini, iç kullanım fonksiyonlarının (`internal`, trigger, handler tipli) önerilmemesini istiyorum.
44. Geliştirici olarak aşırı yüklenmiş bir fonksiyonu listede tek satırda, `detail`'de ilk imza ve "+N" ile görmek istiyorum.
45. Geliştirici olarak seçili fonksiyonun tüm imzalarını ve açıklamasını (`obj_description`) bilgi panelinde görmek istiyorum.
46. Geliştirici olarak fonksiyonu seçince `ad()` eklenip imlecin parantezin içine konmasını istiyorum; tek imzalı ve argümansızsa imlecin parantezden sonra konmasını istiyorum.
47. Geliştirici olarak `FROM` sonrasında yalnızca set-returning fonksiyonların (`generate_series`, `unnest`, kendi SRF'lerim) önerilmesini istiyorum.
48. Geliştirici olarak `CALL ` sonrasında prosedürlerin önerilmesini istiyorum.

### Tipler ve DDL

49. Geliştirici olarak `::` sonrasında, `CAST(x AS ` içinde ve `CREATE TABLE`/`ADD COLUMN` kolon tanımında tiplerin (yaygın tipler + katalogdaki kullanıcı tipleri) önerilmesini istiyorum.
50. Geliştirici olarak `ALTER TABLE t ALTER COLUMN `, `DROP COLUMN `, `RENAME COLUMN ` sonrasında t'nin kolonlarını görmek istiyorum.
51. Geliştirici olarak `CREATE [UNIQUE] INDEX … ON t (` içinde t'nin kolonlarını görmek istiyorum.
52. Geliştirici olarak `ALTER TABLE `, `DROP TABLE `, `DROP VIEW `, `TRUNCATE `, `COMMENT ON TABLE ` sonrasında ilişkileri görmek istiyorum.
53. Geliştirici olarak bunların dışındaki DDL'de yalnızca bağlama uygun anahtar kelimelerin önerilmesini istiyorum.

### Anahtar kelimeler

54. Geliştirici olarak anahtar kelimelerin bağlama göre önerilmesini istiyorum (ifade başında `SELECT`/`INSERT`/`WITH`…, FROM'dan sonra `WHERE`/`JOIN`/`ORDER BY`…).
55. Geliştirici olarak anahtar kelimelerin yazdığım önekin harf durumunda eklenmesini istiyorum (`sel` → `select`, `SEL` → `SELECT`); önek boşsa BÜYÜK.
56. Geliştirici olarak çok kelimeli anahtar kelime gruplarının (`ORDER BY`, `GROUP BY`, `LEFT JOIN`, `IS NOT NULL`) tek öneri olarak gelmesini istiyorum.

### Sıralama ve eşleşme

57. Geliştirici olarak bulanık eşleşmenin (`cuo` → `customer_orders`) korunmasını istiyorum.
58. Geliştirici olarak önceliğin FROM kolonları > JOIN-FK önerileri > fonksiyonlar > anahtar kelimeler > diğer şemalardaki adlar olmasını istiyorum, böylece en olası şey en üstte olur.
59. Geliştirici olarak eşleşme kalitesi eşitse bağlam önceliğinin, bağlam önceliği eşitse eşleşme kalitesinin sırayı belirlemesini istiyorum (tam önek eşleşmesi bulanık eşleşmeden önce).

### Tuşlar ve popup

60. Geliştirici olarak popup'ın yazarken kendiliğinden açılmasını istiyorum.
61. Geliştirici olarak Ctrl+Space ile popup'ı elle açabilmek istiyorum (macOS'ta da Ctrl+Space).
62. Geliştirici olarak Enter'ın seçili öneriyi imleçteki kelimenin önüne eklemesini istiyorum.
63. Geliştirici olarak Tab'ın seçili öneriyle imleçteki kelimenin tamamını (imlecin sağındaki kısmı da) değiştirmesini istiyorum.
64. Geliştirici olarak popup kapalıyken Tab'ın editördeki bugünkü davranışını sürdürmesini istiyorum.
65. Geliştirici olarak `.` yazınca popup'ın kendiliğinden açılmasını istiyorum.

### Tablo sekmesi kutuları

66. Geliştirici olarak Tablo sekmesinin `WHERE` kutusunda o tablonun kolonlarını öneksiz, fonksiyonları ve ifade anahtar kelimelerini görmek istiyorum.
67. Geliştirici olarak `ORDER BY` kutusunda o tablonun kolonlarını ve `ASC`/`DESC`/`NULLS FIRST|LAST`'ı görmek istiyorum.
68. Geliştirici olarak kutularda alt sorgu yazarsam (`id IN (SELECT … FROM |`) motorun orada da çalışmasını istiyorum.

### Katalog

69. Geliştirici olarak FK'lerin ve fonksiyonların katalog önbelleğiyle aynı anda, aynı kullanıcı eylemiyle okunmasını istiyorum.
70. Geliştirici olarak katalog "↻" ile ya da DDL'li script commit'inden sonra yenilenince FK'lerin ve fonksiyonların da yenilenmesini istiyorum (`CREATE FUNCTION` sonrası yeni fonksiyonum hemen önerilsin).
71. Geliştirici olarak katalog yüklü değilken de anahtar kelimelerin ve metinden çıkan adların (CTE'ler, takma adlar, alt sorgu kolonları) önerilmesini istiyorum.
72. Geliştirici olarak tamamlamanın hiçbir zaman kendiliğinden katalog okumamasını istiyorum, böylece "açılışta bağlantı yok" ve "katalog yalnızca kullanıcı eylemiyle" kuralları korunur.
73. Geliştirici olarak katalog yenilenirken önceki katalogla tamamlamanın sürmesini istiyorum (ikinci dilimdeki davranış).

### Performans

74. Geliştirici olarak binlerce tablolu ve binlerce fonksiyonlu katalogda da tamamlamanın yazmayı yavaşlatmamasını istiyorum.

## Implementation Decisions

### core: Tamamlama motoru (yeni, saf)

- Tek giriş noktası (`src/core/tamamlama`): `tamamla(metin, imlec, katalog | null, { gorunurSemalar, ortukTablo? })` → `{ from, to, oneriler }` ya da öneri yoksa `null`. `ortukTablo` = `{ sema, tablo, kutu: 'where' | 'orderBy' }` (Tablo sekmesi kutuları; verilince bağlam "bu tablonun FROM'u içinde, ifade yuvası" olarak başlar).
- `from`–`to`: değiştirilecek kelime aralığı. `to` imlecin sağındaki kelime kalanını da kapsayan aralıktır; Enter ile Tab farkı web katmanında bu aralığın kullanılıp kullanılmamasıdır (Enter: `from`–imleç, Tab: `from`–`to`).
- Öneri (`Oneri`): `etiket`, `tur` (CodeMirror `type`: `keyword`, `type` (ilişki), `property` (kolon), `function`, `namespace`, `variable` (takma ad/CTE), `text` (JOIN önerisi)), `detail`, `info` (isteğe bağlı), `eklenecek` metin, `imlec`: eklemeden sonra imlecin `eklenecek` içindeki konumu (isteğe bağlı, yoksa sonu), `oncelik` (CodeMirror `boost`'a çevrilir). Kullanıcı `"` ile başladıysa `etiket` de tırnaklı yazımdır (CodeMirror yazılan `"Mus`'u etiketle eşleştirir).
- Bağlam analizi mevcut ifade bölücünün lexer'ını kullanır (yorum, dizge, dolar tırnaklı dizge, tırnaklı ad kuralları aynı kalır). İmleç yorumda ya da dizgedeyse sonuç `null`.
- İmlecin ifadesi ifade bölücünün sınırlarıyla bulunur; motor yalnızca o ifadenin metnine bakar. İfade içinde parantez derinliğiyle kapsam ağacı kurulur: her `SELECT`/`WITH` kapsamı kendi FROM ilişkilerini (ad, takma ad, kaynak: katalog ilişkisi / CTE / alt sorgu) taşır; iç kapsam dıştakileri görür (ilişkili alt sorgu).
- FROM'u imleçten sonra gelen ifadeler (`SELECT | FROM t`) için kapsamın tüm FROM'u imleçten bağımsız toplanır.
- CTE ve alt sorgu kolonları: açık kolon listesi varsa o; yoksa iç SELECT listesindeki her öğe için `AS ad` ya da tek tanımlayıcı/`x.ad` ise son parça; `*` ya da adsız ifade içeren listede kolonlar "bilinmiyor" (yalnızca ad önerilir).
- Yuva türleri: `ilişki` (FROM/JOIN/UPDATE/INSERT INTO/DELETE FROM/listelenen DDL'ler), `ifade` (SELECT listesi, WHERE, ON, HAVING, ORDER BY, GROUP BY, SET, RETURNING, VALUES dışı ifade yerleri), `kolon` (INSERT kolon listesi, `SET` sol tarafı, DDL kolon yerleri, `CREATE INDEX … (`), `tip` (`::`, `CAST(… AS`, kolon tanımı), `çağrı` (`CALL ` sonrası; `CALL p(` içi ifade yuvasıdır), `anahtar` (diğer). `x.` / `a.b.` sonrası ayrı bir yuva değil, yuvanın üstüne binen niteleyicidir: x şema mı ilişki mi takma ad mı motor çözer.
- Belirsiz kolon: aynı kapsamda birden çok ilişkide aynı adlı kolon varsa her biri ayrı öneri, `detail` = `tip · ilişki`, `eklenecek` = `takma_ad_ya_da_tablo.kolon`.
- JOIN önerisi: JOIN anahtar kelimesinden sonraki ilişki yuvasında, kapsamdaki katalog ilişkileriyle (CTE/alt sorgu değil) FK'si olan her ilişki ve her FK için bir öneri. `eklenecek` = `<yeni ilişki adı, gerekirse şema önekli> ON <yeni>.<k1> = <taraf>.<r1> [AND …]`; taraf takma adı varsa takma ad. `ON` yuvasında son JOIN'lenen ilişkiyle diğerleri arasındaki FK koşulları ayrıca önerilir.
- Fonksiyonlar: ifade yuvasında prosedürler dışında tümü (aggregate ve window dahil); ilişki yuvasında yalnızca `FROM`/`JOIN` sonrası (UPDATE, INSERT INTO, DELETE FROM değil) ve yalnızca set-returning; `çağrı` yuvasında (`CALL `) yalnızca prosedürler. `şema.` niteleyicisinden sonra (görünür şema ya da `pg_catalog`; takma ad değilse) o şemanın yuvaya uyan fonksiyonları öneksiz. Ad başına (şema içinde) tek öneri; `detail` = ilk imza `(argümanlar) → dönüş` (prosedürde `→ dönüş` yok) ve aşırı yükleme varsa ` +N`; `info` = her satırda bir imza `ad(argümanlar) → dönüş`, ardından boş satır ve ilk açıklamalı aşırı yüklemenin açıklaması. `eklenecek` = `ad()`; imleç parantezin içinde, ancak tek imza ve argümansızsa sonunda. `pg_catalog` ve `defaultSchema` fonksiyonları öneksiz (`FONKSIYON` bandı), diğer şemalarınki şema önekli (`DIGER_SEMA` bandı).
- Anahtar kelimeler: yuva türüne ve önceki anahtar kelimeye göre küçük sabit tablolar (ifade başı, SELECT sonrası, FROM sonrası, WHERE ifadesi içi, JOIN türleri, DDL başlangıçları vb.); çok kelimeli gruplar tek öneri. Harf durumu: önek tamamen küçük harfse küçük, en az bir büyük harf içeriyorsa BÜYÜK; önek boşsa BÜYÜK.
- Öncelik bantları (`ONCELIK`, yüksekten düşüğe): `KAPSAM` 50 (FROM kolonları ve kapsamdaki takma adlar/CTE'ler) > `JOIN_FK` 40 > `ILISKI` 30 (`defaultSchema`'daki öneksiz ilişkiler, `şema.` sonrası adlar) > `FONKSIYON` 20 > `TIP` 10 > `ANAHTAR` 0 > `DIGER_SEMA` -20 (`defaultSchema` dışı şemalardaki önekli adlar). Bant içi sıra CodeMirror'ın eşleşme puanına bırakılır.
- Tanımlayıcı tırnaklama: mevcut `quoteIdent` ve "çıplak tanımlayıcı mı" kuralı (küçük harf, ayrılmış kelime değil) kullanılır. Kullanıcı `"` ile başladıysa aralık tırnağı da kapsar ve eklenen ad tırnaklıdır.
- Katalog → arama dizinleri (ilişkiler ad ve şemaya göre, kolonlar ilişki başına, FK'ler ilişki başına iki yönlü, fonksiyonlar ada göre gruplu) katalog değişince bir kez kurulur ve katalog nesnesine bağlı olarak önbelleğe alınır; her tuşta yeniden kurulmaz.
- Katalog `null` ise: anahtar kelimeler, metinden çıkan adlar (CTE, takma ad, alt sorgu ve kolonları) ve yaygın tipler.
- Mevcut `catalogCompletion` / `filterCompletion` (lang-sql `SQLNamespace` üreticileri) kaldırılır; `searchTables` ve `changesCatalog` aynen kalır.

### core: Katalog (değişen)

- `Catalog`'a eklenir:
  - `fkler`: `{ ad, kaynak: { sema, ad, kolonlar[] }, hedef: { sema, ad, kolonlar[] } }` dizisi; kolonlar FK sırasıyla eşleşik. Yalnızca iki ucu da görünür şemalarda olanlar.
  - `fonksiyonlar`: `{ sema, ad, tur: 'f' | 'p' | 'a' | 'w', argumanlar: string (pg_get_function_arguments), donus: string (pg_get_function_result; prosedürde boş), kumeDondurur: boolean (proretset), aciklama: string | null }` dizisi (aşırı yükleme başına bir satır; şema, ad, sonra OID sırasıyla).
- `buildCatalog`'un girdi satırlarına FK ve fonksiyon satırları eklenir; dönüştürme saf ve birim testli kalır.
- `changesCatalog` değişmez (`CREATE FUNCTION` zaten `CREATE`).

### server: Katalog okuması (değişen)

- Mevcut katalog okumasına, aynı kısa süreli client ve aynı zaman aşımıyla iki sorgu eklenir:
  - FK: `pg_constraint` (`contype = 'f'`), `conkey`/`confkey` sırasıyla kolon adlarına çözülür; iki ucun şeması da görünür şemalar listesinde olmalı.
  - Fonksiyon: `pg_proc` (`prokind` `f|p|a|w`), görünür şemalar + `pg_catalog`; `pg_get_function_arguments`, `pg_get_function_result`, `proretset`, `obj_description(oid, 'pg_proc')`. `pg_catalog`'da argüman ya da dönüş tiplerinden biri `internal`, `trigger`, `event_trigger`, `language_handler`, `fdw_handler`, `index_am_handler`, `table_am_handler`, `tsm_handler` olanlar dışarıda.
- REST uçları ve yenileme kuralları değişmez; yanıt yalnızca yeni alanlarla genişler.

### web: Editör ve kutular (değişen)

- Editöre lang-sql yalnızca `dialect: PostgreSQL` ile, `schema`/`defaultSchema` olmadan verilir; lang-sql'in anahtar kelime tamamlaması devre dışı bırakılır (tek kaynak bizim motor).
- `autocompletion({ override: [motor kaynağı] })`: kaynak, motoru çağırıp sonucu CodeMirror `CompletionResult`'a çevirir (`boost`, `apply` + imleç konumu, `info`). `activateOnTyping` açık, `.` sonrası da tetiklenir; yazarken imleçte kelime yoksa (ör. boşluktan sonra) popup kendiliğinden açılmaz, Ctrl+Space açar.
- Tuş eşlemesi: Ctrl+Space popup'ı açar (tüm platformlarda), Enter `from`–imleç aralığına ekler, Tab popup açıkken `from`–`to` aralığını değiştirir; popup kapalıyken Tab bugünkü davranışında kalır.
- Editörün tamamlama girdisi artık `CompletionConfig` değil `TamamlamaGirdisi` = `{ katalog | null, gorunurSemalar, ortukTablo? }` (`src/web/script/tamamlama.ts`); katalog değişince eklenti yeniden yapılandırılır (bugünkü Compartment yolu).
- Tablo sekmesinin `WHERE`/`ORDER BY` kutuları aynı kaynağı `ortukTablo` ve kutu türüyle kullanır; katalog yokken de (anahtar kelimeler için) girdi verilir.
- Katalogun ne zaman istendiği değişmez (yalnızca kullanıcı eylemi).

## Testing Decisions

- **İyi test**: dış davranışı test eder: verilen metin + imleç + katalog için hangi önerilerin, hangi sırayla, hangi eklenecek metinle döndüğü. Bağlam analizinin ara yapıları (kapsam ağacı, yuva türü) doğrudan test edilmez.
- **Seam'ler** (kullanıcıyla onaylandı):
  1. **core: `tamamla`** (ana seam). Tablo tabanlı testler; metinde imleç `|` ile işaretlenir, küçük bir fixture katalog (iki şema, FK'li birkaç tablo, bileşik FK, büyük harfli/tırnak gerektiren adlar, aşırı yüklenmiş fonksiyonlar, SRF, prosedür, kullanıcı tipi) kullanılır. Kapsam: tüm yuva türleri, ifade sınırı, yorum/dizge içi, CTE/alt sorgu kolonları ve çıkarılamayan kolonlar, ilişkili alt sorgu, `SELECT | FROM t`, belirsiz kolonlar, nitelikli adlar (şema / ilişki / takma ad / `şema.tablo.`), görünmez şemalar, JOIN-FK (iki yön, bileşik, çoklu FK, takma ad, `ON` yuvası), fonksiyon filtreleri ve imleç konumu, DDL ve tip yuvaları, anahtar kelime harf durumu, öncelik bantları, `örtükTablo` (WHERE ve ORDER BY), katalog `null`, `from`/`to` aralığı (kelime ortasında imleç, tırnakla başlayan ad). Katalogdan dizin kurma bu seam'in arkasında kalır; ayrıca bir büyük fixture (ör. 5.000 tablo, 3.000 fonksiyon) ile tek çağrının süre bütçesi kontrol edilir.
  2. **core: `buildCatalog`** (mevcut testler genişler): FK ve fonksiyon satırlarının dönüştürülmesi.
  3. **server: katalog entegrasyon testi** (mevcut seam genişler; gerçek PG gereken yerde `describePg`): FK'ler (bileşik sıra, görünmez şemaya giden FK'nin atlanması), fonksiyonlar (iç tiplerin filtrelenmesi, aşırı yüklemeler, prosedür/aggregate/window türü, SRF, açıklama), DDL commit (`CREATE FUNCTION`) sonrası `katalogYenilendi` ile yeni fonksiyonun gelmesi, açılışta hiçbir sorgu gitmemesi.
  4. **web: editör yapılandırması** (mevcut seam): editöre bizim kaynağımızın bağlandığı ve lang-sql'e `schema` verilmediği, Tab/Enter/Ctrl+Space eşlemeleri, kutularda `örtükTablo`'nun geçirildiği, katalogun yalnızca kullanıcı eylemiyle istendiği. CodeMirror'ın popup davranışı test edilmez.
- **Prior art**: core'da `katalog.test.ts`, `ifade-bolme.test.ts`, `kisayollar.test.ts` (tablo tabanlı); server'da `katalog.test.ts`, `fonksiyon-oynakligi.test.ts` (`describePg`, sahte Postgres); web'de `Katalog.test.tsx`, `TabloSekmesi.test.tsx`.

## Out of Scope

- Otomatik takma ad (tablo seçilince `customer_orders co`).
- `SELECT *` açma (kolon listesine genişletme).
- `VALUES (` içinde kolon sırasına göre ipucu ve parametre bilgisi (imza ipucu balonu).
- Canlı şablonlar (`sel`, `ins`, `upd`).
- "Son kullanılanlar" sıralaması ve kalıcı tamamlama istatistikleri.
- İkinci Ctrl+Space ile genişleyen liste.
- Anahtar kelime harf durumu ayarı.
- Bu dilimde listelenenler dışındaki DDL bağlamları (ör. `CREATE TRIGGER`, `GRANT`, `ALTER FUNCTION` hedefleri).
- Lint/hata işaretleme (bilinmeyen tablo/kolon).

## Further Notes

- **Uygulama sırası**: [issues/](issues/) altındaki ticket'lar. 01 (motor iskeleti + editöre bağlanması + kutular) önce; 02–06 yalnızca 01'e bağlı, paralel yürüyebilir; 07 (performans) 02, 03 ve 04'ten sonra. Öncelik bantlarını her ticket kendi öneri türü için atar. 01 bitince ikinci dilimin tamamlama davranışı kaybolmadan bağlam bilen hâle gelinmiş olur.
- **Bilinen riskler**: yarım SQL'de bağlam tahmini yanılabilir; yanıldığında daha geniş (anahtar kelime) listeye düşmek boş liste vermekten iyidir. Büyük `pg_catalog` fonksiyon listesi katalog yanıtını büyütür (yaklaşık birkaç yüz KB); gerekirse yerleşik fonksiyonlar hedef başına değil sunucu sürümü başına önbelleğe alınabilir (bu dilimde yapılmaz).
- **ADR ve sözlük**: ADR-0005 ve GLOSSARY güncellemeleri (Tamamlama bağlamı; Katalog önbelleğine FK ve fonksiyonlar) bu spec'le birlikte yazıldı.
