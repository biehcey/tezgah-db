# Sürüm notları

## 0.5.0

### Davranış değişikliği: Ctrl/Cmd+Enter

Konsol sekmesinde **Ctrl/Cmd+Enter artık tüm script'i değil, Çalışacak aralığı çalıştırır**: metin seçiliyse seçimi, değilse imlecin bulunduğu ifadeyi (imleç ifadeler arasındaysa imleçten önceki en yakın ifadeyi). Tüm script'i çalıştırmak için **Ctrl/Cmd+Alt+Enter** (Tümünü çalıştır), denemek için **Ctrl/Cmd+Alt+Shift+Enter** (Tümünü dene) kullanılır; **Ctrl/Cmd+Shift+Enter** Çalışacak aralığı dener. Aralık sunucuya tek başına bir script olarak gider: Çalıştırma modu, Yazma kilidi, karar kartı ve Deneme modu aralık için de aynen işler. Tablo sekmesinin kısayolları değişmedi.

### Yeni

- Editör: Ctrl/Cmd+F ile ara/değiştir, parantez eşleşmesi, aktif satır vurgusu; Çalışacak aralık editörde hafif bir zeminle gösterilir.
- Sunucu bildirimleri: `RAISE NOTICE`/`WARNING` ve diğer bildirimler Sonuç alanındaki "Bildirimler (N)" sekmesinde, ifadenin satırı, seviyesi ve `DETAIL`/`HINT` ile.
- Yerleşim: boyutlandırılabilir ve kalıcı gezgin, editörün altında boyutlandırılabilir/daraltılabilir Sonuç alanı (Sonuç sekmeleri, Log, Değişiklikler, Bildirimler), karar şeridi, en altta Durum çubuğu (hedef, transaction durumu, son çalıştırma, grid seçim özeti), Sorgu geçmişi çekmecesi.
- Grid: sayısal kolonlar sağa yaslı, belirgin NULL, seçim özeti (sayı, toplam, ortalama); sağ tık "Kopyala" alt menüsünde TSV, başlıklı TSV, CSV, Markdown, JSON, INSERT; Ctrl/Cmd+Shift+C başlıklı TSV kopyalar.
- Keşfedilebilirlik: tek kısayol kataloğundan beslenen tooltip'ler, genişleyen Ctrl/Cmd+K paleti (konsol, görünüm, tema komutları) ve `?` ile açılan kısayol sayfası.
- Tema: Sistem/Açık/Koyu seçimi (palette); koyu temada okunur SQL renklendirmesi; yeni tasarım token'ları, diyalog ve bildirim kutuları.
- Arayüz tercihleri (tema, gezgin, editör/sonuç oranı) yapılandırma dizinindeki `arayuz.json`'da saklanır.
- prod sinyali: salt okunur ve yazma açık görünümleri tek kilit düğmesinde, ortam rengiyle.
