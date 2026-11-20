# Tezgah özellik envanteri (0.4.2, main @ 4dd5846)

Kaynaklar repodaki dosyalardır; yollar repo köküne görelidir (`path:satır`). Web araştırması yapılmadı.

## 1. Alan alan bugün ne var?

### Takeaway
Dört dilim tamamlanmış: bağlantı yönetimi + script çalıştırma (1. dilim), sekmeli konsol, Okuma modu, sonuç grid'i, sorgu geçmişi, tablo sekmesi, düzenlenebilir grid, kolon ekleme, bekletme göstergesi (2. dilim), kendi bağlam bilen tamamlama motoru (3. dilim), gezgin sağ tık menüleri ve grid tümünü seç (0.4.2). Gezgin ağacı yalnızca ilişkileri (tablo/view/matview/partitioned/foreign) gösterir; fonksiyon, sequence, index düğümü yok. Biçimlendirme, EXPLAIN görselleştirme, dışa aktarma (CSV vb.), editörde ara/değiştir ve "seçili/imleçteki ifadeyi çalıştır" yok.

### Cited Findings

**Genel / çalışma şekli**
- `npx tezgah-db` ile başlar, `--port`, `--no-open` seçenekleri; Node 22+ gerekir; yalnızca `127.0.0.1`'de dinler, açılışta rastgele erişim anahtarı ve `?t=<anahtar>` URL'i — [README.md:3-13](README.md)
- Yerel güvenlik: URL token → `HttpOnly; SameSite=Strict` cookie, `Host` doğrulaması (DNS rebinding), durum değiştiren isteklerde `Origin` kontrolü, CORS başlığı yok — [docs/adr/0001-yerel-erisim-anahtari.md:3](docs/adr/0001-yerel-erisim-anahtari.md)
- Bağımlılıklar: `pg`, `@napi-rs/keyring` (keychain), `fast-xml-parser` (dataSources.xml), `ws` (WebSocket); arayüz React 19, CodeMirror 6 (`@codemirror/autocomplete`, `lang-sql`, `commands`), `@tanstack/react-virtual` (grid sanallaştırma), `ssh2` — [package.json](package.json). `@codemirror/search` ve `@codemirror/lint` bağımlılıkta yok — [package.json](package.json)
- Kodda hiç TODO/FIXME/XXX/HACK yorumu yok (`grep -rn 'TODO|FIXME|XXX|HACK' src scripts` boş döndü).

