# 07: Grid okunabilirliği ve kopyalama biçimleri

Spec: [Grid okunabilirliği ve kopyalama](../spec.md#grid-okunabilirliği-ve-kopyalama), [Grid](../spec.md#grid), [Kısayol kataloğu ve palet](../spec.md#kısayol-kataloğu-ve-palet) (Menu desteği), [Testing Decisions](../spec.md#testing-decisions)

**What to build:** Sonuç grid'inde ve Tablo sekmesinde sayısal kolonlar (başlıklarıyla birlikte) sağa yaslanır ve rakamlar sabit genişlikte hizalanır; üzerine gelinen satır vurgulanır; kolon tipi okunur boyutta yazar. Grid'in sağ tık menüsünde "Kopyala" alt menüsü TSV, başlıklı TSV, CSV, Markdown, JSON ve (bugünkü) INSERT seçeneklerini sunar; Ctrl/Cmd+C bugünkü gibi başlıksız TSV, Ctrl/Cmd+Shift+C başlıklı TSV kopyalar. Kopyalamadan sonra "N satır CSV olarak kopyalandı" gibi kısa bir geri bildirim görünür.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] core kolon hizası: `int2`, `int4`, `int8`, `numeric`, `float4`, `float8`, `money`, `oid` → sağ; diğerleri sol. Sağ kolonlarda `tabular-nums`.
- [ ] Satır hover vurgusu; seçim ve düzenlenmiş hücre renkleri token'lara bağlı; tip etiketi en az 11 px.
- [ ] core kopyalama modülü: `toCsv` (RFC 4180, başlıklı, NULL boş alan, boş metin `""`), `toMarkdown` (başlık + ayırıcı, `|` ve satır sonu kaçışı, sayısal kolonlar `---:`), `toJson` (nesne dizisi; NULL `null`, `bool` true/false, `int2`/`int4`/`float` sayı, `int8`/`numeric` metin, `json`/`jsonb` iç içe; yinelenen adlar `ad`, `ad_2`), başlıklı `toTsv`. Tam (kesilmemiş) değerlerle çalışır.
- [ ] `Menu` alt menü ve ayırıcı destekler; grid menüsünde "Kopyala ▸" grubu.
- [ ] Ctrl/Cmd+Shift+C başlıklı TSV.
- [ ] Kopyalama geri bildirimi (ticket 05 bittiyse toast, bitmediyse mevcut mesaj yolu).
- [ ] Testler: core (kolon hizası; her biçim için NULL, boş metin, tırnak, `|`, satır sonu, yinelenen kolon, `int8`/`numeric`, `jsonb`); arayüz (Kopyala alt menüsünden her biçim panoya beklenen metni yazar; Ctrl/Cmd+Shift+C başlıklı TSV). Hizalama jsdom'da görünür davranış olarak sınanamaz; core'daki kolon hizası testi yeterlidir, görünüm ticket 14'teki görsel turda doğrulanır.

## Comments
