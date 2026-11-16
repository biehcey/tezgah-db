# 16: Tablo ekranı yerleşimi (gezgin ağacı, tek çubuk, alt çekmece, Tab ile düzenleme)

Spec: [İkinci dilim spec'i](../../ikinci-dilim/spec.md#tablo-sekmesi) · Kararlar: [ikinci-dilim/03 Tablo ekranı yerleşimi](../../ikinci-dilim/issues/03-tablo-ekrani-yerlesimi.md)

Prototip (birincil kaynak): `prototype/03-tablo-ekrani-yerlesimi` branch'i, `.scratch/ikinci-dilim/prototypes/tablo-ekrani-PROTOTYPE.html?variant=D`. Prototip kodu taşınmaz, yeniden yazılır.

**What to build:** Prototipteki D yerleşimi, satır görünümü hariç (o [17](17-satir-gorunumu.md)'de). Kenar çubuğu tek ağaca döner. Tablo sekmesinin üstü tek satıra iner. Bekleyen değişiklikler sağ sütundan grid'in altındaki çekmeceye taşınır. Tab düzenlemeyi bir sonraki hücrede açık tutar. Uygula, Dene, SQL ve gezgin için kısayollar eklenir.

**Blocked by:** —

**Status:** done (cb34efe)

- [x] Kenar çubuğu: klasör › bağlantı › veritabanı › şema › tablo ağacı, üstte tek arama kutusu.
  - Bağlantı listesi, `VeritabaniPaneli` ve şema çipleri bu ağaca dönüşür.
  - Bugünkü davranışlar korunur: bağlan/yenile, hedef yapma, Veritabanı seçimi (görünür veritabanı ve şemalar), sürükle-bırak ile klasöre taşıma, sağ tık menüsü, içe aktarma "yeni" rozetleri, Alt+Enter ile gösterme.
  - Tabloda tahmini satır sayısı katalogdan; katalog yoksa boş.
  - Gizli sistem şemaları tek satırda toplanır.
- [x] Ctrl/Cmd+B kenar çubuğunu gizler/açar. Gizliyken ince "» Gezgin" şeridi kalır. Durum diske yazılmaz.
- [x] Tablo sekmesi üst satırı tek satır: ad, `≈N · M yüklü`, `WHERE`/`ORDER BY` kutuları tek çerçevede, `+ Satır`, `+ Kolon`, `↻`.
  - Ayrı "N satır" durum satırı ve ipucu satırı kalkar.
  - Yükleniyor, sınır ve OFFSET notları ad ve sayının yanına ya da çekmece satırına taşınır.
  - Filtre hatası yine ilgili kutunun altında görünür.
- [x] Grid'de satır numarası kolonu (yapışkan, sol) ve kolon tipi başlıkta (`typeName`). Konsol sonuçlarında da.
- [x] Sağ sütun kalkar, alt çekmece gelir.
  - Değişiklik yokken: kısayol ipucu satırı.
  - Değişiklik varken: sayı rozeti, "SQL'i göster/gizle", yazma kilidi düğmesi (prod), ↶ Geri al (tüm bekleyenleri atar), Konsola aktar, ⟲ Dene, Uygula.
  - SQL açıkken: bekleyen listesi ve üretilen SQL yan yana, grid'in altında. Hatalı ifadenin satırı listede işaretli kalır.
  - Karar kartı, Değişiklikler (deneme) ve deneme prod uyarısı da çekmecede.
  - "+ Kolon" formu yerini korur: açıkken yan panel olarak açılır.
- [x] Konsol sekme şeridinde tür ikonu (konsol / tablo), hedef bağlantının ortam rengi noktası, Tablo sekmesinde bekleyen sayısı rozeti.
- [x] Tab / Shift+Tab düzenleyicide kaydedip yandaki **yazılabilir** hücrede düzenleyiciyi açık açar.
  - Satır sonunda sarar. Yüklü satırın PK'sını, salt okunur kolonu ve silinecek satırı atlar.
  - Yazılabilir hücre kalmadıysa düzenleyici kapanır, seçim yerinde kalır.
  - Düzenleme kapalıyken Tab bugünkü gibi yalnızca seçimi taşır.
  - Atlama mantığı `src/core/grid/secim.ts`'te saf ve test edilir.
- [x] Kısayollar, yalnızca Tablo sekmesi görünürken ve pencere açık değilken: Ctrl/Cmd+Enter Uygula, Ctrl/Cmd+Shift+Enter Dene, Ctrl/Cmd+Alt+Enter SQL çekmecesi.
  - Düzenleyici açıkken önce kaydedilir.
  - Düğme kapalıysa (salt okunur prod, çalışıyor, bekleyen yok) kısayol hiçbir şey yapmaz.
  - Windows'ta AltGr (Ctrl+Alt) yazmayı bozmaz.
- [x] Spec güncellenir: Tablo sekmesi ve Düzenlenebilir grid hikayeleri, web bölümü. [02](../../ikinci-dilim/issues/02-grid-davranis-ayrintilari.md) Q4'teki Tab kuralı bu ticket'a göre yeniden yazılır.
- [x] Testler:
  - core: Tab hedefi (sarma, atlama, uç durumlar).
  - web: ağaç (aç/kapa, arama, tablo açma, hedef yapma).
  - web: çekmece (boş/dolu, SQL göster, Geri al).
  - web: kısayollar (prod salt okunurda Uygula çalışmaz).
  - web: Tab ile ardışık düzenleme. Mevcut testler yeni yerleşime uyarlanır.

## Comments
