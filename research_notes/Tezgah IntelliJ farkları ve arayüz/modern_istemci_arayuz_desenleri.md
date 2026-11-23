# Modern veritabanı istemcilerinin arayüz/UX desenleri (2024-2026)

Kapsam: TablePlus, Postico 2, Beekeeper Studio, DBeaver, DataGrip, Supabase Studio, Outerbase Studio, pgAdmin 4 ve geliştirici aracı tasarım sistemleri; hedef React + CodeMirror 6 tabanlı yerel bir PostgreSQL istemcisi (Tezgah).
Not: Bütçe yaklaşık 17 araç çağrısıyla sınırlıydı. Neon konsolu, Drizzle Studio, Arctype/Hex ve DBeaver'ın ayrıntıları için birincil kaynak bulunamadı (bkz. Gaps).

## Ürünler düzeni, yoğunluğu, ortam renklerini, grid'i, sonuçları ve klavyeyi nasıl ele alıyor?

### Takeaway
"Hafif" araçlar (Postico 2, TablePlus, Beekeeper, Supabase, Outerbase) birkaç ortak desen üzerinde birleşiyor: tek panelde tablo verisi + yan satır detay paneli (JSON/FK dahil), kuyruklanan (staged) değişiklikler ve commit öncesi SQL/diff önizlemesi, bağlantı bazında renk/etiket ve güvenlik seviyesi, "imleçteki sorguyu çalıştır" vurgusu. Tezgah'ın CLAUDE.md'deki planı (bekleyen değişiklikler + SQL önizlemesi, prod kırmızı kenarlık + salt okunur) bu sektör pratiğiyle birebir örtüşüyor.

