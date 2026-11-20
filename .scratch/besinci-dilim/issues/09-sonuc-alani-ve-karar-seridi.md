# 09: Sonuç alanı ve karar şeridi

Spec: [Yerleşim (hikâyeler)](../spec.md#yerleşim) (hikâye 50–56, 60), [Yerleşim (web)](../spec.md#yerleşim-web), [Arayüz tercihleri (karar)](../spec.md#arayüz-tercihleri-1), [Further Notes](../spec.md#further-notes)

**What to build:** Konsol sekmesinde editör üstte, **Sonuç alanı** altta durur; aradaki bölücü sürüklenebilir ve Sonuç alanı tek tıkla daraltılıp açılabilir. Sağdaki sabit 400 px çalıştırma/log kolonu kalkar; Sonuç sekmeleri (ifade başına), Log ve (Deneme'de) Değişiklikler aynı sekme şeridinde toplanır. Çalıştırma bitince en anlamlı sekme açılır: hata → Log, Deneme → Değişiklikler, satır döndüren son ifade → onun Sonuç sekmesi, yoksa Log; kullanıcı çalışma sürerken sekme değiştirdiyse zorla değiştirilmez. Karar kartı ve bekletme göstergesi Sonuç alanının üstünde, hangi sekme açık olursa olsun görünür kalır. Editör/sonuç oranı ve daraltılmışlık Arayüz tercihlerine yazılır. Tablo sekmesi yeni token'larla alanı doldurur; akışı değişmez.

**Blocked by:** 04

**Status:** done (0f35e38)

- [x] Sağ çalıştırma kolonu kaldırılır; editör ve sonuçlar ana alanın tüm genişliğini kullanır.
- [x] Ticket 08'deki bölücü bileşeni yatay olarak editör/Sonuç alanı arasında; oran tercihe yazılır.
- [x] Sonuç alanı sekme şeridi: `Sonuç 1…N`, `Log`, `Değişiklikler` (yalnızca Deneme); daraltılınca yalnızca şerit kalır; sonuç geldiğinde ya da karar beklendiğinde kendiliğinden açılır.
- [x] core açılış sekmesi kuralı (saf, `RunView` → sekme anahtarı) ve "kullanıcı değiştirdiyse dokunma" kuralı.
- [x] Karar şeridi: karar kartı + bekletme göstergesi Sonuç alanının üstünde, sekmeden bağımsız.
- [x] GLOSSARY'ye **Sonuç alanı** eklenir; **Sonuç sekmesi** tanımındaki "editörün altında" ifadesi Sonuç alanına göre güncellenir.
- [x] Testler: core açılış sekmesi kuralı (hata, Deneme, satır döndüren son ifade, hiçbiri); arayüz (çalışma sonrası doğru sekme açılır; karar beklenirken Log'dan Sonuç sekmesine geçilince karar kartı görünür kalır; daralt/aç; oran sahte API'ye yazılır; mevcut ScriptEkrani testleri yeni yerleşimle geçer).

## Comments

- Görsel doğrulama (gerçek tarayıcıda sürükleme hissi, 900×700'de yerleşim, Tablo sekmesinin alanı doldurması) yapılmadı; yerleşim yalnızca jsdom testleriyle doğrulandı.
- Spec'ten sapmalar spec.md'nin Yerleşim (web) bölümünde yazıldı: Karar şeridi çalıştırma varken hep görünür (bitince sonuç satırı); sekme seçmek daraltılmış alanı da açar.
