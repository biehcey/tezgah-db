# 12: Prod sinyali

Spec: [Prod sinyali (hikâyeler)](../spec.md#prod-sinyali) (hikâye 92–95), [Prod sinyali (karar)](../spec.md#prod-sinyali-1)

**What to build:** Yazma kilidi tek bir yerde, hedef başlığındaki tek bir kontrolle görünür ve değişir: salt okunurken sakin (kilit ikonu, "Salt okunur"), yazma açıkken başlık dolu kırmızı ve "YAZMA AÇIK" etiketli. Alt araç çubuğundaki ikinci kontrol ve başlıktaki ayrı kilit rozeti kalkar. Yazma modu bugünkü gibi tek tıkla açılır, çalıştırmadan önce ayrıca onay istenmez; kilidin kuralları (sekme ve hedef başına, hedef değişince ya da sekme diskten gelince kapalı) değişmez. Kırmızı uygulama çerçevesi yalnızca prod hedefli bir konsol ya da Tablo sekmesi görünürken çizilir; bağlantı formu, içe aktarma gibi ekranlarda çizilmez.

**Blocked by:** 06, 09

**Status:** ready-for-agent

- [ ] Kilit kontrolü yalnızca hedef başlığında; alt araç çubuğu kontrolü ve ayrı rozet kaldırılır.
- [ ] Salt okunur/yazma açık görünümleri token'larla (`--env-prod`); "YAZMA AÇIK" 900×700 pencerede kesilmez.
- [ ] Kırmızı çerçeve koşulu: görünen ekran konsol ya da Tablo sekmesi ve hedef `prod`.
- [ ] Onay penceresi eklenmez (değişmez kural).
- [ ] Testler (arayüz): prod hedefte kilit kontrolü tek tanedir ve tek tıkla durum değiştirir; yazma açıkken "YAZMA AÇIK" görünür; prod konsolu açıkken yeni bağlantı formuna geçilince çerçeve kaybolur, konsola dönülünce geri gelir; mevcut yazma kilidi testleri geçer.

## Comments
