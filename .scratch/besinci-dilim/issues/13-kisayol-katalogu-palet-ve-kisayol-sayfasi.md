# 13: Kısayol kataloğu, palet ve kısayol sayfası

Spec: [Keşfedilebilirlik](../spec.md#keşfedilebilirlik), [Kısayol kataloğu ve palet](../spec.md#kısayol-kataloğu-ve-palet)

**What to build:** Tüm kısayollar tek bir katalogdan gelir ve macOS'ta ⌘/⌥/⇧, diğer platformlarda Ctrl/Alt/Shift ile yazar; tooltip'ler, bağlam menüleri, palet ve kısayol sayfası aynı metni gösterir. Ctrl/Cmd+K paleti konsol komutlarıyla dolar (Çalıştır, Tümünü çalıştır, Dene, Tümünü dene, Yazma modunu aç/kapat, Yeni konsol, Sorgu geçmişi, Gezgini göster/gizle, Sonuç alanını daralt/aç, Tema: Sistem/Açık/Koyu, Kısayollar); her komutun yanında kısayolu yazar, uygulanamayanlar pasif ve kısa bir nedenle görünür. `?` (bir metin alanında, editörde ya da hücre düzenleyicisinde değilken), paletteki komut ve durum çubuğundaki düğme tüm kısayolları gruplu (Genel, Editör, Grid, Tablo sekmesi, Palet) gösteren bir sayfa açar. Bağlam menülerinde ikon, ayırıcı ve kısayol ipucu olur.

**Blocked by:** 02, 05

**Status:** ready-for-agent

- [ ] core kısayol kataloğu: kimlik, grup, Türkçe açıklama, tuş tanımı; platforma göre görünen metin (saf). Mevcut eşleyiciler (`scriptShortcut`, `tableShortcut`, `rowViewShortcut`, `navigatorShortcut`) davranışlarını korur ve katalogla tutarlıdır (test).
- [ ] core palet komut listesi (saf): durum (etkin sekme türü, hedef, prod mu, çalışma sürüyor mu, tema) → komutlar (etkin/pasif, not, kısayol). Henüz olmayan bir yerleşim özelliğine (ör. Sonuç alanı daraltma) bağlı komut, o ticket bitmemişse listeye girmez.
- [ ] `HizliGecis` komut listesini gösterir ve seçilen komutu çalıştırır.
- [ ] Kısayol sayfası ortak `Diyalog` ile; `?` tetikleme kuralı; durum çubuğundaki `?` düğmesi (ticket 10 bittiyse) etkinleşir.
- [ ] Tooltip ve bağlam menüleri metni katalogdan alır; menülerde ikon (ticket 06 bittiyse) ve ayırıcı.
- [ ] Testler: core (platform metinleri; eşleyici-katalog tutarlılığı; palet listesi: hedefsiz sekmede Çalıştır pasif ve notlu, prod olmayan hedefte Yazma modu pasif, çalışma sürerken Çalıştır pasif); arayüz (palette "Yeni konsol" yeni sekme açar; "Kısayollar" sayfayı açar; `?` editörde yazılınca sayfa açılmaz, gezgindeyken açılır; menüde kısayol ipucu görünür).

## Comments
