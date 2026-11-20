# 03: Editör temelleri

Spec: [Editör temelleri](../spec.md#editör-temelleri), [Editör eklentileri](../spec.md#editör-eklentileri)

**What to build:** Script editöründe Ctrl/Cmd+F Türkçe bir ara/değiştir paneli açar (büyük/küçük harf, tam kelime, düzenli ifade, tümünü değiştir; F3/Shift+F3, macOS'ta Cmd+G/Cmd+Shift+G). İmleç bir parantezin yanındayken eşi vurgulanır; `(`, `[`, `'`, `"` kapanışı otomatik eklenir; aktif satır ve seçili kelimenin diğer geçişleri hafifçe vurgulanır. Çalışma sürerken (editör salt okunur) arama çalışır, değiştirme kapalıdır. Editör odakta değilken Ctrl/Cmd+F tarayıcının aramasını açmaya devam eder.

**Blocked by:** None (can start immediately)

**Status:** done (3044355)

- [x] `@codemirror/search` bağımlılığı; arama paneli, `searchKeymap`, `highlightSelectionMatches`.
- [x] Panel metinleri `EditorState.phrases` ile Türkçe.
- [x] `bracketMatching`, `closeBrackets` + `closeBracketsKeymap`, `highlightActiveLine`.
- [x] Tamamlama motorunun Enter/Tab davranışı ve mevcut tamamlama testleri `closeBrackets` ile bozulmaz; fonksiyon eklemede imlecin parantez içine konması korunur.
- [x] Panel ve vurgular token renklerini kullanır (ticket 01 bitmemişse mevcut renk değişkenleriyle; 01 sonrası token'a bağlanır).
- [x] Testler (arayüz): Ctrl/Cmd+F paneli açar ve Türkçe etiketlidir; değiştir editör metnini değiştirir; salt okunurken değiştir pasiftir; `(` yazınca `()` oluşur ve `)` yazınca çiftlenmez.

## Comments

- Eklentiler `src/web/script/editor-temelleri.ts`'te. Salt okunurken panelde değiştirme satırı hiç kurulmaz; panel açıkken salt okunurluk değişirse panel aynı sorguyla yeniden kurulur (değiştirme kalkar/geri gelir).
- Renkler 01 bitmeden yazıldı: `styles.css`'te mevcut `--vurgu`, `--dikkat`, `--uyari`, `--cizgi`, `--kenar-zemin` değişkenleri. 01 birleşince bu kurallar token adlarına taşınmalı.
- `closeBrackets` yalnızca `(`, `[`, `'`, `"` için; `{` kapanmaz.
