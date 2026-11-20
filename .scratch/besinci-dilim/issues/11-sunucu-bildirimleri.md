# 11: Sunucu bildirimleri

Spec: [Sunucu bildirimleri (hikâyeler)](../spec.md#sunucu-bildirimleri), [Sunucu bildirimleri (karar)](../spec.md#sunucu-bildirimleri-1), [Testing Decisions](../spec.md#testing-decisions), [Further Notes](../spec.md#further-notes)

**What to build:** Bir çalıştırma sırasında Postgres'in gönderdiği `NOTICE`/`WARNING`/`INFO`/`LOG`/`DEBUG` mesajları geldikçe (uzun bir `DO` bloğu bitmeden) Sonuç alanının "Bildirimler (N)" sekmesinde, geldikleri ifadenin satır numarası, seviyesi (WARNING belirgin), varsa `DETAIL` ve `HINT` ile görünür. Sekme yalnızca bildirim geldiyse çıkar; Log'daki ifadenin yanında bildirim sayısı yazar ve tıklayınca sekmeye gider. Çalıştırma başına ilk 1000 bildirim gösterilir, gerisi "+N bildirim daha gösterilmedi" diye sayılır. Bildirimler Deneme ve Autocommit'te de gelir, seçilip kopyalanabilir, Çalıştırma kaydına yazılmaz. Tablo sekmesi bildirimleri yok sayar.

**Blocked by:** 09

**Status:** done (814dc1d)

- [x] core `ServerEvent`'e `{ type: 'bildirim'; i: number | null; seviye; mesaj; detay?; ipucu? }`; `bitti`'ye `bildirimFazlasi?: number`.
- [x] core `applyEvent` bildirimleri ve fazlalığı `RunView`'da tutar (saf).
- [x] server: script çalıştırıcı çalıştırma süresince client'ın `notice` olayını dinler, `i`'yi çalışan ifadeye bağlar, 1000'den sonrasını sayar; çalıştırma bitince (hata, iptal, kopma dahil) dinleyiciyi kaldırır. Katalog, tablo sayfası ve iptal sorguları bildirim yaymaz.
- [x] web: "Bildirimler (N)" sekmesi, seviye etiketleri, Log'da ifade başına sayaç ve sekmeye geçiş; Tablo sekmesi olayı yok sayar.
- [x] GLOSSARY'ye **Sunucu bildirimi** eklenir.
- [x] Testler: core (`applyEvent` bildirim ve sınır); server, embedded-postgres ile (`DO $$ BEGIN RAISE NOTICE … END $$` doğru `i` ve seviye; `RAISE WARNING … USING DETAIL, HINT`; 1000 sınırı ve `bildirimFazlasi`; aynı havuz client'ıyla sonraki çalıştırmada eski dinleyiciden bildirim gelmez; Deneme ve Autocommit); arayüz (sahte API'den gelen bildirimler sekmede görünür, sayaç doğru, Log'daki sayaç sekmeye götürür).

## Comments
