# 01: Kendi tamamlama motoru: ilişki ve kolon yuvaları

Spec: [Bağlam](../spec.md#bağlam), [Nitelikli adlar](../spec.md#nitelikli-adlar), [Tuşlar ve popup](../spec.md#tuşlar-ve-popup), [Tablo sekmesi kutuları](../spec.md#tablo-sekmesi-kutuları), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf), [web: Editör ve kutular](../spec.md#web-editör-ve-kutular-değişen), [Testing Decisions](../spec.md#testing-decisions) · ADR-0005

**What to build:** Editör ve Tablo sekmesinin `WHERE`/`ORDER BY` kutuları lang-sql'in `schema` tamamlaması yerine core'daki kendi motorumuzu kullanır. Motor imlecin Tamamlama bağlamını metinden çıkarır: ilişki beklenen yerde (`FROM`, `JOIN`, `UPDATE`, `INSERT INTO`, `DELETE FROM`) yalnızca ilişkiler, ifade beklenen yerde (SELECT listesi, `WHERE`, `ON`, `ORDER BY`, `GROUP BY`, `HAVING`, `SET`, `RETURNING`) FROM'daki ilişkilerin kolonları öneksiz ve takma adlar; kolon yuvalarında (`INSERT INTO t (`, `SET` sol tarafı) o ilişkinin kolonları. Nitelikli adlar (`şema.`, `x.`, `şema.tablo.`) çözülür. Tuşlar IntelliJ gibidir. Anahtar kelimeler bu ticket'ta düz bir liste olarak önerilir (bağlama göre olanı 06). Kolonlar ve takma adlar en yüksek öncelik bandındadır.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] core: `tamamla(metin, imleç, katalog | null, seçenekler)` → `{ from, to, öneriler } | null`; seçenekler görünür şemalar ve `örtükTablo` (şema + tablo + kutu türü). Öneri alanları spec'teki gibi (`etiket`, `tür`, `detail`, `info?`, `eklenecek`, imleç konumu, `öncelik`).
- [ ] İfade sınırları ifade bölücüden, tokenlar onun lexer'ından; imleç yorum ya da dizgedeyse `null`. Motor yalnızca imlecin ifadesine bakar.
- [ ] Parantez derinliğiyle kapsamlar; kapsamın FROM'u imleçten bağımsız toplanır (`SELECT | FROM t` t'nin kolonlarını önerir).
- [ ] İlişki yuvasında görünür şemaların ilişkileri; `defaultSchema`'dakiler öneksiz, diğerleri `şema.` önekli; ilişki türü `detail`'de. Görünmez şemalar hiçbir yuvada önerilmez.
- [ ] İfade yuvasında FROM ilişkilerinin kolonları (tip `detail`'de) ve takma adlar / takma adsız ilişki adları.
- [ ] Kolon yuvaları: `INSERT INTO t (`, `UPDATE t SET` sol tarafı.
- [ ] Nitelikli adlar: `takma_ad.` / `tablo.` → kolonlar; `şema.` → yuvaya göre ilişkiler; `şema.tablo.` → kolonlar.
- [ ] Tırnaklama: çıplak olmayan adlar `quoteIdent` ile; `"` ile başlanan adda aralık tırnağı kapsar.
- [ ] `from`–`to`: `to` imlecin sağındaki kelime kalanını kapsar.
- [ ] Katalog `null` iken anahtar kelimeler ve metinden çıkan takma adlar; motor hiçbir istek tetiklemez.
- [ ] web: lang-sql yalnızca `dialect: PostgreSQL` ile, `schema`/`defaultSchema` ve kendi anahtar kelime tamamlaması olmadan; `autocompletion({ override: [motor kaynağı] })`, yazarken ve `.` sonrası tetiklenir.
- [ ] Tuşlar: Ctrl+Space (tüm platformlarda) açar; Enter `from`–imleç aralığına ekler; popup açıkken Tab `from`–`to`'yu değiştirir; popup kapalıyken Tab bugünkü gibi.
- [ ] Editörün tamamlama girdisi `{ katalog | null, görünür şemalar, örtükTablo? }`; katalog değişince yeniden yapılandırılır; yenilenirken önceki katalogla sürer.
- [ ] Tablo sekmesi `WHERE`/`ORDER BY` kutuları aynı kaynağı `örtükTablo` ile kullanır.
- [ ] `catalogCompletion` / `filterCompletion` ve `CompletionConfig` kaldırılır; `searchTables`, `changesCatalog` aynen kalır.
- [ ] Testler: core `tamamla` tablo tabanlı (`|` imleç işareti, fixture katalog): yuvalar, ifade sınırı, yorum/dizge, `SELECT | FROM t`, nitelikli adlar, görünmez şemalar, tırnaklama, `from`/`to`, `örtükTablo`, katalog `null`. web: editöre bizim kaynağın bağlandığı, lang-sql'e `schema` verilmediği, tuş eşlemeleri, kutulara `örtükTablo` geçtiği, katalogun yalnızca kullanıcı eylemiyle istendiği.