**Bağlantı yönetimi**
- Ortam etiketleri sabit kümeden: `local`, `dev`, `test`, `staging`, `prod`; her birine varsayılan renk, kullanıcı değiştirebilir; özel davranışı yalnızca `prod` tetikler — [src/core/baglanti.ts:5-9](src/core/baglanti.ts), [src/core/baglanti.ts:305](src/core/baglanti.ts), [GLOSSARY.md:19-21](GLOSSARY.md)
- Bağlantı alanları: ad, klasör, host, port, kullanıcı, başlangıç veritabanı, SSL (`sslmode`, CA/sertifika/anahtar yolları), ortam etiketi/renk, keychain'e kaydetme seçimi, `ssh` (host, port, user, `auth: password|key|agent`), Veritabanı seçimi — [.scratch/ilk-dilim/spec.md:250](.scratch/ilk-dilim/spec.md)
- Bağlantı sağ tık menüsü: Yeni konsol, Hedef yap, Düzenle, Kopyala, Klasöre taşı ▸ (Klasörsüz dahil), "URL'yi kopyala (şifresiz)", Bağlantıyı kes, Sil — [src/web/App.tsx:613-644](src/web/App.tsx)
- Klasör menüsü: Yeniden adlandır, Sil — [src/web/App.tsx:674-675](src/web/App.tsx). Üst menü: Yeni bağlantı, Yeni klasör, İçe aktar, Çalıştırma kayıtları klasörünü aç — [src/web/App.tsx:471-474](src/web/App.tsx)
- Bağlantı testi: kaydetmeden ulaşılabilirlik, giriş ve veritabanı listeleme adım adım sınanır — [GLOSSARY.md:27-29](GLOSSARY.md); ağaçta bağlantı durumu rozeti (bağlanıyor/bağlı/bağlanamadı) ve "Yenile" (veritabanlarını yeniden listele) — [src/web/gezgin/GezginAgaci.tsx:70-73](src/web/gezgin/GezginAgaci.tsx), [src/web/gezgin/GezginAgaci.tsx:419](src/web/gezgin/GezginAgaci.tsx)
- Şifreler: keychain (macOS Keychain / Windows Credential Manager, `@napi-rs/keyring`) ya da Oturumluk şifre (yalnızca süreç belleğinde; `28P01`'de unutulup yeniden sorulur) — [GLOSSARY.md:31-33](GLOSSARY.md), [src/server/keychain.ts](src/server/keychain.ts)
- Veritabanı seçimi: `pg_database` veritabanlarından görünür kılınanlar ve her birinde görünür şemalar; `pg_catalog`, `information_schema`, `pg_toast` varsayılan gizli; ağaçta göz düğmesiyle "Görünür yap / Görünürlükten çıkar", ayrı "Gizli veritabanları" listesi — [src/core/veritabani-secimi.ts:9](src/core/veritabani-secimi.ts), [src/web/gezgin/GezginAgaci.tsx:476-477](src/web/gezgin/GezginAgaci.tsx), [src/web/gezgin/GezginAgaci.tsx:689](src/web/gezgin/GezginAgaci.tsx)
- Cmd/Ctrl+K Hızlı geçiş paleti: gruplar "Hedefler", "Tablolar", "Gizli veritabanları", "Komutlar"; `postgres://` URL yapıştırınca "Bu sunucuya giden mevcut bağlantı" ve "URL'den yeni bağlantı…" — [src/web/hizli-gecis/HizliGecis.tsx:124-146](src/web/hizli-gecis/HizliGecis.tsx)
- SSH tüneli: bağlantı başına bir tünel, password/key/agent kimlik doğrulaması, Windows'ta OpenSSH agent pipe'ı, host anahtarı doğrulaması (bilinmiyor/uyuşmazlık akışı) — [src/core/ssh-tuneli.ts:9-18](src/core/ssh-tuneli.ts), [src/core/ssh-tuneli.ts:200](src/core/ssh-tuneli.ts), [src/web/baglantilar/HostAnahtariKutusu.tsx](src/web/baglantilar/HostAnahtariKutusu.tsx). ProxyJump yok ("İleride ProxyJump için `jumps[]` eklenebilir") — [src/core/baglanti.ts:71](src/core/baglanti.ts)
- İçe aktarma: IntelliJ `dataSources.xml` ve `.pgpass`; aynı sunucuya giden kaynaklar tek adayda birleşir, önizlemede seçilir, toplu bağlantı testi var; IntelliJ şifreleri okunmaz, ProxyJump'lı tünel eşlenmez ("ProxyJump desteklenmiyor") — [GLOSSARY.md:35-37](GLOSSARY.md), [src/core/ice-aktarma/datasources.ts:226-241](src/core/ice-aktarma/datasources.ts), [src/core/ice-aktarma/toplu-baglanti-testi.ts](src/core/ice-aktarma/toplu-baglanti-testi.ts)
- Her hedefte en fazla 5 açık oturum (`MAX_SESSIONS = 5`); aşan çalıştırma beklemeden reddedilir — [src/server/havuzlar.ts:26](src/server/havuzlar.ts), [GLOSSARY.md:91-93](GLOSSARY.md)

**Script çalıştırma**
- Çalıştırma modu içerikten çıkar: Transaction (tek transaction, sonda Commit/Rollback), Autocommit (yalnızca transaction dışı komutlar), Okuma (`BEGIN READ ONLY`, karar sorulmaz); karışık script çalıştırılamaz — [GLOSSARY.md:67-69](GLOSSARY.md), [src/core/calistirma-modu.ts:48](src/core/calistirma-modu.ts)
- Transaction dışı komut tanıma: `VACUUM`, `CREATE/DROP INDEX CONCURRENTLY`, `CREATE/DROP DATABASE|TABLESPACE|SUBSCRIPTION`, `COMMIT/ROLLBACK PREPARED`, `ALTER SYSTEM`, `ALTER TABLE … DETACH PARTITION … CONCURRENTLY`, `ALTER DATABASE … SET TABLESPACE`, `REINDEX SCHEMA|DATABASE|SYSTEM|CONCURRENTLY`, tablo adsız `CLUSTER` — [src/core/calistirma-modu.ts:162-196](src/core/calistirma-modu.ts)
- Okuma ifadesi: `SELECT`/`TABLE`/`VALUES` (`INTO` ve `FOR UPDATE/SHARE` hariç), `SHOW`, ANALYZE'sız `EXPLAIN`, DML'siz `WITH` — [src/core/calistirma-modu.ts:132-160](src/core/calistirma-modu.ts); yanılırsa `25006` ve "Transaction modunda çalıştır" düğmesi — [README.md:23-25](README.md), [src/web/script/ScriptEkrani.tsx:542-544](src/web/script/ScriptEkrani.tsx)
- Araç çubuğu: ▶ Çalıştır (Ctrl/Cmd+Enter), ⟲ Dene (Ctrl/Cmd+Shift+Enter), ■ İptal, Yazma kilidi rozeti, Çalıştırma modu rozeti, "Katalogu yenile" — [src/web/script/ScriptEkrani.tsx:294-370](src/web/script/ScriptEkrani.tsx), [src/core/kisayollar.ts:30-36](src/core/kisayollar.ts)
- Karar kartı: "Çalışıyor… n/N ifade", Commit, Rollback, Uzat — [src/web/script/KararKarti.tsx:45-78](src/web/script/KararKarti.tsx). Karar süresi prod'da 5 dk, diğerlerinde 30 dk; son 1 dk geri sayım; dolunca rollback; yedek olarak `SET LOCAL idle_in_transaction_session_timeout` — [src/core/karar-suresi.ts:12-16](src/core/karar-suresi.ts), [src/server/script-calistirici.ts:443](src/server/script-calistirici.ts)
- Hatada durulur, hatalı ifade işaretlenir: editörde ifade durum oluğu (sırada/çalışıyor/hatalı/başarılı), hata süslemeleri, satıra gitme (`goToLine`) — [src/web/script/ScriptEditoru.tsx:99-124](src/web/script/ScriptEditoru.tsx), [src/web/script/ScriptEditoru.tsx:180-187](src/web/script/ScriptEditoru.tsx), [src/core/hata-konumu.ts](src/core/hata-konumu.ts)
- Kopmada rollback (WebSocket'e bağlı transaction); Autocommit'te kopmada `pg_cancel_backend` ve kalan ifadeler çalışmaz — [docs/adr/0002-kopmada-rollback.md](docs/adr/0002-kopmada-rollback.md), [src/server/script-calistirici.ts:699](src/server/script-calistirici.ts)
- prod salt okunurluğu: `default_transaction_read_only=on` + `BEGIN READ ONLY`; 🔒/🔓 tek tıkla; kilit sekme+hedef başına, yeniden açılışta kapanır; ayrıca onay yok; "kaza önleyici, güvenlik sınırı değil" — [README.md:15-19](README.md), [GLOSSARY.md:83-85](GLOSSARY.md)
- Deneme modu: Transaction modunda çalışır, sonunda her zaman rollback; prod'da yazma kapalıyken de kullanılabilir; prod'da `SET LOCAL lock_timeout = '3s'` — [GLOSSARY.md:71-73](GLOSSARY.md), [src/core/deneme.ts:18-22](src/core/deneme.ts). Deneme farkı: PG18+ ve PK'lı tabloda satırların önce/sonra görünümü + DDL şema farkı; aksi hâlde `RETURNING *` ile Yedek önizleme — [GLOSSARY.md:75-81](GLOSSARY.md)
- Çalıştırma kaydı: her çalıştırma (hatalı/iptal/deneme dahil) `history/YYYY-MM.jsonl`'e; satır verisi yazılmaz; sırlar maskelenmez; POSIX'te `0600`; otomatik silinmez — [README.md:35-39](README.md)
- Bekletme göstergesi: `pg_stat_activity` + `pg_blocking_pids` ile "N oturumu bekletiyorsun", 5 sn aralıkla — [src/core/bekletme.ts:6-17](src/core/bekletme.ts), [.scratch/ikinci-dilim/spec.md](.scratch/ikinci-dilim/spec.md) (Bilinen riskler)

**SQL konsolu (sekmeler, geçmiş, editör)**
- Konsol = sekmelere bölünmüş Script editörü; ayrı autocommit konsol modeli bilinçli reddedildi — [docs/adr/0003-konsol-sekmeli-script-editoru.md](docs/adr/0003-konsol-sekmeli-script-editoru.md)
- Sekme şeridi: "Yeni sekme", "Sekmeyi kapat ×"; sekme metni ve hedefi `konsol/sekmeler.json`'a yazılır, açılışta geri gelir ama bağlanmaz; kilit ve sonuçlar yazılmaz — [src/web/konsol/Konsol.tsx:109-154](src/web/konsol/Konsol.tsx), [README.md:31-33](README.md)
- Sorgu geçmişi paneli: Ctrl/Cmd+Alt+E; hedef filtresi, "Script'te ara", sonuç türü filtresi, başlangıç/bitiş tarihi; çift tık/Enter ile kaydı yeni sekmede kaydın hedefiyle açar — [src/web/gecmis/GecmisPaneli.tsx:107-194](src/web/gecmis/GecmisPaneli.tsx), [src/web/App.tsx:164](src/web/App.tsx), [GLOSSARY.md:107-109](GLOSSARY.md)
- Editör eklentileri yalnızca: durum oluğu, satır numaraları, undo history, tamamlama, `defaultKeymap`+`historyKeymap`, sözdizimi renklendirme, satır kaydırma — [src/web/script/ScriptEditoru.tsx:113-124](src/web/script/ScriptEditoru.tsx). Ara/değiştir, çoklu imleç eklentisi, lint, katlama, biçimlendirme yok (bkz. `@codemirror/search` yok — [package.json](package.json)).
- Kendi tamamlama motoru (ADR-0005): bağlama göre ilişki/kolon (takma ad, CTE, alt sorgu, ilişkili alt sorgu, belirsiz kolonda ilişki adı), FK'den JOIN koşulu önerileri, fonksiyonlar (pg_proc; ifade/FROM/CALL yuvaları, imza ve açıklama), tip ve DDL yuvaları, bağlama göre anahtar kelimeler, büyük katalogda dizin önbelleği ve süre bütçesi — [docs/adr/0005-kendi-tamamlama-motoru.md](docs/adr/0005-kendi-tamamlama-motoru.md), [src/core/tamamlama/ureticiler/](src/core/tamamlama/ureticiler/index.ts), [.scratch/ucuncu-dilim/issues/](.scratch/ucuncu-dilim/spec.md) (01–07 hepsi done)
- Katalog önbelleği: tablo/view/kolon (tip, PK, `reltuples`), FK, fonksiyon, tip adları; yalnızca kullanıcı eylemiyle dolar; DDL'li script sonrası ya da elle yenilenir — [GLOSSARY.md:53-55](GLOSSARY.md), [src/server/katalog.ts:16-62](src/server/katalog.ts)
- EXPLAIN: yalnızca Okuma ifadesi olarak sınıflanır; plan görselleştirme yok (araştırmada "3.1 EXPLAIN / EXPLAIN ANALYZE plan görselleştirme — M" öneri olarak duruyor) — [src/core/calistirma-modu.ts:137-138](src/core/calistirma-modu.ts), [.scratch/oneriler/arastirma.md:128](.scratch/oneriler/arastirma.md)

**Gezgin ağacı (şema gezgini)**
- Hiyerarşi: klasör › bağlantı › veritabanı › şema › tablo; tek arama kutusu (yalnızca yüklenmiş düğümlerde, alt dize, eşleşen yolları açar) — [src/core/gezgin.ts:1-50](src/core/gezgin.ts), [src/web/gezgin/GezginAgaci.tsx:314-318](src/web/gezgin/GezginAgaci.tsx)
- Şema altında tek liste: katalogdaki ilişkiler, hepsi aynı ▦ ikonuyla, yanında `reltuples` kısa sayısı (`≈484`, `≈12k`, `≈2,3M`; `-1` boş) — [src/web/gezgin/GezginAgaci.tsx:498-532](src/web/gezgin/GezginAgaci.tsx), [src/core/gezgin.ts:55-62](src/core/gezgin.ts). Okunan relkind'ler `r, v, m, p, f` (tablo, view, materialized view, partitioned, foreign) — [src/core/katalog.ts:10](src/core/katalog.ts)
- Fonksiyonlar (`prokind f,p,a,w`) katalogda okunur ama yalnızca tamamlamada kullanılır; ağaçta fonksiyon, sequence, index, trigger, tip düğümü yok — [src/core/katalog.ts:38](src/core/katalog.ts), [src/web/gezgin/GezginAgaci.tsx:498-532](src/web/gezgin/GezginAgaci.tsx)
- Veritabanı sağ tık: Yeni konsol, Hedef yap, Adı kopyala; tablo sağ tık: Aç, Yeni konsolda SELECT (`SELECT * FROM …;`), Adı kopyala — [src/web/App.tsx:657-668](src/web/App.tsx). Ctrl/Cmd+B gezgini gizler/açar — [src/core/kisayollar.ts:49-52](src/core/kisayollar.ts)

**Sonuç grid'i (konsol)**
- Satır döndüren her ifade için Sonuç sekmesi; ilk sayfa 500, transaction açıkken kaydırdıkça 500'er; en fazla 100.000 ("Sınıra ulaşıldı, filtrele"); hücrede en fazla 1000 karakter basılır; salt okunur — [src/core/grid/sabitler.ts:4-11](src/core/grid/sabitler.ts), [GLOSSARY.md:95-101](GLOSSARY.md)
- Hücre/aralık seçimi, Ctrl/Cmd+C başlıksız TSV kopyalama, F2 tam değer, "INSERT olarak kopyala" sağ tık, NULL boş metinden ayrı — [GLOSSARY.md:99-101](GLOSSARY.md), [src/web/grid/SonucGridi.tsx:334-339](src/web/grid/SonucGridi.tsx), [src/web/grid/SonucGridi.tsx:509](src/web/grid/SonucGridi.tsx), [src/core/grid/tsv.ts:5](src/core/grid/tsv.ts)
- 0.4.2: köşedeki `#` tümünü seçip kopyalar, satır numarası satırı seçer, Ctrl/Cmd+A tümünü seçer — git `4f9159d`, [src/web/grid/SonucGridi.tsx:558](src/web/grid/SonucGridi.tsx)
- Satır görünümü (Shift+Enter aç/kapat, Esc kapat) — [src/core/kisayollar.ts:38-47](src/core/kisayollar.ts), [src/web/grid/SatirGorunumu.tsx:41-59](src/web/grid/SatirGorunumu.tsx)
- Kolon genişliği ilk sayfadan ölçülür (48–400 px) — [src/core/grid/sabitler.ts:10-11](src/core/grid/sabitler.ts)

**Tablo sekmesi + düzenlenebilir grid + kolon ekleme**
- Her sayfa ayrı kısa `BEGIN READ ONLY` sorgusu; PK'lı tabloda varsayılan sıralamada keyset, aksi hâlde `OFFSET` ("sayfalar arası tutarlılık garanti değil") — [README.md:27-29](README.md), [src/core/tablo-sayfasi.ts:92](src/core/tablo-sayfasi.ts), [src/core/tablo-sayfasi.ts:267](src/core/tablo-sayfasi.ts)
- WHERE ve ORDER BY CodeMirror kutuları (tamamlamada örtük FROM o tablo), filtre hata konumu, başlığa tıklayınca sıralama döngüsü — [src/core/tablo-sayfasi.ts:69](src/core/tablo-sayfasi.ts), [src/core/tablo-sayfasi.ts:128-170](src/core/tablo-sayfasi.ts), [src/web/tablo/FiltreKutusu.tsx](src/web/tablo/FiltreKutusu.tsx), [GLOSSARY.md:57-59](GLOSSARY.md)
- Sayaç: `pg_class.reltuples` tahmini · yüklü satırlar — [src/web/tablo/TabloSekmesi.tsx:623](src/web/tablo/TabloSekmesi.tsx), [src/core/tablo-sayfasi.ts:223](src/core/tablo-sayfasi.ts)
- Düzenleme (PK'lı tablo): hücreye yazarak/F2 ile düzenleme, Tab ile sonraki hücre, NULL yap, + Satır (dokunulmayanlar DEFAULT), Satırları sil / Silmeyi geri al, TSV yapıştırma — [src/web/grid/SonucGridi.tsx:504-507](src/web/grid/SonucGridi.tsx), [src/web/tablo/TabloSekmesi.tsx:649-650](src/web/tablo/TabloSekmesi.tsx), [.scratch/ikinci-dilim-uygulama/issues/12-satir-ekle-sil-null-yapistir.md](.scratch/ikinci-dilim-uygulama/issues/12-satir-ekle-sil-null-yapistir.md)
- Bekleyen değişiklikler çekmecesi + SQL önizlemesi; düğmeler ↶ Geri al, Konsola aktar, ⟲ Dene, Uygula; kısayollar Ctrl/Cmd+Enter Uygula, +Shift Dene, +Alt SQL çekmecesi; Uygula Transaction modunda script olarak çalışır — [src/web/tablo/TabloSekmesi.tsx:538-567](src/web/tablo/TabloSekmesi.tsx), [src/web/tablo/TabloSekmesi.tsx:767-806](src/web/tablo/TabloSekmesi.tsx), [src/core/kisayollar.ts:18-28](src/core/kisayollar.ts), [GLOSSARY.md:49-51](GLOSSARY.md)
- + Kolon: ad, tip (yaygın tipler + kullanıcı tipleri önerisi), varsayılan ifade, uyarılar (oynak varsayılan fonksiyon + dolu tablo vb.), ALTER önizlemesi — [src/web/tablo/KolonFormu.tsx:76-127](src/web/tablo/KolonFormu.tsx), [src/core/kolon-ekle.ts:46-142](src/core/kolon-ekle.ts), [src/server/fonksiyon-oynakligi.ts](src/server/fonksiyon-oynakligi.ts)

**Kısayollar (tam liste, kodda tanımlı olanlar)**
- Ctrl/Cmd+K hızlı geçiş; Ctrl/Cmd+B gezgin; Ctrl/Cmd+Alt+E sorgu geçmişi; editörde Ctrl/Cmd+Enter Çalıştır, +Shift Dene; tablo sekmesinde Ctrl/Cmd+Enter Uygula, +Shift Dene, +Alt SQL; grid'de Shift+Enter satır görünümü, F2, Ctrl/Cmd+C, Ctrl/Cmd+A, Esc; Windows AltGr kısayol sayılmaz — [src/core/kisayollar.ts:1-52](src/core/kisayollar.ts), [src/web/App.tsx:164-174](src/web/App.tsx)

### Inferences
- IntelliJ/DataGrip'e göre en görünür boşluklar: gezginde ilişki dışı nesne türleri (fonksiyon, sequence, index, trigger, tip), nesne DDL'ini görme, EXPLAIN planı, dışa aktarma, ara/değiştir, SQL biçimlendirme, seçili/imleçteki ifadeyi çalıştırma, `RAISE NOTICE` gösterimi (araştırmada `'notice'` dinlenmediği not edilmişti; bu taramada da `src`'de `'notice'` bulunmadı).
- Gezginde view/matview/foreign tablo aynı ▦ ikonla, ayrım gözetmeden listelenir; DataGrip'teki "tables / views / routines" klasörlemesi yok.

### Gaps
- Kod çalıştırılıp arayüz görsel olarak doğrulanmadı; düğme metinleri ve davranışlar kaynak koddan okundu.
- Sonuç sekmesi kolon yeniden boyutlandırma/sıralama (konsol grid'inde) ayrıntısı ve dar ekran yerleşimi incelenmedi.

## 2. Kısmen yapılan, ertelenen ya da planlanan

### Takeaway
Dilim ticket'larının hepsi (1. dilim 01–19, 2. dilim 01–17, 3. dilim 01–07) `done`; açık iş yalnızca triyaj bekleyen öneri araştırmasında ve spec'lerin "Out of Scope" listelerinde duruyor.

### Cited Findings
- Tüm uygulama issue'ları `**Status:** done (<hash>)`; üç spec `ready-for-agent`, öneri araştırması `needs-triage` — [.scratch/oneriler/arastirma.md:4](.scratch/oneriler/arastirma.md), ör. [.scratch/ikinci-dilim-uygulama/issues/01-sekmeli-konsol.md:9](.scratch/ikinci-dilim-uygulama/issues/01-sekmeli-konsol.md)
- Araştırmada henüz yapılmamış öneriler: 2.1 imleçteki ifadeyi/seçimi çalıştır, 2.2 `RAISE NOTICE` gösterimi, 2.3 WHERE'siz UPDATE/DELETE uyarısı, 2.4 ara/değiştir ve çoklu seçim, 2.5 kopyala/dışa aktar (CSV, TSV, Markdown, INSERT), 2.6 `statement_timeout`, 2.7 CONCURRENTLY/VACUUM ilerlemesi, 3.1 EXPLAIN görselleştirme, 3.2 `pg_stat_activity` oturum izleme, 3.3 COPY ile CSV içe/dışa, 3.4 nesne DDL'i görüntüleme, 3.5 `pg_stat_statements`, 3.6 LISTEN/NOTIFY — [.scratch/oneriler/arastirma.md:82-162](.scratch/oneriler/arastirma.md)
- 1. dilim kapsam dışı (hâlâ geçerli olanlar): Karar süresi ayarı, ProxyJump / `~/.ssh/config` içe aktarma, libpq `anahtar=değer` dizisinden doldurma, IntelliJ şifre/renk taşıma, PG17 direct SSL, kayıt saklama süresi ayarı — [.scratch/ilk-dilim/spec.md:354-366](.scratch/ilk-dilim/spec.md)
- 2. dilim kapsam dışı: sonuç sekmesi sabitleme, konsol sonuçlarını düzenleme, kolon başına filtre arayüzü, `WITH HOLD` imleç, kolon silme/yeniden adlandırma/tip değiştirme, `bytea` düzenleme, bekletilen oturumu iptal/sonlandırma, grid'de CSV ya da başlıklı kopyalama, doldurma, tooltip, kolon sanallaştırması, kolon genişliğini diske yazma, şema seçimine göre `search_path` — [.scratch/ikinci-dilim/spec.md:314-323](.scratch/ikinci-dilim/spec.md)
- 3. dilim (tamamlama) kapsam dışı: otomatik takma ad, `SELECT *` açma, imza ipucu balonu, canlı şablonlar (`sel`, `ins`, `upd`), son kullanılan sıralaması, ikinci Ctrl+Space, anahtar kelime harf durumu ayarı, `CREATE TRIGGER`/`GRANT`/`ALTER FUNCTION` bağlamları, bilinmeyen tablo/kolon lint'i — [.scratch/ucuncu-dilim/spec.md:197-207](.scratch/ucuncu-dilim/spec.md)

### Inferences
- "Dördüncü dilim" (0.4.2: grid tümünü seç, gezgin sağ tık) için `.scratch/` altında spec/issue dosyası yok; değişiklikler doğrudan commit'lerle gelmiş (git `4f9159d`, `ba5f761`).

### Gaps
- CHANGELOG dosyası yok; sürüm geçmişi yalnızca git log ve etiketlerden çıkarılabiliyor.

## 3. Bildirilen kapsam ve kapsam dışı

### Takeaway
CLAUDE.md'deki kapsamın tamamı bugün uygulanmış görünüyor; bilinçli kapsam dışı: şema tasarımı, ER diyagramı, Postgres dışı veritabanları.

### Cited Findings
- Kapsam: bağlantı yönetimi (klasörler, etiket/renk, Cmd/Ctrl+K, `pg_database` ve şema seçimi, SSH tüneli, `dataSources.xml`/`.pgpass`), script çalıştırma (deneme dahil), sekmeli/geçmişli konsol + şema bilen tamamlama, filtreli/sayfalı tablo (`reltuples`), PK üzerinden düzenlenebilir grid (bekleyen değişiklik + SQL önizleme), ALTER TABLE önizlemeli kolon ekleme — [CLAUDE.md](CLAUDE.md) ("Kapsam")
- Kapsam dışı (şimdilik): şema tasarımı, ER diyagramı, Postgres dışı veritabanları — [CLAUDE.md](CLAUDE.md); aynı madde üç spec'te de tekrar ediyor — [.scratch/ikinci-dilim/spec.md:322](.scratch/ikinci-dilim/spec.md)
- Değişmez kurallar: yalnızca `127.0.0.1`, açılışta hiçbir sunucuya bağlanmama, prod kırmızı kenarlık + varsayılan salt okunur + tek tık yazma + ayrıca onay yok — [CLAUDE.md](CLAUDE.md)

### Inferences
- "Onay yok" kuralı DataGrip tarzı "bu prod, emin misin?" diyaloglarını dışarıda bırakır; araştırmadaki WHERE'siz UPDATE uyarısı bu yüzden "onaysız, lint olarak" önerilmiş — [.scratch/oneriler/arastirma.md:96](.scratch/oneriler/arastirma.md)

### Gaps
- Kapsam dışı maddelerin ne zaman yeniden değerlendirileceğine dair bir karar kaydı yok.

## 4. Bilinen sınırlamalar

### Takeaway
Sınırlamalar README, GLOSSARY ve ADR'lerde açıkça yazılı; kodda TODO/FIXME yok.

### Cited Findings
- prod salt okunurluğu güvenlik sınırı değil, kaza önleyici — [README.md:19](README.md)
- Okuma modu sezgiseldir; yazan fonksiyon çağıran SELECT yanlış sınıflanır (Postgres `25006` ile korur) — [README.md:25](README.md), [docs/adr/0004-okuma-modu.md](docs/adr/0004-okuma-modu.md)
- `OFFSET` sayfalamada sayfalar arası tutarlılık yok — [README.md:29](README.md)
- Çalıştırma kayıtları ve sekme dosyası düz metin, sırlar maskelenmez — [README.md:33](README.md), [README.md:39](README.md)
- İptal edilen `CREATE INDEX CONCURRENTLY` INVALID index bırakabilir, Tezgah uyarmaz; kapanan sekme bekleyen değişiklikleri kaybeder — [docs/adr/0002-kopmada-rollback.md](docs/adr/0002-kopmada-rollback.md)
- Deneme modu geri alınamayan yan etkileri (sequence ilerlemesi, dış etkiler) önlemez; fark PG18+ ve PK ister — [GLOSSARY.md:71-77](GLOSSARY.md)
- Sonuç grid'i 100.000 satırla sınırlı; transaction kapanınca devam satırları çekilemez — [GLOSSARY.md:99-101](GLOSSARY.md)
- Uzun Okuma transaction'ları prod'da vacuum ufkunu Karar süresi kadar tutabilir (prod'da 5 dk sınırı) — [.scratch/ikinci-dilim/spec.md](.scratch/ikinci-dilim/spec.md) (Bilinen riskler)
- Yarım SQL'de bağlam tahmini yanılabilir; büyük `pg_catalog` fonksiyon listesi katalog yanıtını birkaç yüz KB büyütür — [.scratch/ucuncu-dilim/spec.md](.scratch/ucuncu-dilim/spec.md) (Further Notes)

### Inferences
- Kural seti (onaysız, içerikten çıkan mod, kopmada rollback) DataGrip'ten bilinçli olarak farklı bir güvenlik modeli kuruyor; arayüz karşılaştırmasında "eksik" değil "farklı tasarım" olarak ele alınmalı.

### Gaps
- Performans ölçümleri (ör. büyük tabloda grid kaydırma) yalnızca tamamlama için test bütçesi olarak var; grid için sayısal veri bulunamadı.
