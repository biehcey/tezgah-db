# 14: Görsel tur ve 0.5.0

Spec: [Testing Decisions](../spec.md#testing-decisions), [Further Notes](../spec.md#further-notes)

**What to build:** Beşinci dilimin bütünü gerçek bir yerel veritabanıyla elle doğrulanır ve 0.5.0 olarak yayına hazırlanır. Uygulama açık ve koyu temada, 900×700 ve geniş pencerede açılır; konsol (Çalışacak aralık, hata, karar şeridi, Sonuç alanı sekmeleri, bildirimler), dolu bir Sonuç grid'i (sayısal hizalama, NULL, seçim özeti, kopyalama), Tablo sekmesi (bekleyen değişiklikler), prod hedef (salt okunur ve yazma açık), palet ve kısayol sayfası ekran görüntüsüyle kontrol edilir. Görülen kusurlar düzeltilir ya da yeni ticket olarak yazılır. README ve sürüm notu Ctrl/Cmd+Enter davranış değişikliğini anlatır.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13

**Status:** done (9d05df5)

- [x] Gerçek yerel veritabanıyla (ör. embedded-postgres ya da yerel bir sunucu) yukarıdaki ekranların açık/koyu ve dar/geniş ekran görüntüleri alınır; dosyalar repoya konmaz, gözlemler bu dosyanın `## Comments` bölümüne yazılır.
- [x] 1–13'ün kabul kriterleriyle çelişen bir görünüm varsa düzeltilir ya da `.scratch/besinci-dilim/issues/` altında yeni ticket açılır.
- [x] README: yeni kısayollar (Çalışacak aralık, Tümünü çalıştır, Ctrl/Cmd+F, Ctrl/Cmd+Shift+C, `?`), tema seçimi, Sunucu bildirimleri.
- [x] Sürüm 0.5.0'a çıkar; sürüm notunda Ctrl/Cmd+Enter'ın artık tüm script yerine Çalışacak aralığı çalıştırdığı açıkça yazar.
- [x] Spec'te uygulamayla ayrışan satırlar düzeltilmiş durumdadır; spec'in `Status:` satırı güncellenir.
- [x] `npm run check` ve `npm run test:pg` yeşil.

## Comments
- Görsel tur yapılamadı: embedded-postgres'li demo veritabanı (numeric/NULL/jsonb kolonlu PK'lı tablo, PK'sız tablo, RAISE NOTICE/WARNING yapan fonksiyon, dev ve prod bağlantıları; geçici yapılandırma dizini ve sahte keychain) ve derlenmiş uygulama 127.0.0.1'de açıldı, ama Claude in Chrome eklentisi üç denemede de bağlı değildi ("Browser extension is not connected"; bağlı tarayıcı listesi boş). İlk iki kutu bu yüzden açık; görsel tur ve önceki ticket'ların görsel kontrole bıraktığı maddeler (01, 07, 12'nin açık kutuları; 04, 05, 06, 09, 10 yorumları) [ticket 15](15-tarayicida-gorsel-tur.md)'e taşındı.
- Sürüm notu yeni `CHANGELOG.md`'de (önceki sürümlerin notu yoktu; 0.5.0 ilk girdi). README'ye Diğer kısayollar (Ctrl/Cmd+F, Ctrl/Cmd+Shift+C, `?`, palet, gezgin), Tema ve arayüz tercihleri, Sunucu bildirimleri bölümleri eklendi; prod bölümündeki eski "araç çubuğundaki 🔒/🔓 düğmesi" ifadesi başlıktaki kilit düğmesine göre düzeltildi.
- Spec'in Implementation Decisions bölümü 01–13'ün kapanışlarında koda göre yeniden yazılmıştı; okuyunca ayrışan satır bulunmadı. Spec'in `Status:` satırı güncellendi.
- `npm run check` (2222 test) ve `npm run test:pg` (381 test) yeşil.
- İlk iki kutu [ticket 15](15-tarayicida-gorsel-tur.md)'te Playwright ile yapılan turla karşılandı; gözlemler ve düzeltilen kusurlar orada.
