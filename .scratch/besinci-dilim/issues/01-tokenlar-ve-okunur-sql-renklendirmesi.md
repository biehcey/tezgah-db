# 01: Token'lar ve okunur SQL renklendirmesi

Spec: [Tasarım token'ları ve bileşenler](../spec.md#tasarım-tokenları-ve-bileşenler), [Editör eklentileri](../spec.md#editör-eklentileri), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema)

**What to build:** Stil dosyasındaki tüm literal renk, boşluk, yazı boyutu, köşe yarıçapı ve font değerleri token'lara bağlanır; açık ve koyu tema için ayrı nötr ölçekler ve temadan bağımsız `--env-prod` tanımlanır. SQL renklendirmesi token'lara bağlı tek bir stilden gelir; koyu temada script editöründe ve Tablo sekmesinin `WHERE`/`ORDER BY` kutularında anahtar kelimeler, dizgeler, sayılar, yorumlar ve adlar okunur. İkincil metinler 11 px'ten küçük değildir; odaktaki öğe her yerde görünür bir halkayla belli olur. Bu ticket görünümü korur (renkler bugünküne yakın kalır); amaç sonraki ticket'ların üzerine kuracağı temeldir.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Token kümesi: boşluk ölçeği (2, 4, 6, 8, 12, 16, 24, 32), yazı ölçeği (11, 12, 13, 14, 16, 18), yarıçap (küçük/orta/büyük/tam), `--font-ui` ve `--font-mono` (monospace yığını tek yerde), 12 adımlı nötr ölçek açık ve koyu için ayrı, semantik renkler (vurgu, tehlike, uyarı, başarı), `--env-prod`, sözdizimi renkleri.
- [ ] Mevcut 11 renk token'ı yeni ölçeğe eşlenir; stil dosyasında token dışı `font-size`, `border-radius` ve font ailesi kalmaz (ölçek dışı tekil değerler en yakın token'a yuvarlanır).
- [ ] Koyu tema bugünkü gibi `prefers-color-scheme` ile gelir; `<html data-theme="acik|koyu">` verilirse onu izleyecek şekilde seçiciler hazırlanır (seçim arayüzü ticket 04'te).
- [ ] `defaultHighlightStyle` kaldırılır; token'lara (CSS değişkenleri) bağlı paylaşılan bir `HighlightStyle` script editöründe ve filtre kutusunda kullanılır; tema değişince editör yeniden kurulmaz.
- [ ] 11 px'ten küçük yazı kalmaz.
- [ ] Global `:focus-visible` halkası token'la tanımlanır; `outline: none` kullanımları kaldırılır ya da eşdeğer görünür odakla değiştirilir.
- [ ] Mevcut testler yeşil; davranış değişikliği yok.
- [ ] Elle kontrol: uygulama açık ve koyu temada açılır, editörde `SELECT … FROM … WHERE 'x' -- yorum` okunur; ekran görüntüleri ticket yorumuna not edilir.

## Comments
