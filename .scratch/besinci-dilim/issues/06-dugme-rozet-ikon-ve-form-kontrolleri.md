# 06: Düğme, rozet, ikon ve form kontrolleri

Spec: [Tasarım token'ları ve bileşenler](../spec.md#tasarım-tokenları-ve-bileşenler), [Prod sinyali (karar)](../spec.md#prod-sinyali-1), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema), [Prod sinyali (hikâyeler)](../spec.md#prod-sinyali) (hikâye 96–97)

**What to build:** Düğmeler her ekranda aynı türlerde (birincil, ikincil, tehlikeli, sade) ve iki boyutta görünür; tüm çip/rozetler tek bir Rozet bileşeninden gelir. Ortam rozetlerinde yazı rengi zemine göre en az 4.5:1 kontrastla siyah ya da beyaz seçilir (kullanıcının seçtiği renkte de); başlıkta, gezginde, palette ve bağlantı formunda aynı kural geçerlidir. Unicode glifleri ve emoji kilit yerine her işletim sisteminde aynı görünen SVG ikonlar kullanılır. Sorgu geçmişi panelindeki radyo, onay kutusu ve tarih alanları uygulamanın stiline uyar.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] core `rozetYaziRengi('#rrggbb')` → `'#000000' | '#ffffff'` (WCAG göreli parlaklık, daha yüksek kontrastlı olan).
- [x] `Dugme` (birincil/ikincil/tehlikeli/sade; normal/küçük) ve `Rozet` bileşenleri; mevcut düğme ve en az altı farklı çip/rozet stili bunlara taşınır.
- [x] Ortam rozetlerinin tamamı `rozetYaziRengi` ile renklenir.
- [x] Lucide React paketi eklenir; Unicode ikon glifleri ve kilit emojisi kaldırılır; tek başına anlam taşıyan ikonlarda `aria-label`/`title`.
- [x] Stillenmiş radyo, onay kutusu ve tarih alanı; geçmiş panelinde kullanılır.
- [x] Testler: core `rozetYaziRengi` (beş varsayılan ortam rengi, `#ffffff`, `#000000`, orta griler); arayüz (dev ve staging rozetinde yazı rengi beklenen değer; ikon düğmeleri erişilebilir adla bulunur, mevcut testler rol/etiketle geçmeye devam eder).

## Comments

- Sapmalar spec'e yazıldı: seçilebilen çipler (ortam/SSH radyoları, içe aktarma kaynak düğmeleri) `.cip` form kontrolü olarak kaldı; editör kenar çubuğunun durum işaretleri, klavye gösterimi ve fark işaretleri metin kaldı; paletteki prod rozeti varsayılan prod rengini kullanır. Core'daki `TEST_ICONS` glif tablosu kaldırıldı (ikonlar web'de).
- Görsel kontrol (açık/koyu temada düğme türleri, rozetler, stillenmiş radyo/onay kutusu/tarih alanı) yapılmadı; ticket 14'ün görsel turunda bakılacak.
