# Spec: Beşinci dilim (editör ergonomisi, yerleşim ve görsel dil)

Status: done (0.5.0; tarayıcıda görsel tur ticket 15'te açık)

Kaynak: [reports/Tezgah IntelliJ farkları ve arayüz.md](../../reports/Tezgah%20IntelliJ%20farkları%20ve%20arayüz.md), yol haritasının 1–12. maddeleri. Kararlar (2026-11-20): kapsam 1–12; Ctrl/Cmd+Enter DataGrip gibi Çalışacak aralığı çalıştırır; test sınırları mevcut üç katman (core birim, sahte-api'li arayüz, embedded-postgres'li sunucu). Terimler [GLOSSARY.md](../../GLOSSARY.md)'deki anlamlarıyla kullanılır: Hedef, Sekme, Tablo sekmesi, Çalıştırma modu, Deneme modu, Yazma kilidi, Karar süresi, Sonuç sekmesi, Sonuç grid'i, Çalıştırma kaydı, Sorgu geçmişi, Ortam etiketi. İlgili ADR'ler: [ADR-0003](../../docs/adr/0003-konsol-sekmeli-script-editoru.md) (ayrı autocommit konsolu yok; her çalıştırma aynı script çalıştırıcısından geçer), [ADR-0004](../../docs/adr/0004-okuma-modu.md). Önceki dilimlerin spec'leri ve CLAUDE.md'deki değişmez kurallar değişmeden geçerlidir.

Bu dilim yeni terimler getirir: **Çalışacak aralık**, **Sunucu bildirimi**, **Sonuç alanı**, **Durum çubuğu**, **Arayüz tercihleri**. Tanımları "Further Notes"ta; ilk ticket GLOSSARY.md'ye ekler.

## Problem Statement

Tezgah'ın güvenlik modeli ve çekirdek akışları hazır, ama günlük kullanımda her dakika dokunduğum kabuk beni yavaşlatıyor:

- Konsolda tek bir sorguyu denemek için ya script'i silip yeniden yazıyorum ya da diğer ifadeleri yoruma alıyorum; Ctrl/Cmd+Enter her zaman tüm script'i çalıştırıyor. DataGrip'te imleçteki ifadeyi çalıştırmaya alışkınım.
- Editörde ara/değiştir yok, parantez eşleşmesi yok, aktif satır görünmüyor.
- `RAISE NOTICE` ile hata ayıkladığım PL/pgSQL çıktısını hiç göremiyorum.
- Koyu temada `SELECT`, `FROM`, `WHERE` koyu zemin üzerinde neredeyse okunmuyor.
- Gezgin sabit 280 px, sağdaki çalıştırma/log kolonu boşken bile sabit 400 px; dizüstünde editöre bir avuç yer kalıyor, sonuçlar editörün altında ince bir şeride sıkışıyor, hiçbir paneli sürükleyerek büyütemiyorum. Gezgini her açılışta yeniden gizliyorum.
- Hedef, transaction durumu, süre ve satır sayısı başlık çiplerine, rozetlere ve log kolonuna dağılmış; bir bakışta "şu an ne durumdayım" göremiyorum.
- Grid'de sayılar sola yaslı ve hizasız; seçtiğim hücrelerin toplamını göremiyorum; seçimi yalnızca başlıksız TSV ya da INSERT olarak kopyalayabiliyorum, bir issue'ya Markdown ya da bir araca CSV/JSON yapıştıramıyorum.
- Kısayolların çoğunu yalnızca tooltip'lerden öğreniyorum; Ctrl/Cmd+K paletinde dört komut var, kısayol listesi yok.
- Prod sinyali gürültülü: yazma kilidi hem başlıkta hem alt araç çubuğunda; prod konsolu arkadayken yeni bağlantı formunda bile kırmızı çerçeve görüyorum. Dev ve staging rozetlerindeki beyaz yazı zor okunuyor.
- Görünüm tutarsız: düğmeler, rozetler, diyaloglar, tarih seçicisi ve radyo düğmeleri her yerde farklı; ikonlar işletim sistemine göre değişen Unicode karakterleri ve bir emoji; hatalar kapatılamayan kırmızı paragraflar olarak üst üste birikiyor; temayı elle seçemiyorum; diyaloglarda Tab odağı arkadaki sayfaya kaçıyor.

## Solution

**Editör.** Ctrl/Cmd+Enter artık **Çalışacak aralığı** çalıştırır: seçim varsa seçimi, yoksa imlecin bulunduğu ifadeyi. Editör odaktayken çalışacak ifade hafif bir zeminle vurgulanır. Tüm script Ctrl/Cmd+Alt+Enter ile ya da araç çubuğundaki "Tümünü çalıştır" ile çalışır; Shift eklemek aynı ayrımı Deneme modu için yapar. Çalışacak aralık sunucuya tek başına bir script olarak, aynı script çalıştırıcısından gider (ADR-0003): Çalıştırma modu, yazma kilidi, karar kartı, Deneme farkı ve Çalıştırma kaydı aynen işler. Hata ve satır işaretleri editördeki doğru satırlara düşer. Editöre ara/değiştir (Ctrl/Cmd+F, Türkçe panel), parantez eşleştirme, otomatik kapatma ve aktif satır vurgusu eklenir.

**Sunucu bildirimleri.** Çalışma sırasında Postgres'in gönderdiği `NOTICE`/`WARNING`/`INFO`/`LOG`/`DEBUG` mesajları, hangi ifadede geldikleriyle birlikte Sonuç alanının "Bildirimler" sekmesinde görünür.

**Yerleşim.** Gezgin genişliği sürüklenebilir. Konsol sekmesinde editör üstte, **Sonuç alanı** altta; aralarındaki bölücü sürüklenebilir. Sağdaki 400 px kolon kalkar: Log, Değişiklikler (Deneme) ve Bildirimler, Sonuç sekmeleriyle birlikte Sonuç alanında sekme olur. Karar kartı ve bekletme göstergesi Sonuç alanının üstünde, sekmeden bağımsız görünür kalır. Sorgu geçmişi editörü daraltmayan, üste binen bir çekmeceye dönüşür. Uygulamanın en altında tek satırlık bir **Durum çubuğu** hedefi, ortamı, transaction durumunu, son çalıştırmanın süresini ve satır sayısını, grid seçim özetini gösterir. Gezgin görünürlüğü ve genişliği, editör/sonuç oranı, Sonuç alanının daraltılmışlığı ve tema **Arayüz tercihleri** olarak diske yazılır ve açılışta geri gelir.

**Grid.** Sayısal kolonlar sağa yaslanır ve sabit genişlikli rakamlarla hizalanır; satır üzerine gelince vurgulanır; kolon tipi okunur boyutta yazar. Seçim CSV, Markdown, JSON ve başlıklı TSV olarak da kopyalanır. Durum çubuğu seçimin hücre sayısını, sayısal hücrelerde toplamını ve ortalamasını gösterir.

**Keşfedilebilirlik.** Ctrl/Cmd+K paleti konsol komutlarıyla dolar (çalıştır, tümünü çalıştır, dene, yazma modu, yeni konsol, sorgu geçmişi, gezgin, tema, kısayollar), her komutun yanında kısayolu yazar. `?` (ve paletteki komut) tüm kısayolları gruplu gösteren bir sayfa açar. Bağlam menülerinde ikon, ayırıcı ve kısayol ipucu olur. Kısayolların tek kaynağı vardır; tooltip, menü, palet ve kısayol sayfası oradan beslenir.

**Prod sinyali.** Yazma kilidi tek yerde, hedef başlığındadır: salt okunurken sakin, yazma açıkken dolu kırmızı ve "YAZMA AÇIK" etiketli. Tek tıkla değişir, ayrıca onay istenmez (değişmez kural korunur). Kırmızı uygulama çerçevesi yalnızca prod hedefli bir konsol ya da Tablo sekmesi görünürken çizilir. Ortam rozetlerinde yazı rengi zemine göre okunur kontrastta seçilir.

**Görsel dil.** Renk, boşluk, yazı boyutu, köşe yarıçapı ve font ailesi için tasarım token'ları; açık ve koyu için ayrı nötr ölçekler ve tema değişse de değişmeyen semantik bir `prod` rengi. Tema Sistem/Açık/Koyu olarak elle seçilir. SQL renklendirmesi token'lara bağlıdır, iki temada da okunur. Ortak bileşenler (düğme, rozet, diyalog, bildirim kutusu/toast, yükleniyor göstergesi, form kontrolleri) tüm ekranlarda kullanılır. İkonlar tutarlı bir SVG setinden gelir. Diyaloglar odağı içinde tutar; klavye odağı her yerde görünür.

## User Stories

### Çalışacak aralık

1. Geliştirici olarak Ctrl/Cmd+Enter'a bastığımda imlecin bulunduğu ifadenin çalışmasını istiyorum, böylece çok ifadeli bir script'te tek sorguyu diğerlerini silmeden deneyebilirim.
2. Geliştirici olarak bir metin seçiliyken Ctrl/Cmd+Enter'ın yalnızca seçimi çalıştırmasını istiyorum, böylece bir ifadenin parçasını ya da birkaç ifadeyi birlikte çalıştırabilirim.
3. Geliştirici olarak seçim birden çok ifade içeriyorsa seçimin bir script gibi, ifadeleri sırayla ve aynı transaction'da çalışmasını istiyorum.
4. Geliştirici olarak imleç bir ifadenin sonundaki `;`'ten hemen sonra ya da aynı satırın sonundayken o ifadenin çalışmasını istiyorum, çünkü yazmayı bitirip Ctrl+Enter'a basarım.
5. Geliştirici olarak imleç iki ifade arasındaki boş satırdaysa imleçten önceki en yakın ifadenin çalışmasını istiyorum.
6. Geliştirici olarak imleçte de öncesinde de ifade yoksa (ör. boş script ya da yalnızca yorum) hiçbir şeyin çalışmamasını ve durum çubuğunda "İmleçte çalışacak ifade yok" yazmasını istiyorum.
7. Geliştirici olarak editör odaktayken ve seçim yokken çalışacak ifadenin hafif bir zeminle vurgulanmasını istiyorum, böylece Ctrl+Enter'ın neyi çalıştıracağını önceden görürüm.
8. Geliştirici olarak seçim varken ifade vurgusunun kaybolmasını istiyorum, çünkü o an çalışacak olan seçimdir.
9. Geliştirici olarak tüm script'i Ctrl/Cmd+Alt+Enter ile çalıştırabilmek istiyorum.
10. Geliştirici olarak Ctrl/Cmd+Shift+Enter'ın Çalışacak aralığı, Ctrl/Cmd+Alt+Shift+Enter'ın tüm script'i Deneme modunda çalıştırmasını istiyorum.
11. Geliştirici olarak araç çubuğunda "Çalıştır" (Çalışacak aralık) ve "Tümünü çalıştır" düğmelerini ayrı ayrı görmek, Dene için de aynı ikiliyi bulmak istiyorum; her düğmenin ipucunda kısayolu yazsın.
12. Windows kullanıcısı olarak Ctrl+Alt+Enter'ın AltGr ile karışmamasını ve bir karakter yazmamasını istiyorum.
13. Geliştirici olarak Çalışacak aralığın Çalıştırma modunun yalnızca o aralığın içeriğinden çıkarılmasını istiyorum, böylece bir script'teki tek `VACUUM`'u imleçle Autocommit olarak, geri kalanını Transaction olarak çalıştırabilirim.
14. Geliştirici olarak transaction dışı komutla diğerlerini karıştıran bir script'te ifadeleri tek tek çalıştırabilmek istiyorum (karışık script reddi tüm script için sürer).
15. Geliştirici olarak prod hedefte yazma kilidi kapalıyken Çalışacak aralığın da tüm script'le aynı kurallarla salt okunur çalışmasını istiyorum.
16. Geliştirici olarak Çalışacak aralık Transaction modunda bittiğinde karar kartının (commit/rollback/uzat, Karar süresi) aynen gelmesini istiyorum.
17. Geliştirici olarak Çalışacak aralıkta bir ifade hata verirse hatalı satırın ve dalgalı alt çizginin editördeki gerçek konumda işaretlenmesini istiyorum, aralığın kendi satır numarasında değil.
18. Geliştirici olarak Log'daki ifade satır numaralarının ve hata konumunun editördeki satırlarla aynı olmasını istiyorum.
19. Geliştirici olarak oluk işaretlerinin (sırada/çalışıyor/başarılı/hatalı) yalnızca çalışan aralığın ifadelerinde görünmesini istiyorum, diğer ifadelerde değil.
20. Geliştirici olarak çalışmadan sonra editörü değiştirirsem işaretlerin bugünkü gibi kaybolmasını istiyorum, çünkü konumları artık geçersizdir.
21. Geliştirici olarak Çalışma kaydına ve Sorgu geçmişine gerçekten çalışan metnin (aralığın) yazılmasını istiyorum, böylece geçmişten açtığımda aynı şeyi bulurum.
22. Geliştirici olarak Deneme farkının ve Yedek önizlemenin Çalışacak aralıkla da aynen çalışmasını istiyorum.
23. Geliştirici olarak Okuma modunda Çalışacak aralığın sonuçlarında daha fazla satır yükleyebilmek istiyorum (bugünkü davranış).
24. Geliştirici olarak 25006 sonrası "Transaction modunda çalıştır" teklifinin, hata alan aralığı (tüm script'i değil) yeniden çalıştırmasını istiyorum.
25. Geliştirici olarak çalışma sürerken editörün bugünkü gibi salt okunur kalmasını istiyorum, böylece offset'ler kaymaz.
26. Geliştirici olarak Tablo sekmesindeki Ctrl/Cmd+Enter (Uygula), +Shift (Dene) ve +Alt (SQL çekmecesi) kısayollarının değişmemesini istiyorum.

### Editör temelleri

27. Geliştirici olarak editörde Ctrl/Cmd+F ile arama panelini açmak istiyorum.
28. Geliştirici olarak aynı panelde değiştirme, tümünü değiştirme, büyük/küçük harf, tam kelime ve düzenli ifade seçeneklerini kullanmak istiyorum.
29. Geliştirici olarak F3/Shift+F3 (macOS'ta Cmd+G/Cmd+Shift+G) ile sonraki/önceki eşleşmeye gitmek istiyorum.
30. Geliştirici olarak arama panelinin metinlerinin Türkçe olmasını istiyorum.
31. Geliştirici olarak salt okunur editörde (çalışma sürerken) aramanın çalışmasını, değiştirmenin kapalı olmasını istiyorum.
32. Geliştirici olarak imleç bir parantezin yanındayken eşinin vurgulanmasını istiyorum.
33. Geliştirici olarak `(`, `[`, `'`, `"` yazınca kapanışının otomatik eklenmesini, kapanışı yazınca çift karakter oluşmamasını istiyorum.
34. Geliştirici olarak imlecin bulunduğu satırın hafifçe vurgulanmasını istiyorum.
35. Geliştirici olarak seçili kelimenin diğer geçişlerinin hafifçe vurgulanmasını istiyorum.
36. Geliştirici olarak Ctrl/Cmd+F'nin editör odakta değilken tarayıcının kendi aramasını açmaya devam etmesini istiyorum.

### Sunucu bildirimleri

37. PL/pgSQL yazan biri olarak `RAISE NOTICE` çıktısını çalıştırmanın sonunda görmek istiyorum.
38. Geliştirici olarak her bildirimin hangi ifadede geldiğini (satır numarasıyla) görmek istiyorum.
39. Geliştirici olarak bildirimin seviyesini (`NOTICE`, `WARNING`, `INFO`, `LOG`, `DEBUG`) renk ve etiketle ayırt etmek istiyorum; `WARNING` belirgin olsun.
40. Geliştirici olarak varsa `DETAIL` ve `HINT` alanlarını da görmek istiyorum.
41. Geliştirici olarak Sonuç alanında "Bildirimler (N)" sekmesini yalnızca bildirim geldiyse görmek istiyorum.
42. Geliştirici olarak bildirim gelen bir çalıştırmada Log'daki ifadenin yanında bildirim sayısını görmek ve tıklayınca Bildirimler sekmesine gitmek istiyorum.
43. Geliştirici olarak `DO` bloğu gibi uzun süren bir ifadede bildirimlerin geldikçe görünmesini istiyorum, ifade bitene kadar beklemeden.
44. Geliştirici olarak çok fazla bildirim üreten bir döngüde arayüzün donmamasını istiyorum; ilk 1000 bildirim gösterilsin, gerisi "+N bildirim daha gösterilmedi" diye sayılsın.
45. Geliştirici olarak bildirimlerin Deneme modunda ve Autocommit'te de gösterilmesini istiyorum.
46. Geliştirici olarak bildirimlerin seçilip kopyalanabilmesini istiyorum.

### Yerleşim

47. Geliştirici olarak gezginin sağ kenarını sürükleyerek genişliğini değiştirebilmek istiyorum (en az 200 px, en fazla pencerenin yarısı).
48. Geliştirici olarak gezgin bölücüsüne çift tıklayınca varsayılan genişliğe dönmek istiyorum.
49. Klavye kullanıcısı olarak bölücülere Tab ile odaklanıp ok tuşlarıyla boyutlandırabilmek istiyorum.
50. Geliştirici olarak konsol sekmesinde editörün üstte, Sonuç alanının altta olmasını ve aradaki bölücüyü sürükleyebilmeyi istiyorum.
51. Geliştirici olarak Sonuç alanını tek tıkla daraltıp editöre tüm yüksekliği verebilmek, yine tek tıkla geri açabilmek istiyorum.
52. Geliştirici olarak sağdaki sabit çalıştırma/log kolonunun kalkmasını, editörün ve sonuçların ana alanın tüm genişliğini kullanmasını istiyorum.
53. Geliştirici olarak Sonuç alanında Sonuç sekmelerini (ifade başına), Log'u, Deneme'de Değişiklikler'i ve bildirim varsa Bildirimler'i aynı sekme şeridinde görmek istiyorum.
54. Geliştirici olarak çalıştırma bitince Sonuç alanının en anlamlı sekmeyi açmasını istiyorum: hata varsa Log, Deneme ise Değişiklikler, aksi hâlde satır döndüren son ifadenin Sonuç sekmesi, hiç yoksa Log.
55. Geliştirici olarak karar kartının (commit/rollback/uzat ve geri sayım) Sonuç alanının üstünde, hangi sekme açık olursa olsun görünür kalmasını istiyorum, böylece açık transaction'ı gözden kaçırmam.
56. Geliştirici olarak bekletme göstergesinin de aynı yerde, karar kartıyla birlikte görünmesini istiyorum.
57. Geliştirici olarak Sorgu geçmişinin (Ctrl/Cmd+Alt+E) editörü daraltmadan sağdan üste binen bir çekmece olarak açılmasını, Esc ile kapanmasını istiyorum.
58. Geliştirici olarak Sorgu geçmişini açan görünür bir düğme istiyorum, böylece kısayolu bilmeden de bulurum.
59. Geliştirici olarak 900×700 bir pencerede editörün okunur genişlikte kalmasını, araç çubuğunun tek satırda kalmasını ve "Salt okunur"/"YAZMA AÇIK" etiketinin kesilmemesini istiyorum; sığmayan ikincil düğmeler bir "⋯" menüsüne taşınsın.
60. Geliştirici olarak Tablo sekmesinin de yeni token'ları ve bileşenleri kullanmasını, grid'in alanı doldurmasını istiyorum (Tablo sekmesinin akışı değişmez).

### Durum çubuğu

61. Geliştirici olarak uygulamanın en altında tek satırlık bir durum çubuğu görmek istiyorum.
62. Geliştirici olarak durum çubuğunda etkin sekmenin hedefini (bağlantı / veritabanı) ve ortam rozetini görmek istiyorum.
63. Geliştirici olarak durum çubuğunda transaction durumunu görmek istiyorum: Hazır, Çalışıyor (k/n ifade), Karar bekleniyor (kalan süre), Okuma açık (kalan süre), Bağlı değil.
64. Geliştirici olarak son çalıştırmanın süresini ve son ifadenin satır sayısını durum çubuğunda görmek istiyorum.
65. Geliştirici olarak grid'de seçim varken durum çubuğunda seçimin hücre sayısını görmek istiyorum.
66. Geliştirici olarak seçimde sayısal hücreler varsa toplamını ve ortalamasını da görmek istiyorum; NULL'lar sayılmasın.
67. Geliştirici olarak toplamın büyük `numeric`/`bigint` değerlerde de kesin olmasını istiyorum (kayan nokta hatası olmadan).
68. Geliştirici olarak Tablo sekmesindeyken durum çubuğunda tahmini satır sayısını ve bekleyen değişiklik sayısını görmek istiyorum.
69. Geliştirici olarak durum çubuğunda kısayol sayfasını açan bir `?` düğmesi ve uygulama sürümünü görmek istiyorum.
70. Geliştirici olarak "İmleçte çalışacak ifade yok", "Kopyalandı" gibi kısa geri bildirimlerin durum çubuğunda ya da toast'ta görünmesini, çalışma alanının üstünde birikmemesini istiyorum.

### Grid okunabilirliği ve kopyalama

71. Geliştirici olarak sayısal kolonların (`int2`, `int4`, `int8`, `numeric`, `float4`, `float8`, `money`, `oid`) sağa yaslanmasını ve rakamların sabit genişlikte hizalanmasını istiyorum.
72. Geliştirici olarak başlıkların da kolonun hizasını izlemesini istiyorum.
73. Geliştirici olarak fareyle üzerine geldiğim satırın hafifçe vurgulanmasını istiyorum.
74. Geliştirici olarak kolon tipinin başlıkta okunur boyutta (en az 11 px) yazmasını istiyorum.
75. Geliştirici olarak bu iyileştirmelerin hem Sonuç grid'inde hem Tablo sekmesinde geçerli olmasını istiyorum.
76. Geliştirici olarak grid'in sağ tık menüsünde "Kopyala" altında TSV, başlıklı TSV, CSV, Markdown, JSON ve (bugünkü) INSERT seçeneklerini görmek istiyorum.
77. Geliştirici olarak Ctrl/Cmd+C'nin bugünkü gibi başlıksız TSV kopyalamasını, Ctrl/Cmd+Shift+C'nin başlıklı TSV kopyalamasını istiyorum.
78. Geliştirici olarak CSV'nin başlık satırıyla, RFC 4180'e göre tırnaklanmış olmasını; NULL'un boş alan, boş metnin `""` olmasını istiyorum, böylece ikisi ayırt edilir.
79. Geliştirici olarak Markdown kopyasının başlık ve ayırıcı satırıyla gelmesini, hücredeki `|` ve satır sonlarının tabloyu bozmamasını, sayısal kolonların sağa yaslı (`---:`) olmasını istiyorum.
80. Geliştirici olarak JSON kopyasının kolon adlarıyla nesnelerden oluşan bir dizi olmasını istiyorum.
81. Geliştirici olarak JSON'da NULL'un `null`, `bool`'un `true`/`false`, `int2`/`int4`/`float`'ların sayı, `json`/`jsonb` değerlerinin iç içe JSON olmasını; `int8` ve `numeric`'in hassasiyet kaybolmasın diye metin kalmasını istiyorum.
82. Geliştirici olarak aynı adlı iki kolon varsa JSON anahtarlarının `ad`, `ad_2` diye ayrışmasını istiyorum, böylece veri kaybolmaz.
83. Geliştirici olarak yalnızca kesilmiş (1000 karakter) değerler yerine tam değerin kopyalanmasını istiyorum (bugünkü TSV davranışıyla aynı).
84. Geliştirici olarak kopyalamanın ardından kısa bir "N satır CSV olarak kopyalandı" geri bildirimi görmek istiyorum.

### Keşfedilebilirlik

85. Geliştirici olarak Ctrl/Cmd+K paletinde konsol komutlarını (Çalıştır, Tümünü çalıştır, Dene, Tümünü dene, Yazma modunu aç/kapat, Yeni konsol, Sorgu geçmişi, Gezgini göster/gizle, Sonuç alanını daralt/aç, Tema: Sistem/Açık/Koyu, Kısayollar) görmek istiyorum.
86. Geliştirici olarak paletteki her komutun yanında kısayolunu görmek istiyorum.
87. Geliştirici olarak o an uygulanamayan komutların (ör. hedefsiz sekmede Çalıştır, prod olmayan hedefte Yazma modu) pasif görünmesini ve nedeninin kısa bir notla yazmasını istiyorum.
88. Geliştirici olarak `?` tuşuna (bir metin alanında değilken) ya da paletteki komuta basınca tüm kısayolları gruplu (Genel, Editör, Grid, Tablo sekmesi, Palet) gösteren bir sayfa açılmasını istiyorum.
89. macOS kullanıcısı olarak kısayolların her yerde ⌘/⌥/⇧ ile, Windows kullanıcısı olarak Ctrl/Alt/Shift ile yazmasını istiyorum.
90. Geliştirici olarak tooltip'lerde, menülerde, palette ve kısayol sayfasında aynı kısayol metnini görmek istiyorum, böylece biri değişince hepsi değişir.
91. Geliştirici olarak bağlam menülerinde öğelerin ikonlu olmasını, grupların ayırıcıyla ayrılmasını ve kısayolu olan öğelerin sağında kısayolun yazmasını istiyorum.

### Prod sinyali

92. Prod'da çalışan biri olarak yazma kilidini tek bir yerde, hedef başlığında görmek ve değiştirmek istiyorum.
93. Prod'da çalışan biri olarak salt okunurken başlığın sakin görünmesini (kilit ikonu ve "Salt okunur"), yazma açıkken başlığın dolu kırmızı olmasını ve "YAZMA AÇIK" yazmasını istiyorum, böylece tehlikeli durumu bir bakışta görürüm.
94. Prod'da çalışan biri olarak yazma modunun bugünkü gibi tek tıkla açılmasını ve çalıştırmadan önce ayrıca onay istenmemesini istiyorum.
95. Geliştirici olarak kırmızı uygulama çerçevesinin yalnızca prod hedefli bir konsol ya da Tablo sekmesi görünürken çizilmesini; bağlantı formu, içe aktarma ya da başka bir ekran açıkken çizilmemesini istiyorum.
96. Geliştirici olarak ortam rozetlerinde yazı renginin zemine göre en az 4.5:1 kontrastla (siyah ya da beyaz) seçilmesini istiyorum; kendi seçtiğim renkte de.
97. Geliştirici olarak aynı kontrast kuralının başlıktaki, gezgindeki, paletteki ve bağlantı formundaki rozetlerde geçerli olmasını istiyorum.

### Görsel dil ve tema

98. Geliştirici olarak koyu temada SQL anahtar kelimelerinin, dizgelerin, sayıların, yorumların ve adların okunur renklerde olmasını istiyorum.
99. Geliştirici olarak aynı renklendirmenin Tablo sekmesinin `WHERE`/`ORDER BY` kutularında da geçerli olmasını istiyorum.
100. Geliştirici olarak temayı Sistem, Açık ya da Koyu olarak elle seçebilmek istiyorum; Sistem işletim sistemini izlesin.
101. Geliştirici olarak tema değiştirince editör dahil tüm arayüzün yeniden yüklemeden değişmesini istiyorum.
102. Geliştirici olarak prod kırmızısının temadan bağımsız aynı kalmasını istiyorum.
103. Geliştirici olarak düğmelerin her ekranda aynı türlerde (birincil, ikincil, tehlikeli, sade) ve aynı boyutlarda görünmesini istiyorum.
104. Geliştirici olarak rozet/çip stillerinin tek bir bileşenden gelmesini istiyorum.
105. Geliştirici olarak tüm diyalogların aynı çerçeve, başlık, kapatma ve düğme düzenini kullanmasını istiyorum.
106. Klavye kullanıcısı olarak bir diyalog açıkken Tab odağının diyalog içinde kalmasını, Esc'in diyaloğu kapatmasını ve kapanınca odağın açan öğeye dönmesini istiyorum.
107. Klavye kullanıcısı olarak odaktaki öğeyi her yerde görünür bir halkayla görmek istiyorum.
108. Geliştirici olarak hata mesajlarının kapatılabilir toast'larda görünmesini, başarı geri bildirimlerinin birkaç saniye sonra kendiliğinden kaybolmasını, hataların ben kapatana kadar kalmasını istiyorum.
109. Geliştirici olarak yükleme durumlarında yalnızca "Yükleniyor…" metni yerine tutarlı bir yükleniyor göstergesi görmek istiyorum.
110. Geliştirici olarak sorgu geçmişi panelindeki radyo, onay kutusu ve tarih alanlarının uygulamanın geri kalanıyla aynı stilde olmasını istiyorum.
111. Geliştirici olarak ikonların her işletim sisteminde aynı görünmesini (Unicode karakterleri ve emoji yerine SVG) istiyorum.
112. Geliştirici olarak ikincil metinlerin 11 px'ten küçük olmamasını istiyorum.

### Arayüz tercihleri

113. Geliştirici olarak gezginin görünürlüğünün ve genişliğinin Tezgah yeniden açıldığında hatırlanmasını istiyorum.
114. Geliştirici olarak editör/sonuç oranının ve Sonuç alanının daraltılmışlığının hatırlanmasını istiyorum.
115. Geliştirici olarak tema seçimimin hatırlanmasını istiyorum.
116. Geliştirici olarak tercih dosyası bozuk ya da eksikse Tezgah'ın varsayılanlarla açılmasını istiyorum.
117. Geliştirici olarak pencere küçüldüğünde kayıtlı genişliklerin pencereye sığacak şekilde sınırlanmasını istiyorum.
118. Geliştirici olarak tercihlerin okunmasının ve yazılmasının hiçbir veritabanına bağlanmamasını istiyorum.

## Implementation Decisions

### Çalışacak aralık (core, saf)

- Yeni saf fonksiyon: `calisacakAralik(metin, secim: { from, to }, imlec)` → `{ bas, bit } | null`. Seçim boş değilse seçim aralığı (baştaki/sondaki boşluklar kırpılır); kırpılmış seçim yalnızca boşluk/yorumsa `null`. Seçim boşsa ifade bölücünün sınırları kullanılır: imleç bir ifadenin `[start, end]` aralığındaysa (sondaki `;` dahil) o ifade; değilse imlecin satırında biten bir ifade varsa o; değilse imleçten önce biten en yakın ifade; hiçbiri yoksa `null`. İmleç bir yorumun içindeyse de aynı kurallar işler (yorum ifadeye ait değilse "önceki ifade").
- Yeni saf eşleme: aralık başlangıcına göre sunucu olaylarındaki ifade offset'lerini (`bas`, `bit`), satır ve sütunu editör metnine taşır. `RunView` çalıştırılan metnin yanında editör metnindeki başlangıç ofsetini ve o anki editör metnini taşır; satır işaretleri, hata vurgusu ve Log satır numaraları bu eşlemeden geçer. Editör metni çalışma anındakinden farklıysa işaretler gösterilmez (bugünkü kural).
- Tüm script çalıştırması ofset 0'lı, aralığı tüm metin olan özel durumdur; ayrı kod yolu yoktur.

### Çalıştırma akışı (web)

- Sunucuya giden `run` mesajı değişmez: `script` alanı Çalışacak aralığın metnidir. Sunucu tarafında çalıştırıcı, analiz, kilit, Çalıştırma kaydı ve Sorgu geçmişi değişmez; aralığı bir script olarak görür. Bu ADR-0003'e uyar.
- Engelleme denetimi (`runBlockReasons`: boş, karışık, prod kilidi altında Autocommit vb.) çalıştırılacak metin üzerinde yapılır; düğmelerin aktifliği "Çalıştır" için aralığa, "Tümünü çalıştır" için tüm metne göre ayrı hesaplanır.
- Kısayollar: `scriptShortcut` dört eylem döndürür: `calistir` (Ctrl/Cmd+Enter), `dene` (+Shift), `tumunuCalistir` (+Alt), `tumunuDene` (+Alt+Shift). Windows'un AltGraph'ı Alt sayılır (Tablo sekmesindeki kuralla aynı). Tablo sekmesi kısayolları değişmez.
- 25006 sonrası zorla Transaction teklifi hata alan metni (aralığı) ve onun ofsetini yeniden kullanır.
- Vurgu: editör odaktayken ve seçim boşken `calisacakAralik` sonucunu süsleyen bir CodeMirror dekorasyonu; analiz işaretleri ve hata vurgusuyla çakışırsa hata vurgusu önce gelir.

### Editör eklentileri

- `@codemirror/search` bağımlılığı eklenir: arama paneli, `searchKeymap`, `highlightSelectionMatches`. Panel metinleri `EditorState.phrases` ile Türkçeleştirilir.
- `@codemirror/language`'den `bracketMatching`, `@codemirror/autocomplete`'ten `closeBrackets` (+`closeBracketsKeymap`), `@codemirror/view`'dan `highlightActiveLine` eklenir. `closeBrackets`'in tamamlama motorunun Enter/Tab kurallarını bozmadığı mevcut tamamlama testleriyle doğrulanır.
- Sözdizimi renklendirmesi: `defaultHighlightStyle` kaldırılır; token'lara (CSS değişkenleri) bağlı tek bir `HighlightStyle` web katmanında paylaşılır ve hem script editöründe hem filtre kutusunda kullanılır. Renkler CSS değişkeni olduğu için tema değişince editör yeniden kurulmaz.

### Sunucu bildirimleri

- Yeni sunucu olayı (`ServerEvent`'e eklenir): `{ type: 'bildirim'; i: number | null; seviye: 'DEBUG' | 'LOG' | 'INFO' | 'NOTICE' | 'WARNING'; mesaj: string; detay?: string; ipucu?: string }`. `i`, bildirim geldiğinde çalışan ifadenin indeksidir; çalışan ifade yoksa `null`.
- Script çalıştırıcı çalıştırma süresince kullandığı client'ın `notice` olayını dinler, çalıştırma bitince dinleyiciyi kaldırır (havuza dönen client'ta dinleyici kalmaz). Katalog okuma, tablo sayfası ve iptal sorguları bildirim yaymaz.
- Sunucu çalıştırma başına en fazla 1000 bildirim gönderir; aşan bildirimler sayılır ve `bitti` olayında `bildirimFazlasi?: number` olarak bildirilir.
- Seviye sürücünün `severity` alanından gelir (core `noticeEvent`); yerelleştirilmiş ya da tanınmayan seviye `NOTICE` sayılır.
- `RunView` bildirimleri (`bildirimler`, her biri geldiği ifadenin editördeki `satir`'ıyla; ifade dışında `null`) ve fazlalık sayısını (`bildirimFazlasi`) tutar; `applyEvent` saf kalır ve kendisi de 1000'den sonrasını gösterilmeyen olarak sayar. Bildirimler Çalıştırma kaydına yazılmaz (kayıt çalıştırmanın verisini içermez kuralı).
- "Bildirimler (N)" sekmesi şeridin sonundadır (Log ve Değişiklikler'den sonra); N gösterilmeyenleri de sayar. Log'daki sayaç ("N bildirim") yalnızca gösterilen bildirimleri sayar.
- Tablo sekmesinin Bekleyen değişiklik script'leri bildirim olaylarını yok sayar (bu dilimde gösterilmez).

### Yerleşim (web)

- Kök yerleşim: gezgin | ana alan; altta Durum çubuğu. Gezgin bölücüsü sürüklenebilir (en az 200 px, en fazla pencerenin %50'si), çift tıkla 280 px'e döner, `role="separator"` ve `aria-valuenow` taşır, odaktayken ok tuşları 16 px oynatır. Ctrl/Cmd+B bugünkü gibi gizler/açar.
- Konsol sekmesi: hedef başlığı (yazma kilidi burada) → araç çubuğu → editör → yatay bölücü → Karar şeridi (karar kartı + bekletme göstergesi; çalıştırma varken görünür, bitince sonucun tek satırını gösterir) → Sonuç alanı. Sağdaki çalıştırma kolonu kaldırılır.
- Sonuç alanı tek bir sekme şerididir: `Sonuç 1…N` (mevcut Sonuç sekmeleri; GLOSSARY tanımı değişmez), `Log`, `Değişiklikler` (yalnızca Deneme), `Bildirimler (N)` (yalnızca bildirim varsa). Hangi sekmenin açılacağını seçen kural saf bir fonksiyondur (`RunView` → sekme anahtarı): hata → Log; Deneme → Değişiklikler; satır döndüren son ifade → onun Sonuç sekmesi; yoksa Log. Kullanıcı çalışma sürerken sekme değiştirirse bitişte zorla değiştirilmez.
- Sonuç alanı daraltılabilir (yalnızca sekme şeridi kalır); bir sonuç geldiğinde, karar beklendiğinde ya da şeritte bir sekme seçildiğinde kendiliğinden açılır ve açılış tercihe yazılır. Yatay bölücünün değeri editörün piksel boyudur (aşağı/↓ büyütür); tercihe `sonucOrani = 1 − editör/toplam` yazılır, çift tık varsayılan orana döner. Çalışma sürerken açık sekme aynı kuraldan gelir (Deneme: Değişiklikler, aksi Log); kural çalışma bitince (karar, Okuma ya da sonuç) yeniden uygulanır.
- Sorgu geçmişi paneli sağdan üste binen bir çekmeceye dönüşür; Ctrl/Cmd+Alt+E ve hedef başlığındaki bir düğme açar, Esc ve dışına tıklama kapatır. Panelin içeriği ve filtreleri değişmez.
- Araç çubuğu taşma kuralı: genişlik yetmezse ikincil eylemler (Tümünü dene, Tümünü çalıştır; çubuktaki sırayla) "⋯" menüsüne taşınır; birincil eylemler (Çalıştır, Dene, İptal) ve mod rozeti her zaman görünür. Kural saf bir fonksiyondur (`tasanEylemler`, `core/arac-cubugu.ts`: öğe genişlikleri, çubuk genişliği, menü düğmesi ve aralık → taşan anahtarlar); genişlik ölçülemezse hiçbiri taşmaz.
- Durum çubuğu salt görüntüdür, Yazma kilidi düğmesi içermez. Gösterdiği değerler mevcut durumdan (`RunView`, etkin sekme, grid seçimi) türetilir; metinleri `core/durum-cubugu.ts` üretir: `transactionDurumu(run, { bagli, kalanMs })` (Çalışıyor'da biten/toplam ifade; Karar ve Okuma'da kalan süre her zaman yazar; hedef yoksa Bağlı değil), `sonCalistirma` (biten ifadelerin süre toplamı ve son biten ifadenin satır sayısı), `secimMetni`, `tabloMetni`. Seçim özeti yalnızca birden çok hücre seçiliyken görünür (her grid'de tek hücre hep seçilidir). "İmleçte çalışacak ifade yok" Durum çubuğunda, grid kopyalama bilgisi toast'ta görünür. `?` düğmesi kısayol sayfasını açar.

### Arayüz tercihleri

- Arayüz tercihleri, `tezgah.json`'dan ayrı bir dosyada (aynı uygulama veri dizininde, `arayuz.json`) saklanır; şema: `{ surum: 1, gezgin: { acik: boolean, genislik: number }, sonucOrani: number, sonucDaraltilmis: boolean, tema: 'sistem' | 'acik' | 'koyu' }`. Varsayılanlar: gezgin açık ve 280 px, `sonucOrani` 0.4 (Sonuç alanının yüksekliğe oranı), daraltılmamış, `sistem`. Bağlantı ayarlarının sürüm/göç mekanizmasına dokunulmaz.
- Saf bir `normalizeArayuzTercihleri(ham, pencere: { genislik })` (`src/core/arayuz-tercihleri.ts`) bilinmeyen alanları atar, eksik ya da yanlış tipteki alanları varsayılanla doldurur, sayıları sınırlar (genişlik 200..pencere/2 ve tam sayıya yuvarlanır; pencerenin yarısı 200'den darsa pencere/2 kazanır; oran 0.15..0.85). Bozuk JSON varsayılanlara düşer ve dosya ilk yazmada düzelir. Sunucu pencereyi bilmediği için `genislik: Infinity` ile normalleştirir (yalnızca alt sınır); üst sınırı arayüz okurken ve yazarken kendi penceresiyle uygular.
- Sunucu `GET`/`PUT /api/arayuz-tercihleri` açar (erişim anahtarıyla doğrulanır, yalnızca `127.0.0.1`); `PUT` gövdeyi normalleştirip yazar ve yazılanı döndürür. Yazma, sürükleme bitince ve tema değişince yapılır; sürükleme sırasında değil (en fazla saniyede bir). Arayüzde `usePreferences()` (`src/web/ortak/tercihler.ts`) tercihi açılışta bir kez okur ve `update(değişiklik)` ile durumu hemen, dosyayı en fazla saniyede bir günceller: ilk değişiklik hemen yazılır, aralıktakiler aralık dolunca sonuncusuyla tek yazmada (bölücünün ok tuşu tekrarı dahil); sayfa kapanırken bekleyen yazma hemen yapılır. Okuma bitmeden yapılan değişiklikler okunan tercihin üstüne uygulanır ve ondan önce yazılmaz (kayıtlı tercih varsayılanlarla ezilmez).
- Tema `<html data-theme>` ile uygulanır: `acik`/`koyu` özniteliği yazar, `sistem` özniteliği kaldırır ve CSS `prefers-color-scheme` ile işletim sistemini canlı izler (JS dinleyicisi yok). Açılışta tercih gelene kadar sistem teması kullanılır; tercih HTML'e gömülmez (yerel sunucudan gelen tek istekte kısa bir geçiş kabul edildi).

### Grid

- Saf fonksiyon: tip OID'inden kolon hizası (`'sag' | 'sol'`): `int2`, `int4`, `int8`, `numeric`, `float4`, `float8`, `money`, `oid` sağ; diğerleri sol. Sağ kolonlarda `font-variant-numeric: tabular-nums`. Başlık da aynı hizayı izler.
- Satır hover vurgusu; seçim ve düzenlenmiş hücre renkleri token'lara bağlanır.
- Kopyalama biçimleri için yeni saf modül (`core/grid/kopyalama.ts`): `toCsv`, `toMarkdown`, `toJson`, başlıklı TSV (`toTsvWithHeader`, `tsv.ts`'de); girdi: seçili aralığın kolon adları, tip OID'leri ve satırları (tam değerler). INSERT bugünkü gibi seçili satırların tüm kolonlarını yazar. Kurallar User Stories 78–82'deki gibidir; ayrıca Markdown'da NULL `NULL` yazılır ve satır sonları `<br>` olur, JSON'da sayı olamayan float (`NaN`, `Infinity`) metin kalır, JSON anahtarları kolon sırasını korur. Mevcut başlıksız TSV ve INSERT değişmez.
- Seçim özeti için saf fonksiyon: `secimOzeti(degerler, tipler)` (`core/grid/secim-ozeti.ts`) → `{ hucre: number; sayisal?: { adet, toplam: string, ortalama: string } }`. Tam sayı (`oid` dahil) ve `numeric` toplamı ondalık metin aritmetiğiyle kesin hesaplanır (BigInt üzerinden ölçekli; toplam en büyük ölçekle yazılır); `float4/8` ve `money` için Number kullanılır (`money`'nin yerel biçiminde rakam, nokta ve eksi dışındakiler atılır) ve böyle bir hücre varsa toplam Number olur, 15 anlamlı basamağa yuvarlanır. Ortalama en fazla 6 kesir basamağıyla, sıfırdan uzağa yuvarlanır; sondaki sıfırlar atılır. NULL, sayı olmayan değerler (`NaN`, `Infinity`) ve tipi bilinmeyen kolonlar sayılmaz.
- Grid sağ tık menüsünde "Kopyala" alt grubu; Ctrl/Cmd+Shift+C başlıklı TSV.

### Kısayol kataloğu ve palet

- Core'daki kısayol modülüne (`kisayollar.ts`) tek bir katalog (`SHORTCUTS`) eklenir: her kısayol için kimlik, grup, Türkçe açıklama ve tuş tanımı (eşdeğer vuruşlar, ör. F3 / Cmd+G); platforma göre (`mac` / `diger`) görünen metni üreten saf `shortcutText` (macOS'ta `⌃⌥⇧⌘` sırasıyla bitişik, ör. `⌥⇧⌘↵`; diğerlerinde `Ctrl+Alt+Shift+Enter`) ve `aria-keyshortcuts` değerini üreten `ariaKeyShortcuts`. Tooltip'ler, bağlam menüleri, palet ve kısayol sayfası bu katalogdan okur. Mevcut kısayol eşleyicileri (`scriptShortcut`, `tableShortcut`, `rowViewShortcut`, `navigatorShortcut`) davranışlarını korur ve katalogla tutarlılık testiyle bağlanır; sorgu geçmişi (`historyShortcut`) ve `?` (`shortcutsPageShortcut`) de core eşleyicisidir.
- Palet komutları, mevcut durumdan (etkin sekme türü, hedef, prod mu, yazma modu, çalışma sürüyor mu ya da karar bekleniyor mu, tema, gezgin açık mı, Sonuç alanı daraltılmış mı, bağlantı formu açık mı) komut listesini (etkin/pasif + not + kısayol) üreten saf `paletteCommands` (`palet-komutlari.ts`) ile kurulur; etiketler duruma göre değişir ("Yazma modunu aç/kapat", "Gezgini göster/gizle", "Sonuç alanını daralt/aç") ve bağlantı yönetimi komutları (Yeni bağlantı, Yeni klasör, İçe aktar, Çalıştırma kayıtları klasörü) listenin sonundadır. `HizliGecis` bu listeyi gösterir ve komut seçilince ilgili eylemi çağırır; çalıştırma komutları etkin (görünür) Script ekranına gider ve kısayolla aynı işi yapar.
- Kısayol sayfası ortak Diyalog bileşeniyle açılır; `?` yalnızca odak bir metin alanında, editörde ya da grid hücre düzenleyicisinde değilken (ve olayı grid'in yazmaya başlama düzenleyicisi tüketmediyse) tetiklenir.
- `Menu` bileşeni ikon, ayırıcı, alt menü (Kopyala) ve kısayol ipucunu destekler.

### Prod sinyali

- Yazma kilidi düğmesi (`KilitDugmesi`) yalnızca hedef başlığında render edilir; alt araç çubuğundaki ikinci kontrol ve başlıktaki ayrı kilit rozeti kaldırılır (tek kontrol hem durumu gösterir hem değiştirir). Tablo sekmesinde de kontrol Uygula çubuklarından (bekleyenler, kolon formu) tablo başlığına taşınır. Yazma açıkken konsolun hedef başlığı dolu kırmızıdır; Tablo sekmesinin başlığı WHERE/ORDER BY kutuları okunur kalsın diye kırmızımsı zemin ve kırmızı alt çizgi alır, düğme dolu kırmızıdır. Kilit davranışı ve kuralları (sekme/hedef başına, sekme değişince ya da diskten gelince kapalı) değişmez.
- Kırmızı çerçevenin koşulu (`showsProdFrame`, `src/core/yazma-kilidi.ts`): görünen ekran bir konsol ya da Tablo sekmesi ve hedefi `prod` etiketli. Bağlantı formu, içe aktarma (ve sonucu) açıkken çizilmez.
- Saf fonksiyon: `rozetYaziRengi(zemin: '#rrggbb')` → `'#000000' | '#ffffff'`, WCAG göreli parlaklığına göre daha yüksek kontrastlı olan. Tüm ortam rozetleri (`OrtamRozeti`: hedef başlığı, bağlantı formu başlığı ve seçili ortam çipi, palet) bundan beslenir; zemin bağlantının rengi, yoksa etiketin varsayılan rengi. Gezgin ortamı metin rozetiyle değil renk noktasıyla gösterir. Paletteki `prod` rozeti bağlantının rengini değil varsayılan prod rengini kullanır (palet satırı bağlantı rengini taşımaz).

### Tasarım token'ları ve bileşenler

- Tek stil dosyası kalabilir ama tüm literal değerler token'a bağlanır: boşluk ölçeği (2, 4, 6, 8, 12, 16, 24, 32 px), yazı ölçeği (11, 12, 13, 14, 16, 18 px), köşe yarıçapı (küçük, orta, büyük, tam), font aileleri (`--font-ui` sistem yığını, `--font-mono` tek yerde), 12 adımlı nötr ölçek açık ve koyu için ayrı ayrı (Radix tarzı rol adımları: zemin, yüzey, kenar, metin düşük/yüksek kontrast), semantik renkler (vurgu, tehlike, uyarı, başarı) ve temadan bağımsız `--env-prod`. Sözdizimi renkleri de token'dır.
- Ortak bileşenler: `Dugme` (birincil/ikincil/tehlikeli/sade; normal/küçük), `Rozet` (ortam rozeti dahil tüm salt gösterim çip/rozetleri; seçilebilen çipler, yani bağlantı formundaki ortam etiketi ve SSH kimlik doğrulama radyoları ile içe aktarmadaki kaynak düğmeleri, form kontrolü olarak `.cip` kalır), `Diyalog` (yerel `<dialog>` + `showModal()`; odak tuzağı, Esc, odağı geri verme; ilk odak `data-autofocus` ile), `Bildirimler` (toast yığını: hata kalıcı + kapat, başarı ~3 sn; `BildirimSaglayici` altında `useBildirimler()` → `hata(mesaj)` / `basari(mesaj)`), `Yukleniyor` göstergesi, stillenmiş radyo/onay kutusu/tarih alanı. Mevcut `Onay` ve tüm ad-hoc diyaloglar (klasör adı, şifre, host anahtarı, silme onayı, içe aktarma) `Diyalog`'a taşınır.
- İkonlar: Lucide'nin React paketi (yalnızca kullanılan ikonlar paketlenir); Unicode glifleri ve emoji kilit kaldırılır. İstisnalar ikon sayılmaz ve metin kalır: editör kenar çubuğundaki ifade durum işaretleri (✓ ✗ ● ○ – ⚠ ⛔; CodeMirror gutter'ı DOM'u kendisi kurar, ifade kartları aynı durumu SVG ikonla gösterir), klavye gösterimi (⌘ ⇧ ↵) ve Deneme farkının `+ ~ − ≈` işaretleri. İkon yalnız başına anlam taşıyorsa `aria-label`/`title` taşır.
- Global `:focus-visible` halkası token'la tanımlanır; `outline: none` kullanımları ya kaldırılır ya da eşdeğer görünür odakla değiştirilir.
- Mevcut çalışma alanı üstündeki hata/kopyalandı paragrafları `Bildirimler`'e taşınır.
- Grid `@tanstack/react-virtual` tabanlı DOM grid olarak kalır (canvas grid'e geçilmez).

## Testing Decisions

- İyi test dışarıdan görünen davranışı sınar: core'da girdi → çıktı; arayüzde kullanıcının gördüğü ve yaptığı (rol/etiketle bulunan öğeler, klavye ve fare olayları, sahte API'ye giden istekler); sunucuda WebSocket'ten çıkan olaylar. CSS sınıf adları, bileşen içi state ve CodeMirror iç yapısı sınanmaz (editör metni ve imleç mevcut test yardımcılarıyla okunur).
- Yeni test sınırı açılmaz; üç mevcut katman kullanılır:
  - **Core birim testleri** (mevcut `ifade-bolme`, `kisayollar`, `hizli-gecis`, `grid/tsv`, `grid/insert`, `script-calistirma` testleri örnek): `calisacakAralik` (ifade içi, `;` sonrası, satır sonu, ifadeler arası boşluk, yorum, boş script, seçim kırpma, çok ifadeli seçim, dolar tırnaklı gövde); ofset/satır eşlemesi; `scriptShortcut`'ın dört eylemi ve AltGraph; kısayol kataloğunun platform metni; palet komut listesi (etkin/pasif ve notlar); Sonuç alanı açılış sekmesi kuralı; transaction durumu metni; `applyEvent`'in `bildirim` olayı ve 1000 sınırı; kolon hizası; CSV/Markdown/JSON/başlıklı TSV (NULL, boş metin, tırnak, `|`, satır sonu, yinelenen kolon adı, `int8`/`numeric` metin, `jsonb` iç içe); seçim özeti (kesin `numeric` toplamı, NULL, karışık tipler); `rozetYaziRengi` (varsayılan beş ortam rengi ve uç değerler); `normalizeArayuzTercihleri` (bozuk, eksik, sınır dışı).
  - **Arayüz testleri, sahte API ile** (mevcut `ScriptEkrani.test.tsx`, `ScriptEditoru.test.tsx`, `SonucGridi.test.tsx`, `App.test.tsx`, `HizliGecis.test.tsx`, `GecmisPaneli.test.tsx` örnek): Ctrl/Cmd+Enter'ın sahte API'ye yalnızca aralığı göndermesi, Alt'lı biçimin tüm metni göndermesi; aralıktaki hatanın editörde doğru satırda işaretlenmesi; Sonuç alanı sekmeleri ve açılış sekmesi; karar şeridinin sekme değişse de görünmesi; Bildirimler sekmesi ve sayacı; Ctrl/Cmd+F panelinin açılması; palette komutların görünmesi ve çalışması; `?` kısayol sayfası; diyaloglarda odak tuzağı ve Esc; kilit düğmesinin tek yerde olması ve tek tıkla değişmesi; kırmızı çerçevenin bağlantı formunda olmaması; grid "Kopyala" alt menüsünün panoya doğru metni yazması; durum çubuğu seçim özeti; tercihlerin sahte API'den okunup yazılması. jsdom yerleşim ölçmediği için bölücü testleri `aria-valuenow` ve klavye ile yapılır.
  - **Sunucu testleri, embedded-postgres ile** (mevcut `script-calistirici.test.ts`, `deneme.test.ts`, `okuma-modu.test.ts` örnek): `DO $$ BEGIN RAISE NOTICE … END $$` ve `RAISE WARNING`'in doğru `i` ve seviyeyle `bildirim` olayı üretmesi; `DETAIL`/`HINT`; 1000 sınırı ve `bildirimFazlasi`; dinleyicinin çalışma bitince kaldırılması (aynı client'la sonraki çalıştırmada eski bildirim gelmemesi); Deneme ve Autocommit'te bildirim; tercih uç noktalarının erişim anahtarı istemesi ve bozuk dosyada varsayılan dönmesi.
- Görsel doğrulama otomatik testle yapılmaz. Yerleşim ve görsel dil ticket'ları kapanırken uygulama gerçek bir yerel veritabanıyla açılıp açık ve koyu temada, 900×700 ve geniş pencerede ekran görüntüsüyle kontrol edilir (raporun "grid gerçek veriyle doğrulanamadı" boşluğu da burada kapanır).

## Out of Scope

- Raporun 13–26. maddeleri: EXPLAIN ağacı ve flame graph, gezginde tablo dışı nesne klasörleri ve "DDL'i göster", FK üzerinden ilgili satırlara gitme ve jsonb değer paneli, bağlantı başına başlangıç script'i ve uzun sorgu bildirimi, `:name` parametreleri, WHERE'siz UPDATE/DELETE lint'i ya da onayı, dosyaya dışa aktarma ve "dosyaya çalıştır", pg_dump/pg_restore, ProxyJump, SQL ifadesi hücreleri, kolon sabitleme/gizleme ve yerel kolon filtresi, SQL biçimlendirici, hatada otomatik savepoint, ajanlar için yerel uç nokta.
- Değişmez kurallarda değişiklik: prod salt okunur başlar, yazma tek tıkla açılır, çalıştırmadan önce ayrıca onay istenmez; script transaction içinde çalışır ve hatada durur.
- Tablo sekmesinde bildirimlerin gösterilmesi; Tablo sekmesi kısayollarında değişiklik.
- Grid'de sayfa içi arama (Ctrl+F grid'de), satır zebra deseni, ısı haritası, grafik.
- Canvas tabanlı bir grid'e (Glide, AG Grid) geçiş.
- Tema renklerinin kullanıcı tarafından özelleştirilmesi (yalnızca Sistem/Açık/Koyu); ortam renklerinin bugünkü özelleştirmesi aynen kalır.
- Arayüzün çok dilli olması.
- Şema tasarımı, ER diyagramı, Postgres dışı veritabanları (CLAUDE.md).

## Further Notes

- **GLOSSARY eklemeleri** (ilk ticket ekler):
  - **Çalışacak aralık**: Konsol sekmesinde Ctrl/Cmd+Enter'ın çalıştırdığı metin: seçim varsa seçim, yoksa imlecin bulunduğu (ya da imleçten önceki en yakın) ifade. Sunucuya tek başına bir script olarak gider; Çalıştırma modu yalnızca onun içeriğinden çıkar. _Avoid_: Seçili sorgu, current statement.
  - **Sunucu bildirimi**: Bir çalıştırma sırasında Postgres'in gönderdiği `NOTICE`/`WARNING`/`INFO`/`LOG`/`DEBUG` mesajı; geldiği ifadeyle birlikte Sonuç alanında gösterilir, Çalıştırma kaydına yazılmaz. _Avoid_: Log, uyarı (tek başına), mesaj.
  - **Sonuç alanı**: Konsol sekmesinde editörün altındaki, Sonuç sekmelerini, Log'u, Değişiklikler'i ve Bildirimler'i aynı şeritte taşıyan, boyutlandırılabilir ve daraltılabilir panel. _Avoid_: Alt panel, output.
  - **Durum çubuğu**: Uygulamanın en altında etkin sekmenin hedefini, transaction durumunu, son çalıştırmayı ve grid seçim özetini gösteren salt görüntü satırı. _Avoid_: Footer, alt bar.
  - **Arayüz tercihleri**: Gezgin görünürlüğü ve genişliği, editör/sonuç oranı, Sonuç alanının daraltılmışlığı ve temanın bağlantı ayarlarından ayrı dosyada saklanan değerleri. _Avoid_: Ayarlar (tek başına), config.
- **ADR**: Ctrl/Cmd+Enter'ın anlamının "tüm script"ten "Çalışacak aralık"a değişmesi kalıcı ve alışkanlık kıran bir karar; ilgili ticket `docs/adr/0006-calisacak-aralik.md` yazar (bağlam: DataGrip alışkanlığı ve ADR-0003'ün tek çalıştırıcı kuralı; sonuç: aralık bir script olarak gider, tüm script Alt'lı kısayolla).
- **Sıralama önerisi** (ticket'lara bölerken): önce token'lar + tema + sözdizimi renkleri (diğer her şey bunları kullanır), sonra ortak bileşenler, sonra yerleşim + Sonuç alanı + Durum çubuğu + Arayüz tercihleri, sonra Çalışacak aralık + editör eklentileri, sonra Sunucu bildirimleri, sonra grid ve kopyalama, en son palet/kısayol kataloğu ve prod sinyali. Çalışacak aralık ve Sunucu bildirimleri yerleşimden bağımsız da yapılabilir; yeni sekmeler yerleşim gelmeden geçici olarak mevcut log kolonunda gösterilebilir.
- Raporda ekran görüntülerinin bulunduğu dizin oturuma özel geçici bir dizindir; görsel karşılaştırma için yerleşim ticket'ı başlamadan "önce" görüntüleri yeniden alınmalıdır.
- Sürüm: bu dilim 0.5.0 olarak yayımlanır (Ctrl/Cmd+Enter davranış değişikliği README'de ve sürüm notunda belirtilir).
