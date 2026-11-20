# 14: Görsel tur ve 0.5.0

Spec: [Testing Decisions](../spec.md#testing-decisions), [Further Notes](../spec.md#further-notes)

**What to build:** Beşinci dilimin bütünü gerçek bir yerel veritabanıyla elle doğrulanır ve 0.5.0 olarak yayına hazırlanır. Uygulama açık ve koyu temada, 900×700 ve geniş pencerede açılır; konsol (Çalışacak aralık, hata, karar şeridi, Sonuç alanı sekmeleri, bildirimler), dolu bir Sonuç grid'i (sayısal hizalama, NULL, seçim özeti, kopyalama), Tablo sekmesi (bekleyen değişiklikler), prod hedef (salt okunur ve yazma açık), palet ve kısayol sayfası ekran görüntüsüyle kontrol edilir. Görülen kusurlar düzeltilir ya da yeni ticket olarak yazılır. README ve sürüm notu Ctrl/Cmd+Enter davranış değişikliğini anlatır.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13

**Status:** ready-for-agent

- [ ] Gerçek yerel veritabanıyla (ör. embedded-postgres ya da yerel bir sunucu) yukarıdaki ekranların açık/koyu ve dar/geniş ekran görüntüleri alınır; dosyalar repoya konmaz, gözlemler bu dosyanın `## Comments` bölümüne yazılır.
- [ ] 1–13'ün kabul kriterleriyle çelişen bir görünüm varsa düzeltilir ya da `.scratch/besinci-dilim/issues/` altında yeni ticket açılır.
- [ ] README: yeni kısayollar (Çalışacak aralık, Tümünü çalıştır, Ctrl/Cmd+F, Ctrl/Cmd+Shift+C, `?`), tema seçimi, Sunucu bildirimleri.
- [ ] Sürüm 0.5.0'a çıkar; sürüm notunda Ctrl/Cmd+Enter'ın artık tüm script yerine Çalışacak aralığı çalıştırdığı açıkça yazar.
- [ ] Spec'te uygulamayla ayrışan satırlar düzeltilmiş durumdadır; spec'in `Status:` satırı güncellenir.
- [ ] `npm run check` ve `npm run test:pg` yeşil.

## Comments
