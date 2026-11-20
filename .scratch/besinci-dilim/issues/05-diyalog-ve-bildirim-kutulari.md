# 05: Diyalog ve bildirim kutuları

Spec: [Tasarım token'ları ve bileşenler](../spec.md#tasarım-tokenları-ve-bileşenler), [Görsel dil ve tema](../spec.md#görsel-dil-ve-tema) (hikâye 105–109), [Durum çubuğu](../spec.md#durum-çubuğu) (hikâye 70)

**What to build:** Tüm diyaloglar tek bir ortak Diyalog bileşeninden gelir: aynı çerçeve, başlık, kapatma ve düğme düzeni; açıkken Tab odağı içinde kalır, Esc kapatır, kapanınca odak açan öğeye döner. Çalışma alanının üstünde biriken hata ve "kopyalandı" paragrafları kapatılabilir toast'lara dönüşür: hatalar kullanıcı kapatana kadar kalır, başarı bildirimleri birkaç saniyede kaybolur. Yükleme durumları ortak bir yükleniyor göstergesi kullanır.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] `Diyalog` bileşeni yerel `<dialog>` + `showModal()` üzerine; başlık, gövde, düğme alanı; odak tuzağı, Esc, odağı geri verme.
- [x] Mevcut `Onay` ve ad-hoc diyaloglar (klasör adı, şifre penceresi, host anahtarı, silme onayı, içe aktarma) `Diyalog`'a taşınır; davranışları ve mevcut testleri korunur.
- [x] `Bildirimler` (toast yığını): hata kalıcı + kapat düğmesi, başarı ~3 sn; ekran okuyucu için `role="status"`/`role="alert"`.
- [x] Uygulama genelindeki hata ve "kopyalandı" mesajları `Bildirimler`'e taşınır; çalışma alanı üstünde paragraf birikmez.
- [x] `Yukleniyor` göstergesi; "Yükleniyor…" metin durumları onu kullanır (metin ekran okuyucu için kalır).
- [x] Testler (arayüz): diyalog açıkken Tab son öğeden ilk öğeye döner; Esc kapatır ve odak açan düğmeye döner; hata toast'ı kapat düğmesiyle kalkar, başarı toast'ı zamanlayıcıyla kalkar; bir hata durumunda eski üst paragraf yerine toast görünür.

## Comments

- Uygulayıcı: toast API'si `src/web/ortak/Bildirimler.tsx`: `const bildir = useBildirimler(); bildir.hata(mesaj)` (kalıcı, "Bildirimi kapat" düğmesi) / `bildir.basari(mesaj)` (3 sn). Sağlayıcı `BildirimSaglayici` `main.tsx`'te ve testlerde `renderWithApi` içinde; dışında çağrılırsa hook hata fırlatır. Aynı tür ve metindeki bildirim yığılmaz, eskisinin yerine geçer.
- Uygulayıcı: `Diyalog` (`src/web/ortak/Diyalog.tsx`) açılınca odağı `data-autofocus` işaretli öğeye verir (React `autoFocus` kapalı `<dialog>`'da işe yaramadığı için); başlıkta "Pencereyi kapat" (×) düğmesi var. `aria-modal="true"` kalır, `modalOpen()` değişmedi. jsdom `showModal`/`close` uygulamadığı için `src/web/test/setup.ts`'te küçük bir polyfill var. Hızlı geçiş paleti listede olmadığı için (ticket 13'ün alanı) `Diyalog`'a taşınmadı.
- Uygulayıcı: bileşen içi, bağlamına bağlı hatalar (form alanı hataları, filtre hatası, karar kartı, gezgin panel hatası) yerinde kaldı; yalnız çalışma alanının üstündeki App düzeyi uyarı/bilgi paragrafları (`notice`, `info`, sunucu durumu hatası) toast'a taşındı. Host anahtarı silindi mesajı başarı, "kayıtlı anahtar yok" hata toast'ı. Bir pencere açıkken gelen toast `<dialog>`'un üst katmanının altında kalır; görsel kontrolde bakılmalı.
- Uygulayıcı: "×" glifleri ticket 06'nın ikon geçişine bırakıldı.
