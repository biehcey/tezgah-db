# 04: Arayüz tercihleri ve elle tema seçimi

Spec: [Arayüz tercihleri (hikâyeler)](../spec.md#arayüz-tercihleri), [Arayüz tercihleri (karar)](../spec.md#arayüz-tercihleri-1), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema), [Further Notes](../spec.md#further-notes)

**What to build:** Tema Sistem, Açık ya da Koyu olarak Ctrl/Cmd+K paletindeki "Tema: …" komutlarıyla seçilir; tüm arayüz (editör dahil) yeniden yüklemeden değişir, prod kırmızısı değişmez. Seçim **Arayüz tercihleri** dosyasına yazılır ve Tezgah yeniden açıldığında geri gelir. Bu ticket tercih altyapısını (dosya, uç noktalar, normalleştirme) uçtan uca kurar; gezgin ve sonuç alanı alanları şemada yer alır, onları ticket 08 ve 09 kullanır.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] core `normalizeArayuzTercihleri(ham, pencere)`: şema `{ surum: 1, gezgin: { acik, genislik }, sonucOrani, sonucDaraltilmis, tema }`; bilinmeyen alanlar atılır, eksikler varsayılanla dolar, sayılar sınırlanır (genişlik 200..pencere/2, oran 0.15..0.85); bozuk girdi varsayılan döner.
- [ ] server: tercih dosyası `tezgah.json`'dan ayrı, aynı uygulama veri dizininde; oku/yaz uç noktaları erişim anahtarıyla doğrulanır; dosya yoksa ya da bozuksa varsayılan döner; hiçbir veritabanına bağlanmaz.
- [ ] web: tema `<html data-theme>` ile uygulanır; `sistem` iken `prefers-color-scheme` izlenir (değişiklik canlı yansır).
- [ ] Palette "Tema: Sistem / Açık / Koyu" komutları; etkin tema işaretli.
- [ ] Yazma tema değişince yapılır; açılışta tercih gelene kadar sistem teması (sunucunun HTML'e gömmesi uygulayıcının kararı; seçilen yol spec'e yazılır).
- [ ] GLOSSARY'ye **Arayüz tercihleri** eklenir.
- [ ] Testler: core normalleştirme (bozuk, eksik, sınır dışı); server uç noktaları (anahtarsız istek reddi, bozuk dosyada varsayılan, yazıp okuma); arayüz (palette tema komutu `data-theme`'i değiştirir ve sahte API'ye tercihi yazar; açılışta okunan tema uygulanır).

## Comments
