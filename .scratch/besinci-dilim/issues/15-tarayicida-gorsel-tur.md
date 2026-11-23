# 15: Tarayıcıda görsel tur

Spec: [Testing Decisions](../spec.md#testing-decisions), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema)

**What to build:** Ticket 14'ün görsel turu yapılamadı (ajanın tarayıcı eklentisi bağlı değildi). Beşinci dilim gerçek bir yerel veritabanıyla gerçek bir tarayıcıda açılır; açık ve koyu temada, 900×700 ve geniş pencerede ekran görüntüsüyle bakılır. Önceki ticket'ların görsel kontrole bıraktığı maddeler burada kapanır; kusurlar düzeltilir ya da yeni ticket olur.

**Blocked by:** 14

**Status:** done (a23ad74)

Yerel demo: embedded-postgres ile `numeric`/NULL/`jsonb` kolonlu, PK'lı bir tablo, PK'sız bir tablo ve `RAISE NOTICE`/`RAISE WARNING` (DETAIL/HINT) yapan bir fonksiyon; biri `dev`, biri `prod` etiketli iki bağlantı. Uygulama geçici bir yapılandırma dizini ve sahte keychain ile `startServer`'dan açılırsa gerçek `tezgah.json`'a ve anahtar zincirine dokunulmaz.

- [x] Konsol: Çalışacak aralık vurgusu, hata işareti, karar şeridi, Sonuç alanı sekmeleri, Bildirimler sekmesi (seviye renkleri, DETAIL/HINT); açık/koyu, 900×700/geniş.
- [x] Dolu Sonuç grid'i: sayısal kolonlar sağa yaslı ve `tabular-nums`, NULL görünümü, satır hover, seçim ve düzenlenmiş hücre renkleri, tip etiketi en az 11 px, Durum çubuğunda seçim özeti (ticket 07'nin açık maddesi).
- [x] Ctrl+Shift+C Chrome'da DevTools öğe seçicisi yerine sayfaya ulaşıyor mu (ticket 07 yorumu).
- [x] Tablo sekmesi: bekleyen değişiklikler, tablo başlığındaki kilit düğmesi.
- [x] prod hedef: salt okunur ve yazma açık görünümleri token'larla (`--env-prod`); "YAZMA AÇIK" 900×700 pencerede kesilmez (ticket 12'nin açık maddesi).
- [x] Editör renklendirmesi açık ve koyu temada `SELECT … FROM … WHERE 'x' -- yorum` okunur; tema geçişinde editör renkleri değişir (ticket 01'in açık maddesi, ticket 04 yorumu).
- [x] Düğme türleri, rozetler, stillenmiş radyo/onay kutusu/tarih alanı (ticket 06 yorumu); diyalog açıkken gelen toast'ın görünürlüğü (ticket 05 yorumu).
- [x] 900×700'de araç çubuğu tek satırda, taşan eylemler "⋯" menüsünde; geçmiş çekmecesi editörü daraltmaz; Durum çubuğu görünümü (ticket 10 yorumu). Bölücü sürükleme hissi ve Tablo sekmesinin alanı doldurması (ticket 09 yorumu).
- [x] Palet ve `?` kısayol sayfası.
- [x] Görülen kusurlar düzeltilir ya da `.scratch/besinci-dilim/issues/` altında yeni ticket olur; gözlemler bu dosyanın `## Comments` bölümüne yazılır, ekran görüntüleri repoya konmaz.

## Comments

- Tur Playwright (Chromium, headless) ile yapıldı: embedded-postgres demo (127.0.0.1, geçici yapılandırma dizini, sahte keychain), `colorScheme` açık/koyu ve paletteki Tema komutları, 900×700, 1600×1000 ve taşma menüsü için 700×700. Ekran görüntüleri ajanın geçici dizininde kaldı. Hiçbir senaryoda sayfa konsolunda hata/uyarı yoktu.
- Kusur, düzeltildi: Çalışacak aralık zemini (`--vurgu` %8) aktif satırın dışında neredeyse görünmüyordu (çok satırlı ifadenin ikinci satırı); %14'e çıktı, iki temada da seçilir.
- Kusur, düzeltildi: yazma açıkken kilit düğmesine tıklandıktan sonra imleç üstünde kalınca genel hover zemini kırmızıydı, "YAZMA AÇIK" kırmızı zeminde kırmızı yazı oldu; "Çalıştırma kayıtları klasörünü aç" bağlantısı kırmızı başlıkta mavi kaldı. İkisi de başlık içinde zıt renge döndü.
- Kusur, düzeltildi: sağ tık menüsü yalnız yatayda pencereye sığdırılıyordu; 900×700'de grid'in "Kopyala" alt menüsü pencerenin altından taşıyor, JSON/INSERT tıklanamıyordu. Konum ölçülüp iki eksende sığdırılıyor (`src/core/menu-konumu.ts`, testli); menü pencereden uzunsa kaydırılır.
- Kusur, düzeltildi: hızlı geçiş paletinin perdesi z-index'siz olduğu için Tablo sekmesinin yapışkan grid başlığı paletin arama kutusunun üstünde çiziliyordu; perde grid ve geçmiş çekmecesinin üstüne, toast'ların altına alındı.
- Kusur, düzeltildi: 900×700'de Tablo sekmesinin başlığı tek satıra sığmayınca WHERE/ORDER BY çerçevesi sıfıra iniyor, etiketler üst üste biniyordu. Başlık sarılır, çerçeve en az 320 px kalır (dar pencerede eylemlerle alt satıra iner). Kutuların yer tutucusu görünür etiketi tekrarlıyordu ("WHERE WHERE"); kaldırıldı.
- Doğrulanan: Ctrl+Enter yalnız imleçteki ifadeyi, Ctrl+Alt+Enter tümünü çalıştırır; hata (`1/0`) doğru satırda X, kırmızımsı zemin ve dalgalı çizgiyle, sonraki ifade "–" ile; karar şeridi hata sonrası yalnız Rollback, başarıda Commit/Rollback; Sonuç sekmeleri (SELECT · satır N, Log, Bildirimler (4)); DO bloğundaki ve fonksiyondaki NOTICE/WARNING doğru satırla, WARNING turuncu rozetli, DETAIL/HINT ayrı satırda.
- Doğrulanan grid: sayısal kolonlar sağa yaslı ve `tabular-nums`, NULL italik soluk, tip etiketi 11 px, hover ve seçim zemini, düzenlenen hücre turuncumsu; 4 hücre seçimi Durum çubuğunda "4 hücre · 4 sayı · Toplam … · Ortalama …". Pano: Ctrl+C TSV, Ctrl+Shift+C başlıklı TSV, menüden CSV/Markdown (sayısal kolon `---:`)/JSON doğru metni yazdı (Windows'ta satır sonu CRLF).
- Ctrl+Shift+C kutusu açık: Playwright tuşu CDP ile doğrudan sayfaya gönderir, tarayıcının kendi kısayollarını (DevTools öğe seçicisi) atlar; sayfanın tuşu işlediği doğrulandı ama gerçek Chrome'da DevTools'un önce yakalayıp yakalamadığı ancak elle denenebilir.
- Doğrulanan prod: salt okunurken başlık kırmızımsı, "Salt okunur" düğmesi; yazma açıkken başlık dolu kırmızı, "YAZMA AÇIK" 900×700'de kesilmiyor (scrollWidth = clientWidth). Uygulama çerçevesi yalnız prod konsol/tablo sekmesi öndeyken; bağlantı formu açıkken uygulama çerçevesi yok, formun kendi kırmızı çerçevesi yalnız prod etiketli bağlantıyı düzenlerken (ticket 12'deki karar). Tablo sekmesinde kilit başlıkta, yazma açıkken dolu kırmızı düğme.
- Doğrulanan yerleşim: 900×700'de araç çubuğu tek satır (taşma yok); 700×700'de "Tümünü dene/çalıştır" "⋯" menüsünde. Geçmiş çekmecesi editörün üstüne açılır, editör ölçüsü değişmedi; radyo/onay kutusu/tarih alanı stilli (tarih alanı tarayıcı yereline göre mm/dd/yyyy). Bölücü fareyle akıcı sürükleniyor, sürüklerken mavi çizgi; daraltınca yalnız sekme şeridi kalır. Tablo sekmesi alanı dolduruyor. Durum çubuğu tek satır. Yeni klasör diyaloğunda Tab döngüsü diyalog içinde, Esc kapatıyor, odak halkası görünür; diyalog açıkken gelen toast perdenin üstünde okunur. Palet (Ctrl+K, tema komutları "etkin" rozetli) ve `?` kısayol sayfası iki temada okunur; tema komutuyla editör renkleri anında değişiyor.
- Küçük gözlemler (ticket açılmadı): toast'lar sağ alttaki "?" ve sürüm yazısının üstüne biniyor (birkaç saniye); gezgin, konsol bağlıyken bağlantıyı "Bağlan ve tüm veritabanlarını listele" ile gösteriyor (gezgin bağlantısı konsoldan ayrı); 900×700'de hedef başlığındaki "Çalıştırma kayıtları klasörünü aç" ikinci satıra sarılıyor; bağlantı formunda renk seçilmemişken renk kutusu siyah görünüyor.
- 2026-11-23, elle denendi: gerçek Chrome'da Ctrl+Shift+C DevTools öğe seçicisini açıyor, sayfaya ulaşmıyor. Kullanıcı kararıyla kısayol kaldırıldı (0.5.1); başlıklı TSV yalnızca Kopyala alt menüsünde, spec hikâye 77 ve Grid kararı güncellendi.
