# Tablo ekranı yerleşimi

Type: prototype
Status: resolved

## Question

v0.2.2'deki Tablo sekmesi ve kenar çubuğu nasıl daha kolay çalışılır hale gelir? Hedef en az IntelliJ (DataGrip) kadar akıcı olmak, mümkünse geçmek.

v0.2.2'de görülen sorunlar:

- Grid'in üstünde dört satır kontrol var (başlık, filtre, satır sayısı, "Satır ekle" + ipucu). Satır sayısı iki kez yazıyor (`≈ 484` / `486 satır`).
- Bekleyen değişiklikler sütunu (~360 px) çoğu zaman boş duruyor.
- Kenar çubuğu iki ayrı kaydırmalı bölüme bölünmüş. Bağlantı listesi alanın yarısını alıyor, tablo listesine ~12 satır kalıyor. Şema çipleri 3 satır kaplıyor.
- Satır numarası ve kolon tipi gösterilmiyor.

## Answer

Prototip: `prototype/03-tablo-ekrani-yerlesimi` branch'i, `.scratch/ikinci-dilim/prototypes/tablo-ekrani-PROTOTYPE.html`. Varyantlar `?variant=0|A|B|C|D`, `?senaryo=bos|bekleyen`, `?hedef=dev|prod`.

**Seçilen: D (birleşik).** A, B ve C'nin parçalarından kuruldu:

- **Kenar çubuğu (B'den):** Tek ağaç: klasör › bağlantı › veritabanı › şema › tablo. Üstte tek arama kutusu (tablo, şema, bağlantı). Tabloların yanında tahmini satır sayısı. Sistem şemaları "+ N sistem şeması gizli" satırına toplanıyor. Ctrl/Cmd+B ile gizlenir; gizliyken ince bir "» Gezgin" şeridi kalır. Bağlantı listesi + veritabanı paneli + şema çipleri yerleşimi kalkar (harita Q13'ün tablo açma yolu ağaca taşınır).
- **Üst satır (A'dan, filtre B'den):** Tek satır: `tablo ≈N · M yüklü │ WHERE […] ORDER BY […] │ + Satır  + Kolon  ↻  ◧`. Şema ve bağlantı bilgisi ipucunda. Filtre kutuları `SELECT * FROM … WHERE … ORDER BY …` biçiminde tek bir kutu içinde.
- **Sekmeler (B'den):** Tür ikonu (konsol / tablo), ortam rengi noktası, bekleyen değişiklik sayısı rozeti.
- **Grid (A'dan):** Satır numarası kolonu, kolon tipi başlıkta.
- **Tab ile düzenleme (IntelliJ gibi):** Tab / Shift+Tab değeri kaydedip yandaki hücrede düzenlemeyi **açık tutar**. Satır sonunda sarar; yazılamayan hücreleri (yüklü satırın PK'sı, salt okunur kolon, silinecek satır) atlar. Düzenleme kapalıyken Tab yalnızca seçimi taşır. Bu, [02](02-grid-davranis-ayrintilari.md) Q4'teki "Tab: kaydet ve yana geç (düzenleyici kapanır)" kuralının yerini alır.
- **Bekleyen değişiklikler (A'nın alt çekmecesi):** Sağ sütun kalkar.
  - Değişiklik yokken grid'in altında tek satır kısayol ipucu var.
  - Değişiklik varken: rozet, "SQL'i göster/gizle", yazma kilidi (prod), ↶ Geri al, Konsola aktar, ⟲ Dene, Uygula.
  - SQL ve bekleyen listesi grid'in altında açılır, veriyi örtmez. B'nin yüzen çubuğu son satırların üstünü kapattığı için elendi.
- **Satır görünümü (C'nin denetçisi):** Sağda varsayılan kapalı bir panel. Grid'de Shift+Enter ya da `◧` açar; Shift+Enter ya da Esc kapatır. Sekmeler: Satır | Değişiklikler (n).
  - Satır sekmesi seçili satırı dikey form olarak gösterir: kolon adı, tip, tam değer.
  - Form düzenlenebilir: alanı değiştirmek bekleyen değişiklik olur, alan başına "NULL yap" bağlantısı var. PK alanı salt okunur. Satırı sil / geri al da buradan.
  - IntelliJ'nin Record view'ına karşılık gelir. [02](02-grid-davranis-ayrintilari.md) Q3'teki "değer paneli yok" kararının yerini alır.
- **Kısayollar** (Tablo sekmesi görünürken, düzenleme kutusu açıkken de; kutu önce kaydedilir):

  | Kısayol | Ne yapar |
  |---|---|
  | Ctrl/Cmd+Enter | Uygula |
  | Ctrl/Cmd+Shift+Enter | Dene |
  | Ctrl/Cmd+Alt+Enter | SQL çekmecesini aç/kapat |
  | Ctrl/Cmd+B | Gezgini aç/kapat |

Elenenler:

- A'nın açılır bağlantı seçicisi: ağaçla birlikte iki ayrı gezinme yolu olurdu.
- C'nin her zaman açık ikon rayı: bağlantı veya tablo değiştirmek iki tıklamaya çıkıyordu.
- 0'ın sürekli açık sağ sütunu: boşken alanı boşa harcıyor.

Uygulama: [ikinci-dilim-uygulama/16](../../ikinci-dilim-uygulama/issues/16-tablo-ekrani-yerlesimi.md), [17](../../ikinci-dilim-uygulama/issues/17-satir-gorunumu.md).
