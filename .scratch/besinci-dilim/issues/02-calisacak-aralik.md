# 02: Çalışacak aralık

Spec: [Çalışacak aralık (hikâyeler)](../spec.md#çalışacak-aralık), [Çalışacak aralık (core, saf)](../spec.md#çalışacak-aralık-core-saf), [Çalıştırma akışı (web)](../spec.md#çalıştırma-akışı-web), [Further Notes](../spec.md#further-notes), [Testing Decisions](../spec.md#testing-decisions)

**What to build:** Konsol sekmesinde Ctrl/Cmd+Enter seçim varsa seçimi, yoksa imlecin bulunduğu (ya da imleçten önceki en yakın) ifadeyi çalıştırır; Ctrl/Cmd+Shift+Enter aynısını Deneme modunda yapar. Tüm script Ctrl/Cmd+Alt+Enter (+Shift: Deneme) ve araç çubuğundaki "Tümünü çalıştır" / "Tümünü dene" ile çalışır. Editör odaktayken ve seçim yokken çalışacak ifade hafif bir zeminle vurgulanır. Aralık sunucuya tek başına bir script olarak gider (ADR-0003); Çalıştırma modu, yazma kilidi, karar kartı, Deneme farkı, Çalıştırma kaydı ve Sorgu geçmişi aralık için aynen işler. Hata vurgusu, oluk işaretleri ve Log satır numaraları editördeki gerçek satırlara düşer.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] core `calisacakAralik(metin, secim, imlec)`: seçim kırpma, ifade içi, `;` sonrası, satır sonunda biten ifade, ifadeler arası boşluk (önceki ifade), yorum, boş script → `null`; dolar tırnaklı gövde ve çok ifadeli seçim doğru.
- [x] core ofset/satır eşlemesi: sunucu olaylarındaki `bas`/`bit`/`satir`/`sutun` aralık başlangıcına göre editör metnine taşınır; tüm script ofset 0'lı özel durumdur (ayrı kod yolu yok).
- [x] core `scriptShortcut` dört eylem döndürür (`calistir`, `dene`, `tumunuCalistir`, `tumunuDene`); Windows AltGraph Alt sayılır; Tablo sekmesi kısayolları değişmez.
- [x] Engelleme denetimi çalıştırılacak metinle yapılır; "Çalıştır" ve "Tümünü çalıştır" düğmelerinin aktifliği ayrı hesaplanır; ipuçlarında kısayollar yazar.
- [x] İmleçte ifade yoksa hiçbir şey çalışmaz ve kısa bir "İmleçte çalışacak ifade yok" geri bildirimi görünür (toast/durum çubuğu gelene kadar mevcut mesaj alanında).
- [x] 25006 sonrası "Transaction modunda çalıştır" teklifi hata alan aralığı ve ofsetini yeniden kullanır.
- [x] Editör metni çalışmadan sonra değişirse işaretler kaybolur (bugünkü kural).
- [x] Çalışacak ifade vurgusu: yalnızca odak + boş seçimde; hata vurgusu önceliklidir.
- [x] `docs/adr/0006-calisacak-aralik.md` yazılır; GLOSSARY'ye **Çalışacak aralık** eklenir; README'deki kısayol anlatımı güncellenir.
- [x] Testler: core (yukarıdakiler); arayüz (Ctrl/Cmd+Enter sahte API'ye yalnızca aralığı, Alt'lı biçim tüm metni gönderir; aralıktaki hata editörde doğru satırda işaretlenir; karışık script'te tek ifade çalıştırılabilir; prod kilidi altında aralık da salt okunur gider).

## Comments

- Geri bildirim, Durum çubuğu gelene kadar araç çubuğundaki `role="status"` "Çalıştırma bildirimi" alanında görünür; seçim ya da metin değişince kalkar.
- Mod rozeti ve editörün altındaki engel listesi tüm script'e göredir (Tümünü çalıştır'ın durumu); aralığın engelleri "▶ Çalıştır" / "⟲ Dene" düğmelerinin açıklamasında, editör satır numaralarıyla yazar.
