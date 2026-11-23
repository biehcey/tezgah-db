# 12: Prod sinyali

Spec: [Prod sinyali (hikâyeler)](../spec.md#prod-sinyali) (hikâye 92–95), [Prod sinyali (karar)](../spec.md#prod-sinyali-1)

**What to build:** Yazma kilidi tek bir yerde, hedef başlığındaki tek bir kontrolle görünür ve değişir: salt okunurken sakin (kilit ikonu, "Salt okunur"), yazma açıkken başlık dolu kırmızı ve "YAZMA AÇIK" etiketli. Alt araç çubuğundaki ikinci kontrol ve başlıktaki ayrı kilit rozeti kalkar. Yazma modu bugünkü gibi tek tıkla açılır, çalıştırmadan önce ayrıca onay istenmez; kilidin kuralları (sekme ve hedef başına, hedef değişince ya da sekme diskten gelince kapalı) değişmez. Kırmızı uygulama çerçevesi yalnızca prod hedefli bir konsol ya da Tablo sekmesi görünürken çizilir; bağlantı formu, içe aktarma gibi ekranlarda çizilmez.

**Blocked by:** 06, 09

**Status:** done (f37df84)

- [x] Kilit kontrolü yalnızca hedef başlığında; alt araç çubuğu kontrolü ve ayrı rozet kaldırılır.
- [x] Salt okunur/yazma açık görünümleri token'larla (`--env-prod`); "YAZMA AÇIK" 900×700 pencerede kesilmez.
- [x] Kırmızı çerçeve koşulu: görünen ekran konsol ya da Tablo sekmesi ve hedef `prod`.
- [x] Onay penceresi eklenmez (değişmez kural).
- [x] Testler (arayüz): prod hedefte kilit kontrolü tek tanedir ve tek tıkla durum değiştirir; yazma açıkken "YAZMA AÇIK" görünür; prod konsolu açıkken yeni bağlantı formuna geçilince çerçeve kaybolur, konsola dönülünce geri gelir; mevcut yazma kilidi testleri geçer.

## Comments

- Görünümler `--env-prod` ve `--metin-zit` token'larıyla yazıldı; etiket `nowrap` ve başlık sarılıyor, ama 900×700 pencerede kesilmediği gözle doğrulanmadı (görsel kontrol), bu yüzden ikinci kutu açık.
- Tablo sekmesinde de tek kontrol tablo başlığına taşındı (önceden bekleyenler ve kolon formu çubuklarındaydı). Başlık dolu kırmızı değil, kırmızımsı + kırmızı alt çizgi: WHERE/ORDER BY kutuları okunur kalsın. Spec güncellendi.
- Çerçeve içe aktarma sonucu penceresi açıkken de çizilmez.
- Ticket 14: görsel tur bu oturumda yapılamadı (tarayıcı eklentisi bağlı değildi); bu kutu açık kaldı ve [ticket 15](15-tarayicida-gorsel-tur.md)'e taşındı.
- Ticket 15: 900×700'de "YAZMA AÇIK" kesilmiyor; kutu işaretlendi. Turda bulunan iki kusur düzeltildi: tıklamadan sonra imleç üstündeyken kilit düğmesi kırmızı zeminde kırmızı yazıydı (hover zemini) ve "Çalıştırma kayıtları klasörünü aç" kırmızı başlıkta mavi kalıyordu.
