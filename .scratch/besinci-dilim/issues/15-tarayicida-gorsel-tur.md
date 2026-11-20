# 15: Tarayıcıda görsel tur

Spec: [Testing Decisions](../spec.md#testing-decisions), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema)

**What to build:** Ticket 14'ün görsel turu yapılamadı (ajanın tarayıcı eklentisi bağlı değildi). Beşinci dilim gerçek bir yerel veritabanıyla gerçek bir tarayıcıda açılır; açık ve koyu temada, 900×700 ve geniş pencerede ekran görüntüsüyle bakılır. Önceki ticket'ların görsel kontrole bıraktığı maddeler burada kapanır; kusurlar düzeltilir ya da yeni ticket olur.

**Blocked by:** 14

**Status:** needs-triage

Yerel demo: embedded-postgres ile `numeric`/NULL/`jsonb` kolonlu, PK'lı bir tablo, PK'sız bir tablo ve `RAISE NOTICE`/`RAISE WARNING` (DETAIL/HINT) yapan bir fonksiyon; biri `dev`, biri `prod` etiketli iki bağlantı. Uygulama geçici bir yapılandırma dizini ve sahte keychain ile `startServer`'dan açılırsa gerçek `tezgah.json`'a ve anahtar zincirine dokunulmaz.

- [ ] Konsol: Çalışacak aralık vurgusu, hata işareti, karar şeridi, Sonuç alanı sekmeleri, Bildirimler sekmesi (seviye renkleri, DETAIL/HINT); açık/koyu, 900×700/geniş.
- [ ] Dolu Sonuç grid'i: sayısal kolonlar sağa yaslı ve `tabular-nums`, NULL görünümü, satır hover, seçim ve düzenlenmiş hücre renkleri, tip etiketi en az 11 px, Durum çubuğunda seçim özeti (ticket 07'nin açık maddesi).
- [ ] Ctrl+Shift+C Chrome'da DevTools öğe seçicisi yerine sayfaya ulaşıyor mu (ticket 07 yorumu).
- [ ] Tablo sekmesi: bekleyen değişiklikler, tablo başlığındaki kilit düğmesi.
- [ ] prod hedef: salt okunur ve yazma açık görünümleri token'larla (`--env-prod`); "YAZMA AÇIK" 900×700 pencerede kesilmez (ticket 12'nin açık maddesi).
- [ ] Editör renklendirmesi açık ve koyu temada `SELECT … FROM … WHERE 'x' -- yorum` okunur; tema geçişinde editör renkleri değişir (ticket 01'in açık maddesi, ticket 04 yorumu).
- [ ] Düğme türleri, rozetler, stillenmiş radyo/onay kutusu/tarih alanı (ticket 06 yorumu); diyalog açıkken gelen toast'ın görünürlüğü (ticket 05 yorumu).
- [ ] 900×700'de araç çubuğu tek satırda, taşan eylemler "⋯" menüsünde; geçmiş çekmecesi editörü daraltmaz; Durum çubuğu görünümü (ticket 10 yorumu). Bölücü sürükleme hissi ve Tablo sekmesinin alanı doldurması (ticket 09 yorumu).
- [ ] Palet ve `?` kısayol sayfası.
- [ ] Görülen kusurlar düzeltilir ya da `.scratch/besinci-dilim/issues/` altında yeni ticket olur; gözlemler bu dosyanın `## Comments` bölümüne yazılır, ekran görüntüleri repoya konmaz.

## Comments
