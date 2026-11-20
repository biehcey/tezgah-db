# 01: Token'lar ve okunur SQL renklendirmesi

Spec: [Tasarım token'ları ve bileşenler](../spec.md#tasarım-tokenları-ve-bileşenler), [Editör eklentileri](../spec.md#editör-eklentileri), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema)

**What to build:** Stil dosyasındaki tüm literal renk, boşluk, yazı boyutu, köşe yarıçapı ve font değerleri token'lara bağlanır; açık ve koyu tema için ayrı nötr ölçekler ve temadan bağımsız `--env-prod` tanımlanır. SQL renklendirmesi token'lara bağlı tek bir stilden gelir; koyu temada script editöründe ve Tablo sekmesinin `WHERE`/`ORDER BY` kutularında anahtar kelimeler, dizgeler, sayılar, yorumlar ve adlar okunur. İkincil metinler 11 px'ten küçük değildir; odaktaki öğe her yerde görünür bir halkayla belli olur. Bu ticket görünümü korur (renkler bugünküne yakın kalır); amaç sonraki ticket'ların üzerine kuracağı temeldir.

**Blocked by:** None (can start immediately)

**Status:** done (18a4a71)

- [x] Token kümesi: boşluk ölçeği (2, 4, 6, 8, 12, 16, 24, 32), yazı ölçeği (11, 12, 13, 14, 16, 18), yarıçap (küçük/orta/büyük/tam), `--font-ui` ve `--font-mono` (monospace yığını tek yerde), 12 adımlı nötr ölçek açık ve koyu için ayrı, semantik renkler (vurgu, tehlike, uyarı, başarı), `--env-prod`, sözdizimi renkleri.
- [x] Mevcut 11 renk token'ı yeni ölçeğe eşlenir; stil dosyasında token dışı `font-size`, `border-radius` ve font ailesi kalmaz (ölçek dışı tekil değerler en yakın token'a yuvarlanır).
- [x] Koyu tema bugünkü gibi `prefers-color-scheme` ile gelir; `<html data-theme="acik|koyu">` verilirse onu izleyecek şekilde seçiciler hazırlanır (seçim arayüzü ticket 04'te).
- [x] `defaultHighlightStyle` kaldırılır; token'lara (CSS değişkenleri) bağlı paylaşılan bir `HighlightStyle` script editöründe ve filtre kutusunda kullanılır; tema değişince editör yeniden kurulmaz.
- [x] 11 px'ten küçük yazı kalmaz.
- [x] Global `:focus-visible` halkası token'la tanımlanır; `outline: none` kullanımları kaldırılır ya da eşdeğer görünür odakla değiştirilir.
- [x] Mevcut testler yeşil; davranış değişikliği yok.
- [ ] Elle kontrol: uygulama açık ve koyu temada açılır, editörde `SELECT … FROM … WHERE 'x' -- yorum` okunur; ekran görüntüleri ticket yorumuna not edilir.

## Comments

- Uygulayıcı: elle kontrol (açık/koyu temada uygulamayı açıp ekran görüntüsü almak) ajan oturumunda yapılmadı; insan kontrolü bekliyor. Sözleşme src/web/styles.test.ts (token dışı yazı boyutu/yarıçap/font/boşluk/renk yok, 11 px altı yok, odak gizlenmez, koyu tema seçicileri, temadan bağımsız --env-prod) ve src/web/ortak/sozdizimi.test.ts (anahtar kelime, dizge, sayı, yorum, ad, tip renkleri --sozdizimi-* token'larından) ile denetleniyor.
- Uygulayıcı: eski 11 renk adı (--zemin, --uyari …) bileşenlerin kullandığı takma adlar olarak kaldı ve yeni ölçeğe/semantik renklere eşlendi. Ölçek dışı boşluklar en yakın token'a, eşitlikte küçüğe yuvarlandı (ör. 3→2, 10→8, 14→12); 15 px başlıklar 16'ya, 12.5 px 12'ye, 9/14 px yarıçaplar --yaricap-tam'a. .filtre-editoru .cm-focused CodeMirror çerçevesini kapatır, yerine token'lı alt çizgi ve çerçeve vurgusu gelir (testte tek istisna).
