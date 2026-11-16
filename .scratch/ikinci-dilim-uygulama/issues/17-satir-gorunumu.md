# 17: Satır görünümü (Shift+Enter)

Spec: [İkinci dilim spec'i](../../ikinci-dilim/spec.md#düzenlenebilir-grid) · Kararlar: [ikinci-dilim/03 Tablo ekranı yerleşimi](../../ikinci-dilim/issues/03-tablo-ekrani-yerlesimi.md)

Prototip (birincil kaynak): `prototype/03-tablo-ekrani-yerlesimi` branch'i, `.scratch/ikinci-dilim/prototypes/tablo-ekrani-PROTOTYPE.html?variant=D` (grid'de Shift+Enter). Prototip kodu taşınmaz, yeniden yazılır.

**What to build:** Tablo sekmesinde grid'in sağında, varsayılan kapalı bir satır görünümü paneli. Seçili satırı dikey bir form olarak gösterir; IntelliJ'nin Record view'ına karşılık gelir. Formdan yapılan düzenlemeler grid'deki gibi bekleyen değişiklik olur.

**Blocked by:** 16

**Status:** done (d321bc0)

- [x] Grid'de Shift+Enter ya da üst satırdaki `◧` paneli açar/kapatır; açıkken grid'de Esc kapatır. Durum diske yazılmaz.
  - Shift+Enter yalnızca grid odaktayken çalışır; düzenleyicideki Shift+Enter (yeni satır) değişmez.
- [x] Sekmeler: **Satır** | **Değişiklikler (n)**. Değişiklikler sekmesi, çekmecedeki bekleyen listesinin aynısıdır.
- [x] Satır sekmesi her kolon için şunları gösterir: kolon adı, tip, PK işareti, tam değer. Değer kırpılmaz; uzun ve çok satırlı değerler kutuda kayar.
  - NULL ve DEFAULT yer tutucu olarak görünür.
  - Bekleyen değeri olan alan grid'deki renkle işaretlenir.
- [x] Alanı değiştirip Enter'a basmak ya da alandan çıkmak `editCell` ile bekleyen değişiklik olur.
  - Alan başına "NULL yap" bağlantısı var.
  - Yüklü satırın PK'sı, salt okunur kolonlar ve silinecek satır salt okunurdur; nedeni grid'deki gibi gösterilir.
  - "Sil / Geri al" düğmesi var.
- [x] Seçim grid'de değişince panel yeni satırı gösterir. Çok hücreli seçimde aktif hücrenin satırını gösterir.
- [x] PK'sız tabloda ve konsol sonuçlarında panel salt okunur açılır (yalnızca tam değeri gösterir).
- [x] Spec ve [02](../../ikinci-dilim/issues/02-grid-davranis-ayrintilari.md) Q3'teki "değer paneli yok" satırı bu ticket'a göre yeniden yazılır.
- [x] Testler (web):
  - Aç/kapa kısayolları.
  - Alan düzenleme → bekleyen değişiklik.
  - NULL yap, PK salt okunur, sil/geri al.
  - Seçim değişince satır değişir.

## Comments