### Cited Findings
**Postico 2 (macOS)**
- Sidebar'da tabloya tıklayınca veri hemen açılıyor; "Add rows, edit them, or filter them"; "foreign key picker" ve "row detail sidebar" düzenlemeyi kolaylaştıran özellikler olarak öne çıkarılıyor — [Postico 2](https://eggerapps.at/postico2/)
- Yapı editörü: "Columns, indexes and constraints are unified in a single editor, so you see everything at once"; yapı ham SQL (DDL) olarak da görüntülenebiliyor — [Postico 2](https://eggerapps.at/postico2/)
- SQL editörü: aynı dosyayı birden çok sekme/pencerede açma, otomatik kaydetme ("autosaves changes so you never lose your work"), SQL dosyalarını klasörlere koyma, Ctrl-F ile otomatik biçimlendirme — [Postico 2](https://eggerapps.at/postico2/)
- Tasarım felsefesi: "very strong focus on its core audience: people who use databases"; "servers are never more than two clicks away"; güncellemeler arka planda, bildirimsiz — [Postico 2](https://eggerapps.at/postico2/)
- Eski Postico sürümlerinde toplu kaydetme SQL önizlemesiyle birden çok satırı tek transaction'da commit ediyordu (sürüm belirtilmemiş kullanıcı yorumu) — [MacUpdate reviews](https://www.macupdate.com/app/mac/53411/postico/reviews); Postico 1.0.8, beklenen etkilenen satır sayısı tutmadığında yine de commit seçeneği sunuyordu — [Postico 1.0.8 changelist](https://eggerapps.at/postico/docs/v1.0.8/changelist.html)

**TablePlus**
- Bağlantı oluştururken renk seçiliyor (production vs staging ayrımı için önerilir) ve her bağlantıya zorunlu bir etiket atanıyor (Production dahil 5 etiket) — [TablePlus: manage connections](https://docs.tableplus.com/gui-tools/manage-connections)
- Safe Mode seviyeleri (bağlantı başına): Silent (varsayılan, uyarısız); Alert 1 (her sorgudan önce ifadeleri gösterip "Send" onayı); Alert 2 (SELECT/EXPLAIN/SHOW hariç onay); Safe 1 (sorgu öncesi veritabanı şifresi); Safe 2 (SELECT/EXPLAIN/SHOW hariç şifre). Araç çubuğundaki Safe Mode düğmesinin ikonu mevcut seviyeyi gösteriyor; yeni bağlantılar için varsayılan seviye ayarlanabiliyor — [TablePlus: Safe mode](https://tableplus.com/docs/gui-tools/code-review-and-safemode/safe-mode)
- WHERE'siz UPDATE/DELETE: Silent modda bile "No WHERE clause" sayfası açılıyor, ifadeler vurgulanıyor, **varsayılan düğme Cancel**; Run/Save ile yine de çalıştırılabiliyor; ayarlardan kapatılabiliyor — [TablePlus: Safe mode](https://tableplus.com/docs/gui-tools/code-review-and-safemode/safe-mode)
- Touch ID / Mac şifresiyle Safe Mode kilidini açma seçeneği — [TablePlus: Safe mode](https://tableplus.com/docs/gui-tools/code-review-and-safemode/safe-mode)
- Kullanıcı/blog algısı: TablePlus "one of the cleanest UIs in this category", "clean, fast, multi-database"; dezavantaj fiyat — [softwaremany 2026 karşılaştırma](https://softwaremany.pages.dev/blog/2026-02-04-database-gui-tools-comparison/), [Bytebase](https://www.bytebase.com/blog/top-postgres-gui-client/) (ikisi de ikincil/vendor-yakın)

**Beekeeper Studio**
- "Stage changes before applying" ve "Copy changes to SQL"; satırı "clean, structured JSON" olarak görme, FK'lar iç içe veri olarak gösteriliyor; tıklanabilir FK'lar; sekmeli arayüz; "Global quick search"; sonuçları JSON/CSV/SQL dışa aktarma ve Markdown kopyalama — [Beekeeper features](https://www.beekeeperstudio.io/features)
- Üç çalıştırma modu: hepsini çalıştır (varsayılan), yalnızca "current" sorgu ("Beekeeper highlights this query for you so you know what will run"), yalnızca seçim. Sonuçlar editörün hemen altında; geçmiş, editör araç çubuğundaki ikondan — [Beekeeper docs: SQL editor](https://docs.beekeeperstudio.io/user_guide/sql_editor/editor/)
- Birden çok sorgu çalıştırılıp her birinin sonucu ayrı alanda görülebiliyor; kısayollar: current sorgu Ctrl/Cmd+Shift+Enter, seçim Ctrl/Cmd+Enter (yalnızca pazarlama sayfası; doğrulanmalı) — [Beekeeper SQL editor feature page](https://beekeeperstudio.io/features/sql-editor)

**DataGrip (JetBrains)**
- 2024.3: sayfalama kontrolü araç çubuğundan veri editörünün alt-ortasına taşındı; editör içi sonuç grid'i artık editörün tam genişliğine yayılıyor — [What's New 2024.3](https://www.jetbrains.com/datagrip/whatsnew/2024-3/)
- 2025.2: JOIN içeren SELECT sonuçları düzenlenebilir; üretilen DML önizlenip gönderiliyor (benzersiz satır kimliği gerekir; UNION, self-join, hesaplanmış kolonlarda yok); grid heatmap (değere göre hücre renklendirme, iki renk şeması); kod seçince yüzen bağlamsal araç çubuğu — [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- 2025.3: "Islands" arayüz teması varsayılan (açık/koyu; yalnızca görsel yenileme); tüm kolonlardaki yerel filtreleri tek seferde temizleme aksiyonu — [What's New 2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/)
- Arama özeti, 2026.3'te sonuçların yeni bir "Database Output" araç penceresine taşındığını ve ayrı editör sekmelerinde açılabildiğini belirtiyor; birincil sayfada doğrulamadım — [DataGrip whatsnew](https://jetbrains.com/datagrip/whatsnew)

**Supabase Studio (web table editor)**
- JSON hücreleri "for a more spacious editing experience" yan panelde açılabiliyor; satır yan panel editörü var — [Supabase Studio 2.0 blog](https://supabase.com/blog/supabase-studio-2.0)
- Şubat 2026: Table Editor'de insert/edit/delete işlemleri kuyruklanıp diff görünümünde incelenip tek transaction'da cmd+s ile commit ediliyor (Feature Previews > Queue table operations) — [Supabase changelog: queue table operations](https://supabase.com/changelog/42460-queue-table-inserts-edits-and-deletes-on-the-table-editor.md)
- 2026'da Table Editor ve SQL Editor'e sekmeler geri geldi (şemalar arası tablolar / snippet'ler arasında listeye dönmeden geçiş) — [Supabase changelog (studio)](https://supabase.com/changelog?tags=studio)
- Ekim 2025: JSON kolonlarına varsayılan sıralama uygulanmıyor (performans) — [Dashboard Updates 220925-061025](https://supabase.com/changelog/39292-dashboard-updates-220925-061025)
- Table Editor bilinçli olarak tip alt kümesi destekliyor: "keeps the experience focused for people with less database experience"; tablo oluştururken RLS'i otomatik açıyor — [Supabase docs: tables](https://supabase.com/docs/guides/database/tables)

**Outerbase Studio (açık kaynak, tarayıcıda, AGPL-3.0)**
- Otomatik tamamlama + fonksiyon ipucu tooltip'leri; birden çok sorguyu birlikte çalıştırıp sonuçlarını görme; "stage all your changes and preview them before committing"; binlerce satır/kolonu verimli render eden tablo; SQL yazmadan kolon ekle/değiştir şema editörü; masaüstü sürümü web sürümünün ince Electron sarmalayıcısı — [Outerbase Studio README](https://raw.githubusercontent.com/outerbase/studio/develop/README.md)
- Aralık 2024'te LibSQL Studio'nun devralınmasıyla duyuruldu; MySQL/PostgreSQL/SQLite — [Outerbase blog](https://outerbase.com/blog/outerbase-studio-open-source-database-management/); bir üçüncü taraf yorumu "clean, fast, and open" ama "lacking many features" — [DEV Community](https://dev.to/burcs/the-best-db-browser-for-sqlite-2pj4)

**pgAdmin 4 / DBeaver (eleştiri tarafı)**
- r/PostgreSQL (Nisan 2025) başlığında OP pgAdmin'i "a bit clunky", özellikle veritabanı değiştirirken UI'ı yavaş buluyor; yanıtlar bölünmüş (TablePlus/Postico önerenler, "awful" diyenler, "her şeyi yapabildiği için en iyisi" diyen savunanlar), DBeaver yaygın yedek öneri — [Reddit mirror](https://redlib.hbubli.cc/r/PostgreSQL/comments/1kbijgx/which_db_management_tool_you_are_using_pgadmin)
- Bloglar pgAdmin'i "functional but dated", basit işler için "too many clicks" olarak tanımlıyor; DBeaver'ın Eclipse tarzı arayüzü "cluttered and dated" bulunuyor, ama bir başka blog DBeaver CE'yi pgAdmin'den daha cilalı buluyor — [Bytebase: top pgAdmin alternative](https://bytebase.com/blog/top-pgadmin-alternative), [softwaremany 2026](https://softwaremany.pages.dev/blog/2026-02-04-database-gui-tools-comparison/) (vendor-yakın kaynaklar; çelişkili)

### Inferences
- "Bekleyen değişiklikler → diff/SQL önizleme → tek transaction commit (Cmd/Ctrl+S)" artık sektör standardı (Postico, Beekeeper, Outerbase, Supabase 2026, DataGrip). Tezgah bunu Supabase'in kısayoluyla (Ctrl/Cmd+S) ve hücre/satır bazında renk kodlamasıyla (ekleme yeşil, düzenleme sarı/turuncu, silme üstü çizili kırmızı) sunabilir; renk kodlaması belirli kaynaklarla doğrulanmadı ama yaygın bir gelenek.
- TablePlus'ın "WHERE'siz UPDATE/DELETE uyarısı, varsayılan düğme Cancel" deseni Tezgah'ın "prod'da yazma modu tek tıkla, ayrıca onay yok" kuralıyla çelişmez: bu, prod'dan bağımsız bir statik analiz uyarısı olarak eklenebilir (kural değişikliği gerektirip gerektirmediği kullanıcıya sorulmalı).
- Safe mode seviyesini araç çubuğunda ikonla göstermek, Tezgah'taki prod salt okunur/yazma durumunu her an görünür kılmanın iyi bir modeli.
- Beekeeper'ın "çalışacak current sorguyu vurgula" deseni CodeMirror 6'da bir dekorasyon (line/mark decoration) ile kolayca uygulanabilir; Tezgah'ın mevcut ifade bölücü modülü bu sınırları zaten üretiyor olmalı.
- Satır detay yan paneli (Postico, Supabase, Beekeeper JSON görünümü) dar ekranda geniş tabloları okunabilir yapmanın ortak çözümü; JSON/jsonb hücreleri grid içinde kısaltılıp panelde CodeMirror JSON modunda açılabilir.

### Gaps
- Neon konsolu, Drizzle Studio, Arctype ve Hex SQL editörü için birincil kaynak taranamadı (arama bütçesi).
- NULL gösterimi (ör. soluk italik "NULL" vs boş string ayrımı), tip-duyarlı hücreler (boolean checkbox, tarih seçici) ve hata satırı vurgulama için hiçbir ürünün resmi dokümanında açık ifade bulunamadı.
- TablePlus'ın "Open anything" (Cmd+P) ve code review iş akışı sayfası çekilemedi (llms-full.txt 404).
- DBeaver'ın 2024-2026 arayüz değişiklikleri (yeni tema vb.) aranmadı.
- Postico 2'de bekleyen değişikliklerin güncel görsel tasarımı belgelenmemiş.

## Kullanıcılar neyi övüyor, neyi eleştiriyor?

### Takeaway
Övgü tutarlı biçimde "temiz, hızlı, az tıklama" araçlara (TablePlus, Postico) gidiyor; eleştiri yavaşlık, kalabalık Eclipse tarzı arayüz ve fazla tıklama (pgAdmin, kısmen DBeaver) üzerine. Kanıtlar çoğunlukla vendor-yakın bloglar ve tek bir Reddit başlığı; yönlendirici kabul edilmeli.

### Cited Findings
- pgAdmin: "clunky", veritabanı değiştirirken yavaş UI; karşı görüş: her şeyi yapabiliyor — [Reddit mirror, r/PostgreSQL 2025](https://redlib.hbubli.cc/r/PostgreSQL/comments/1kbijgx/which_db_management_tool_you_are_using_pgadmin)
- pgAdmin "too many clicks"; DBeaver "cluttered and dated" — [Bytebase](https://bytebase.com/blog/top-pgadmin-alternative); çelişen görüş: DBeaver CE pgAdmin'den cilalı — [softwaremany 2026](https://softwaremany.pages.dev/blog/2026-02-04-database-gui-tools-comparison/)
- TablePlus bazı kullanıcılar için "old-fashioned design with all function buttons on the UI" tercih edenlere karşı konumlanıyor (TablePlus'ın kendi 2018 karşılaştırması; eski ve taraflı) — [TablePlus blog](https://tableplus.com/blog/2018/10/dbeaver-postico-vs-tableplus.html)
- Postico: Mac-only ve yalnız Postgres olması sınırlayıcı bulunuyor — [softwaremany 2026](https://softwaremany.pages.dev/blog/2026-02-04-database-gui-tools-comparison/)
- Outerbase Studio: temiz/hızlı ama eksik özellik — [DEV Community](https://dev.to/burcs/the-best-db-browser-for-sqlite-2pj4)
- Supabase kullanıcı geri bildirimiyle sekmeleri geri getirdi (sekmesiz gezinmenin bedeli) — [Supabase changelog](https://supabase.com/changelog?tags=studio)

### Inferences
- Tezgah için en önemli "kolaylık" metriği: bir tabloya/sorguya ulaşma tık sayısı ve geçiş hızı (Postico: "two clicks away"). Veritabanı değiştirmenin yavaş olması pgAdmin'in en çok anılan kusuru; Tezgah'ın bağlantı havuzu/şema önbelleği bunu hedeflemeli.
- Sekmeler beklenen bir öğe: Supabase'in geri dönüşü bunu doğruluyor.

### Gaps
- Hacker News başlıkları aramada çıkmadı; doğrudan HN kanıtı yok.
- Kullanıcı yorumlarında tipografi/renk gibi görsel özelliklere dair somut alıntı bulunamadı.

## Geliştirici araçları için genel tasarım sistemi rehberi

### Takeaway
Az sayıda girdiden (taban renk, vurgu, kontrast) türetilen, algısal olarak düzgün (LCH/OKLCH) renk token'ları ve rolü sabit 12 adımlı ölçekler (Radix) modern dev-tool arayüzlerinin temeli; koyu tema açık temanın tersi değil, ayrı ölçek olarak tasarlanmalı. Inter (başlıklar için Inter Display) yaygın bir seçim.

### Cited Findings
- Linear yeniden tasarımı: tema üretimi HSL yerine LCH'ye taşındı (eşit lightness'taki renkler eşit açık algılanır); tema başına ~98 değişken yerine 3 girdi: base, accent, contrast; contrast değişkeni erişilebilirlik için çok yüksek kontrastlı tema üretebiliyor; yüzey yükseltisi (arka plan, panel, dialog, modal) de LCH ile hesaplanıyor; chroma sınırlanarak palet nötr tutuluyor — [Linear: How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Linear: başlıklarda Inter Display, gövdede Inter; açık temada metin/nötr ikonlar koyulaştırıldı, koyu temada açıldı; hiyerarşi önce yalnızca siyah/beyaz opaklıklarıyla kuruldu, renk sonra eklendi; sidebar/sekme etiket-ikon-düğmeleri dikey ve yatay hizalandı; tarayıcıda da çalıştığı için geri/ileri ve sekmeler kaldırılabilir tasarlandı — [Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Radix Colors: açık ve koyu için ayrı 12 adımlı ölçekler + alpha varyantları, display-p3 desteği (v3) — [Radix Colors](https://docsearch.algolia.com/mcp/docs/repo/radix-ui/colors); adım rolleri: 1 uygulama arka planı, 2 hafif arka plan, 9 solid renk, 11-12 düşük/yüksek kontrast metin — [Radix Themes: color](https://www.radix-ui.com/themes/docs/theme/color)
- Supabase kendi tasarım sistemi renk kullanım rehberini yayınlıyor (Radix tabanlı token'lar) — [Supabase design system: color usage](https://supabase.com/design-system/docs/color-usage)
- Bir topluluk kaynağı Radix'in 11-12. adımlarının aynı ölçeğin 2. adımı üzerinde güçlü APCA kontrastı sağladığını söylüyor (ikincil kaynak) — [bysixteen field notes](https://bysixteen.github.io/field-notes/design-system/model/color-scale)
- Koyu temada açık temayı ters çevirmek "almost always fails" — [Mantlr](https://mantlr.com/blog/color-systems-that-scale) (aynı yazı Radix'i yanlışlıkla WorkOS'a bağlıyor; güvenilirliği düşük)
- DataGrip 2025.3 "Islands" teması: işlevsellik aynı, yalnızca görsel yenileme; JetBrains bile yoğun IDE görünümünü yumuşatmaya gidiyor — [DataGrip 2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/)

### Inferences
- Tezgah için somut öneri: `:root` üzerinde CSS değişkenleriyle 12 adımlı nötr (gray/slate) + vurgu + "danger" (prod) ölçekleri; `prefers-color-scheme` ile ayrı koyu ölçek. Prod kırmızısını vurgu renginden bağımsız bir semantik token (`--env-prod`) olarak tutmak, tema değişse de güvenlik sinyalini korur.
- Ortam rengi için yalnızca kenarlık değil, sekme/başlık şeridi ve araç çubuğu rozeti gibi ikinci bir kanal (metin etiketi "PROD") renk körlüğüne karşı faydalı.
- UI fontu Inter veya sistem fontu, veri/grid ve editör için monospace (JetBrains Mono gibi) kullanımı yaygın pratik; bunun için bu araştırmada birincil kaynak toplanmadı.

### Gaps
- Spacing ölçeği (4px tabanlı vb.), tip ölçeği, odak (focus ring) stilleri, ikon setleri (Lucide, Codicons) ve GitHub Primer/Vercel Geist rehberleri için kaynak çekilemedi.
- Linear'ın Radix kullandığına dair kanıt yok.

## Grid kütüphaneleri ve ödünleşimler

### Takeaway
Büyük sonuç kümeleri için seçenekler: canvas tabanlı Glide Data Grid (MIT, milyonlarca satır, ama özel hücreler canvas ile çizilir, sıralama/filtre yok, erişilebilirlik zayıf olabilir), AG Grid (her şey dahili ama ağır; bazı özellikler ücretli), TanStack Table (headless; render ve sanallaştırmayı kendiniz yaparsınız, TanStack Virtual ile). Hiçbir kaynak üçünü doğrudan karşılaştıran bağımsız benchmark sunmuyor.

### Cited Findings
- Glide Data Grid: canvas tabanlı; ekip DOM sanallaştırmadan vazgeçti ("Once you need to load/unload hundreds of DOM elements per frame nothing can save you"); milyonlarca satır, hızlı güncelleme, native scroll, hücreler talep üzerine tembel render; hücre tipleri: number, text, markdown, bubble, image, drilldown, URI; düzenleme dahili; kolon boyutlandırma/taşıma, değişken satır yüksekliği, birleşik hücre, satır/hücre/kolon seçimi, dondurulmuş kolonlar, arama; MIT; React 16-19 — [glide-data-grid GitHub](https://github.com/glideapps/glide-data-grid)
- Glide sınırlamaları: özel render'lar Canvas ile yazılmalı; sıralama/filtre veri kaynağında yapılmalı; README "first class accessibility" derken FAQ ana geliştiricilerin erişilebilirlik araçlarını kullanmadığını kabul ediyor; ~5.4k yıldız, 94 açık issue, 47 açık PR (bakım hızı belirsiz) — [glide-data-grid GitHub](https://github.com/glideapps/glide-data-grid)
- TanStack Table headless: render ve sanallaştırma ayrı, "bring your own virtualizer"; performansı üzerine kurulan sanallaştırma katmanına bağlı — [rv-grid karşılaştırma](https://rv-grid.com/compare/ag-grid-alternatives), [1771technologies benchmark](https://1771technologies.com/blog/performance-benchmarks), [thedatagrid.com 2025](https://thedatagrid.com/blog/ag-grid-vs-infinite-table-vs-mui-datagrid-vs-tanstack-2025)
- AG Grid: dahili sanallaştırma, olgun satır/kolon modelleri, ama daha ağır ve kurulumu karmaşık; Community ücretsiz, bazı gelişmiş özellikler ücretli — [rv-grid 2026](https://rv-grid.com/blog/best-js-datagrid-in-2026), [coreui](https://coreui.io/compare/ag-grid-alternative/) (vendor kaynaklar)
- Supabase Studio ve Outerbase gibi web istemcileri binlerce satırı verimli render ettiklerini söylüyor ama README hangi grid kütüphanesini kullandığını belirtmiyor — [Outerbase README](https://raw.githubusercontent.com/outerbase/studio/develop/README.md)

### Inferences
- Tezgah sonuçları zaten sayfalı (tahmini satır sayısı + sayfa) olduğundan, sayfa başına birkaç bin satır için TanStack Table + TanStack Virtual (DOM) yeterli ve CSS token'larıyla tam tema/odak kontrolü verir; milyonlarca satır gerekmedikçe canvas'a geçmenin erişilebilirlik ve özelleştirme maliyeti gereksiz.
- Glide, metin seçme/kopyalama ve tema tutarlılığı (canvas CSS değişkenlerini doğrudan okumaz) açısından ek iş gerektirir; AG Grid'in ağırlığı localhost tek kullanıcılı bir araçta paket boyutu dışında kritik değil ama lisans katmanları takip yükü getirir.

### Gaps
- Glide'ın son sürüm tarihi ve bakım durumu doğrulanamadı.
- Bağımsız, üç kütüphaneyi kapsayan güncel benchmark bulunamadı; mevcut karşılaştırmaların çoğu rakip grid satıcılarına ait.
