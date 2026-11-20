# 04: Arayüz tercihleri ve elle tema seçimi

Spec: [Arayüz tercihleri (hikâyeler)](../spec.md#arayüz-tercihleri), [Arayüz tercihleri (karar)](../spec.md#arayüz-tercihleri-1), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema), [Further Notes](../spec.md#further-notes)

**What to build:** Tema Sistem, Açık ya da Koyu olarak Ctrl/Cmd+K paletindeki "Tema: …" komutlarıyla seçilir; tüm arayüz (editör dahil) yeniden yüklemeden değişir, prod kırmızısı değişmez. Seçim **Arayüz tercihleri** dosyasına yazılır ve Tezgah yeniden açıldığında geri gelir. Bu ticket tercih altyapısını (dosya, uç noktalar, normalleştirme) uçtan uca kurar; gezgin ve sonuç alanı alanları şemada yer alır, onları ticket 08 ve 09 kullanır.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] core `normalizeArayuzTercihleri(ham, pencere)`: şema `{ surum: 1, gezgin: { acik, genislik }, sonucOrani, sonucDaraltilmis, tema }`; bilinmeyen alanlar atılır, eksikler varsayılanla dolar, sayılar sınırlanır (genişlik 200..pencere/2, oran 0.15..0.85); bozuk girdi varsayılan döner.
- [x] server: tercih dosyası `tezgah.json`'dan ayrı, aynı uygulama veri dizininde; oku/yaz uç noktaları erişim anahtarıyla doğrulanır; dosya yoksa ya da bozuksa varsayılan döner; hiçbir veritabanına bağlanmaz.
- [x] web: tema `<html data-theme>` ile uygulanır; `sistem` iken `prefers-color-scheme` izlenir (değişiklik canlı yansır).
- [x] Palette "Tema: Sistem / Açık / Koyu" komutları; etkin tema işaretli.
- [x] Yazma tema değişince yapılır; açılışta tercih gelene kadar sistem teması (sunucunun HTML'e gömmesi uygulayıcının kararı; seçilen yol spec'e yazılır).
- [x] GLOSSARY'ye **Arayüz tercihleri** eklenir.
- [x] Testler: core normalleştirme (bozuk, eksik, sınır dışı); server uç noktaları (anahtarsız istek reddi, bozuk dosyada varsayılan, yazıp okuma); arayüz (palette tema komutu `data-theme`'i değiştirir ve sahte API'ye tercihi yazar; açılışta okunan tema uygulanır).

## Comments

- Uygulayıcı: tercih dosyası `arayuz.json` (`tezgah.json` ile aynı dizinde); uçlar `GET`/`PUT /api/arayuz-tercihleri`. Tercih HTML'e gömülmedi: açılışta tek GET gelene kadar sistem teması; spec'e yazıldı. `sistem` iken `data-theme` kaldırılır, CSS `prefers-color-scheme` canlı izler (JS dinleyicisi yok). Sunucu pencereyi bilmediği için `Infinity` pencereyle normalleştirir (yalnız alt sınır); üst sınırı arayüz uygular. Pencerenin yarısı 200 px'ten darsa pencere/2 kazanır.
- Uygulayıcı: ticket 08/09 için `usePreferences().update({ gezgin })` / `update({ sonucOrani, sonucDaraltilmis })` hazır; çağrı başına bir yazma yapar, sürükleme bitince çağrılmalı. Tema komutları `themeCommands(tema, sec)` (`src/web/ortak/tercihler.ts`) olarak ticket 13'ün komut listesine katılabilir; `PaletteCommand.checked` etkin seçeneği `aria-checked` ve "● etkin" ile işaretler. Elle görsel kontrol (tema geçişinde editör renkleri) yapılmadı.
