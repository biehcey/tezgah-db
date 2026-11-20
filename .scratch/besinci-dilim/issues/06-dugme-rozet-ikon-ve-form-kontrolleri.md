# 06: Düğme, rozet, ikon ve form kontrolleri

Spec: [Tasarım token'ları ve bileşenler](../spec.md#tasarım-tokenları-ve-bileşenler), [Prod sinyali (karar)](../spec.md#prod-sinyali-1), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema), [Prod sinyali (hikâyeler)](../spec.md#prod-sinyali) (hikâye 96–97)

**What to build:** Düğmeler her ekranda aynı türlerde (birincil, ikincil, tehlikeli, sade) ve iki boyutta görünür; tüm çip/rozetler tek bir Rozet bileşeninden gelir. Ortam rozetlerinde yazı rengi zemine göre en az 4.5:1 kontrastla siyah ya da beyaz seçilir (kullanıcının seçtiği renkte de); başlıkta, gezginde, palette ve bağlantı formunda aynı kural geçerlidir. Unicode glifleri ve emoji kilit yerine her işletim sisteminde aynı görünen SVG ikonlar kullanılır. Sorgu geçmişi panelindeki radyo, onay kutusu ve tarih alanları uygulamanın stiline uyar.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] core `rozetYaziRengi('#rrggbb')` → `'#000000' | '#ffffff'` (WCAG göreli parlaklık, daha yüksek kontrastlı olan).
- [ ] `Dugme` (birincil/ikincil/tehlikeli/sade; normal/küçük) ve `Rozet` bileşenleri; mevcut düğme ve en az altı farklı çip/rozet stili bunlara taşınır.
- [ ] Ortam rozetlerinin tamamı `rozetYaziRengi` ile renklenir.
- [ ] Lucide React paketi eklenir; Unicode ikon glifleri ve kilit emojisi kaldırılır; tek başına anlam taşıyan ikonlarda `aria-label`/`title`.
- [ ] Stillenmiş radyo, onay kutusu ve tarih alanı; geçmiş panelinde kullanılır.
- [ ] Testler: core `rozetYaziRengi` (beş varsayılan ortam rengi, `#ffffff`, `#000000`, orta griler); arayüz (dev ve staging rozetinde yazı rengi beklenen değer; ikon düğmeleri erişilebilir adla bulunur, mevcut testler rol/etiketle geçmeye devam eder).

## Comments
