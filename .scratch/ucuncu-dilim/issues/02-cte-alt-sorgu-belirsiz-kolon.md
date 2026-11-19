# 02: CTE, alt sorgu ve belirsiz kolonlar

Spec: [CTE ve alt sorgular](../spec.md#cte-ve-alt-sorgular), [Belirsiz kolonlar](../spec.md#belirsiz-kolonlar), [Bağlam](../spec.md#bağlam) (13–14), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** `WITH x AS (…)` ile tanımlanan CTE'ler ve `FROM (SELECT …) s` alt sorguları ilişki gibi tanınır: adları ilişki yuvasında, kolonları ifade yuvasında ve `s.` sonrasında önerilir. İlişkili alt sorguda dış sorgunun ilişkileri görünür. Aynı adlı kolon FROM'daki birden çok ilişkide varsa ayrı satırlarda gösterilir ve seçilince nitelikli eklenir. Katalog yokken de çalışır (adlar metinden çıkar).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] CTE adı ilişki yuvasında önerilir (`variable` türü, yüksek bant); `WITH RECURSIVE` CTE'si kendi gövdesinde de.
- [ ] CTE kolonları: açık kolon listesi (`WITH x(a, b) AS`) varsa o; yoksa iç SELECT listesinden `AS ad`, tek tanımlayıcı ya da `x.ad`'nin son parçası.
- [ ] Alt sorgu takma adı ve kolonları aynı kuralla.
- [ ] Kolonları çıkarılamayan (`*`, adsız ifade) CTE/alt sorgu yalnızca ad olarak önerilir; kolon önerilmez.
- [ ] CTE/alt sorgu kolonu katalog ilişkisi kolonu gibi ifade yuvasında ve `ad.` sonrasında önerilir; `detail`'de tip yerine kaynak.
- [ ] İlişkili alt sorgu: iç kapsam dış kapsamların ilişkilerini ve takma adlarını görür; iç kapsamda aynı ad dıştakini gölgeler.
- [ ] Belirsiz kolon: her ilişki için ayrı öneri, `detail` = `tip · ilişki`, `eklenecek` = `takma_ad_ya_da_tablo.kolon`; belirsiz olmayanlar öneksiz kalır.
- [ ] Testler (core `tamamla`): CTE adı/kolonları (açık liste, AS, `*`), RECURSIVE, alt sorgu, ilişkili alt sorgu ve gölgeleme, belirsiz kolonlar (takma adlı ve adsız), katalog `null` iken CTE kolonları.
