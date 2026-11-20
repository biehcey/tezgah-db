# 08: Kalıcı ve boyutlandırılabilir gezgin

Spec: [Yerleşim (hikâyeler)](../spec.md#yerleşim) (hikâye 47–49), [Yerleşim (web)](../spec.md#yerleşim-web), [Arayüz tercihleri (karar)](../spec.md#arayüz-tercihleri-1)

**What to build:** Gezginin sağ kenarı sürüklenerek genişletilip daraltılabilir (en az 200 px, en fazla pencerenin yarısı); çift tıklama varsayılan 280 px'e döndürür; bölücüye Tab ile odaklanılıp ok tuşlarıyla 16 px'lik adımlarla boyutlandırılır. Gezginin genişliği ve Ctrl/Cmd+B ile gizli/açık durumu Arayüz tercihlerine yazılır ve Tezgah yeniden açıldığında geri gelir; pencere küçükse kayıtlı genişlik sığacak şekilde sınırlanır.

**Blocked by:** 04

**Status:** done (8992c19)

- [x] Ortak, yeniden kullanılabilir bir bölücü bileşeni (`role="separator"`, `aria-orientation`, `aria-valuenow/min/max`, klavye, çift tık sıfırlama); ticket 09 da kullanır.
- [x] Gezgin genişliği bölücüyle değişir; sınırlar uygulanır; pencere yeniden boyutlanınca sınır yeniden uygulanır.
- [x] Genişlik ve görünürlük tercihlere yazılır (sürükleme bitince; sürüklerken değil); açılışta okunur.
- [x] Ctrl/Cmd+B davranışı aynı; gizli durum kalıcı.
- [x] Testler (arayüz): bölücü ok tuşlarıyla `aria-valuenow`'u değiştirir ve sınırlarda durur; çift tık 280'e döner; değişiklik sahte API'ye tercih olarak yazılır; açılışta tercihteki gizli gezgin gizli gelir.

## Comments

- Bölücü `src/web/ortak/Bolucu.tsx`; sıkıştırma `src/core/bolucu.ts` (`bolucuDegeri`), gezgin sınırları `gezginSinirlari` (`src/core/arayuz-tercihleri.ts`, normalleştirme de bunu kullanır; üst sınır pencere/2 aşağı yuvarlanır). Değer işaretçi ekseninde artar: `dikey`de sağa, `yatay`da aşağı sürüklemek ve →/↓ büyütür, ←/↑ küçültür. Ok tuşu ve çift tık `onDegis` sonra `onBitir` çağırır; yerinde tıklama (hareketsiz sürükleme) yazmaz.
- `usePreferences().update` artık güncel tercihten değişiklik üreten bir fonksiyon da alır; art arda Ctrl/Cmd+B eski durumu görmez.
- Pencere daralınca görünen genişlik sınırlanır ama tercih yeniden yazılmaz; pencere genişleyince kayıtlı genişlik geri gelir.
