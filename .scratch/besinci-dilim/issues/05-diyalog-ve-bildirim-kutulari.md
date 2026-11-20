# 05: Diyalog ve bildirim kutuları

Spec: [Tasarım token'ları ve bileşenler](../spec.md#tasarım-tokenları-ve-bileşenler), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema) (hikâye 105–109), [Durum çubuğu](../spec.md#durum-çubuğu) (hikâye 70)

**What to build:** Tüm diyaloglar tek bir ortak Diyalog bileşeninden gelir: aynı çerçeve, başlık, kapatma ve düğme düzeni; açıkken Tab odağı içinde kalır, Esc kapatır, kapanınca odak açan öğeye döner. Çalışma alanının üstünde biriken hata ve "kopyalandı" paragrafları kapatılabilir toast'lara dönüşür: hatalar kullanıcı kapatana kadar kalır, başarı bildirimleri birkaç saniyede kaybolur. Yükleme durumları ortak bir yükleniyor göstergesi kullanır.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `Diyalog` bileşeni yerel `<dialog>` + `showModal()` üzerine; başlık, gövde, düğme alanı; odak tuzağı, Esc, odağı geri verme.
- [ ] Mevcut `Onay` ve ad-hoc diyaloglar (klasör adı, şifre penceresi, host anahtarı, silme onayı, içe aktarma) `Diyalog`'a taşınır; davranışları ve mevcut testleri korunur.
- [ ] `Bildirimler` (toast yığını): hata kalıcı + kapat düğmesi, başarı ~3 sn; ekran okuyucu için `role="status"`/`role="alert"`.
- [ ] Uygulama genelindeki hata ve "kopyalandı" mesajları `Bildirimler`'e taşınır; çalışma alanı üstünde paragraf birikmez.
- [ ] `Yukleniyor` göstergesi; "Yükleniyor…" metin durumları onu kullanır (metin ekran okuyucu için kalır).
- [ ] Testler (arayüz): diyalog açıkken Tab son öğeden ilk öğeye döner; Esc kapatır ve odak açan düğmeye döner; hata toast'ı kapat düğmesiyle kalkar, başarı toast'ı zamanlayıcıyla kalkar; bir hata durumunda eski üst paragraf yerine toast görünür.

## Comments
