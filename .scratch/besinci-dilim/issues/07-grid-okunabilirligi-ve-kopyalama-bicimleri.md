# 07: Grid okunabilirliği ve kopyalama biçimleri

Spec: [Grid okunabilirliği ve kopyalama](../spec.md#grid-okunabilirliği-ve-kopyalama), [Grid](../spec.md#grid), [Kısayol kataloğu ve palet](../spec.md#kısayol-kataloğu-ve-palet) (Menu desteği), [Testing Decisions](../spec.md#testing-decisions)

**What to build:** Sonuç grid'inde ve Tablo sekmesinde sayısal kolonlar (başlıklarıyla birlikte) sağa yaslanır ve rakamlar sabit genişlikte hizalanır; üzerine gelinen satır vurgulanır; kolon tipi okunur boyutta yazar. Grid'in sağ tık menüsünde "Kopyala" alt menüsü TSV, başlıklı TSV, CSV, Markdown, JSON ve (bugünkü) INSERT seçeneklerini sunar; Ctrl/Cmd+C bugünkü gibi başlıksız TSV, Ctrl/Cmd+Shift+C başlıklı TSV kopyalar. Kopyalamadan sonra "N satır CSV olarak kopyalandı" gibi kısa bir geri bildirim görünür.

**Blocked by:** 01

**Status:** done (a168647)

- [x] core kolon hizası: `int2`, `int4`, `int8`, `numeric`, `float4`, `float8`, `money`, `oid` → sağ; diğerleri sol. Sağ kolonlarda `tabular-nums`.
- [x] Satır hover vurgusu; seçim ve düzenlenmiş hücre renkleri token'lara bağlı; tip etiketi en az 11 px.
- [x] core kopyalama modülü: `toCsv` (RFC 4180, başlıklı, NULL boş alan, boş metin `""`), `toMarkdown` (başlık + ayırıcı, `|` ve satır sonu kaçışı, sayısal kolonlar `---:`), `toJson` (nesne dizisi; NULL `null`, `bool` true/false, `int2`/`int4`/`float` sayı, `int8`/`numeric` metin, `json`/`jsonb` iç içe; yinelenen adlar `ad`, `ad_2`), başlıklı `toTsv`. Tam (kesilmemiş) değerlerle çalışır.
- [x] `Menu` alt menü ve ayırıcı destekler; grid menüsünde "Kopyala ▸" grubu.
- [x] Ctrl/Cmd+Shift+C başlıklı TSV.
- [x] Kopyalama geri bildirimi (ticket 05 bittiyse toast, bitmediyse mevcut mesaj yolu).
- [x] Testler: core (kolon hizası; her biçim için NULL, boş metin, tırnak, `|`, satır sonu, yinelenen kolon, `int8`/`numeric`, `jsonb`); arayüz (Kopyala alt menüsünden her biçim panoya beklenen metni yazar; Ctrl/Cmd+Shift+C başlıklı TSV). Hizalama jsdom'da görünür davranış olarak sınanamaz; core'daki kolon hizası testi yeterlidir, görünüm ticket 14'teki görsel turda doğrulanır.

## Comments

- Hover/token/11 px maddesi kodda yapıldı (`.grid-veri-satiri:hover` `--kenar-zemin`; seçim `--vurgu`, düzenlenen hücre `--dikkat` karışımı; `.grid-kolon-tipi` `--yazi-11`), ama görünüm jsdom'da sınanamaz; ticket 14'teki görsel turda açık ve koyu temada bakılınca işaretlenecek. Sağa yaslı kolonların görünümü de orada doğrulanır.
- Geri bildirim: ticket 05 (Bildirimler) henüz birleşmediği için grid kendi `role="status"` kısa bilgisini (`.grid-kopyalama-bilgisi`, 3 sn) gösteriyor; uygulamanın mevcut bilgi satırı App'te olduğu için grid'den erişilemiyor. Ticket 05 bunu toast'a taşıyınca `SonucGridi`'deki `feedback` durumu ve CSS sınıfı kaldırılmalı. Bildirim Ctrl/Cmd+C, # ve satır numarası kopyalamalarında da görünür; pano reddederse "Panoya kopyalanamadı".
- "INSERT olarak kopyala" artık "Kopyala ▸" alt menüsünde "INSERT" adıyla; Katalog ve ScriptEkrani testleri buna göre güncellendi.
- Görsel turda bakılacak: Chrome'da Ctrl+Shift+C DevTools'un öğe seçicisini açabilir; sayfa tuşu yakalayabiliyor mu, gerçek tarayıcıda denenmeli.
- Spec'teki Grid maddesi, kodun netleştirdiği kurallarla yeniden yazıldı (kolonlar seçili aralıktan; Markdown NULL `NULL`, satır sonu `<br>`; JSON'da `NaN`/`Infinity` metin, anahtar sırası korunur).
- Ticket 14: görsel tur bu oturumda yapılamadı (tarayıcı eklentisi bağlı değildi); bu kutu açık kaldı ve [ticket 15](15-tarayicida-gorsel-tur.md)'e taşındı.
- Ticket 15: tarayıcıda doğrulandı (hover ve seçim zemini, düzenlenen hücre turuncumsu, tip etiketi 11 px, sayısal kolonlar sağa yaslı `tabular-nums`); kutu işaretlendi. Ctrl+Shift+C sayfaya ulaşıyor (başlıklı TSV yazıldı), ama Playwright tuşu tarayıcının kendi kısayollarını atlayarak gönderdiği için gerçek Chrome'daki DevTools çakışması elle denenmeli.
