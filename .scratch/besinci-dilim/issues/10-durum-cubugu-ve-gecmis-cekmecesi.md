# 10: Durum çubuğu ve geçmiş çekmecesi

Spec: [Durum çubuğu](../spec.md#durum-çubuğu), [Yerleşim (hikâyeler)](../spec.md#yerleşim) (hikâye 57–59), [Yerleşim (web)](../spec.md#yerleşim-web), [Grid](../spec.md#grid) (seçim özeti)

**What to build:** Uygulamanın en altında tek satırlık bir **Durum çubuğu**: etkin sekmenin hedefi ve ortam rozeti; transaction durumu (Hazır, Çalışıyor k/n, Karar bekleniyor + kalan süre, Okuma açık + kalan süre, Bağlı değil); son çalıştırmanın süresi ve son ifadenin satır sayısı; grid'de seçim varken hücre sayısı ve sayısal hücrelerde kesin toplam ile ortalama; Tablo sekmesinde tahmini satır ve bekleyen değişiklik sayısı; kısayol sayfasını açacak `?` düğmesi ve sürüm. Durum çubuğu yazma kilidi içermez. Sorgu geçmişi editörü daraltmayan, sağdan üste binen bir çekmeceye dönüşür; Ctrl/Cmd+Alt+E ve hedef başlığındaki görünür bir düğme açar, Esc ve dışına tıklama kapatır. 900×700 pencerede araç çubuğu tek satırda kalır; sığmayan ikincil düğmeler "⋯" menüsüne taşınır, Çalıştır/Dene/İptal her zaman görünür.

**Blocked by:** 07, 09

**Status:** done (5e61bc0)

- [x] core transaction durumu metni (saf, `RunView` + kalan süre → metin).
- [x] core `seçimÖzeti(degerler, tipler)`: hücre sayısı; sayısal hücrelerde adet, kesin toplam (tam sayı ve `numeric` için BigInt tabanlı ölçekli ondalık; `float4/8` ve `money` Number), en fazla 6 kesir basamaklı ortalama; NULL sayılmaz.
- [x] Durum çubuğu bileşeni; değerler mevcut durumdan türetilir; `?` düğmesi (kısayol sayfası ticket 13'te; o gelene kadar düğme gizli ya da pasif).
- [x] Sorgu geçmişi çekmecesi; içerik ve filtreler değişmez; görünür açma düğmesi.
- [x] Araç çubuğu taşma kuralı ve "⋯" menüsü.
- [x] GLOSSARY'ye **Durum çubuğu** eklenir; **Sorgu geçmişi** tanımındaki "yan panel" çekmeceye göre güncellenir.
- [x] Testler: core (transaction durumu metinleri; seçim özeti: büyük `numeric` toplamı kesin, NULL, karışık tipler, sayısal olmayan seçim); arayüz (karar beklenirken durum çubuğu kalan süreyi gösterir; grid'de seçim yapınca özet görünür; geçmiş düğmesi çekmeceyi açar, Esc kapatır ve editör genişliği değişmez; dar araç çubuğunda ikincil eylem "⋯" menüsünden çalışır).

## Comments

- Uygulayıcı: Durum çubuğu `src/web/ortak/DurumCubugu.tsx`, App'te kökün ikinci satırında; değerleri sekmeler `onDurum` ile bildirir (`SekmeDurumu`: `run`, `deadline`, `secim`, `bildirim`, `tablo`), App etkin sekmeninkini gösterir. Grid seçimi `SonucGridi`'nin `onSecimOzeti` prop'uyla gelir. Kenar çubuğunun altındaki sürüm Durum çubuğuna taşındı. `?` düğmesi ticket 13'ün kısayol sayfasını açar (birleştirmeden sonra bağlandı).
- Uygulayıcı: Kopyalama geri bildirimi artık `bildir.basari` / `bildir.hata` toast'ı; `SonucGridi`'nin kendi `role="status"` bilgisi ve `.grid-kopyalama-bilgisi` kalktı. "İmleçte çalışacak ifade yok" Durum çubuğunda (`Çalıştırma bildirimi`).
- Uygulayıcı: Taşma ölçümü `src/web/ortak/tasma.ts` (`useTasanEylemler`): çubuğun `data-eylem` işaretli çocuklarını ölçer; jsdom'da genişlik 0 olduğundan testler `clientWidth`/`offsetWidth`'i taklit eder. 900×700'de araç çubuğunun tek satırda kaldığı, çekmecenin editörü daraltmadığı (CSS `position: absolute`, stil testiyle sabit) ve Durum çubuğunun görünümü gerçek tarayıcıda bakılmadı; ticket 14'ün görsel turunda doğrulanmalı.
- Spec'in Yerleşim (web) ve Grid maddeleri koda göre yeniden yazıldı (`secimOzeti` adı ve kuralları, Durum çubuğu metin fonksiyonları, taşan eylemler).
