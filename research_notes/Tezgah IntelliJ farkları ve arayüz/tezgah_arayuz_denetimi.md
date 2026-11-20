# Tezgah UI and visual design audit (current state, v0.4.2 source)

Method: read `src/web/**` (React components + the single stylesheet `src/web/styles.css`, 2660 lines) and ran the built app (`dist/server/cli.js`, bound to 127.0.0.1, with `APPDATA` pointed at an empty scratch config dir so the user's real settings were not touched). Headless Chrome (CDP script) captured screenshots in light and dark mode with three fake connections (host `127.0.0.1:1`, never connected; one tagged `prod`, one `staging`, one `dev`) and restored tabs (a prod console, a dev console, a table tab). No database connection was made; server and Chrome were killed afterwards. The result grid with real data could not be rendered without a DB, so grid findings are from code.

Screenshots (temporary, scratchpad): `C:\Users\btuhan\AppData\Local\Temp\claude\10b05e222d2c597d\29888cb7-3a69-42a9-b66e-49ef8684cfe0\scratchpad\shots\` — `01-bos-acilis-acik.png` (empty, light), `02-bos-acilis-koyu.png` (empty, dark), `03-prod-konsol-acik.png`, `04-prod-konsol-koyu.png`, `06-palet.png`, `07-baglam-menusu.png`, `08-yeni-baglanti-formu.png`, `10-ice-aktarma.png`, `11-dar-pencere.png` (900x700), `12-tablo-sekmesi.png`, `14-dev-konsol.png`, `15-gecmis.png`.

Caveat: the built app's sidebar footer showed `v0.4.1` while `package.json` is 0.4.2; the 0.4.2 context-menu item "Yeni konsol" was nevertheless present, so the dist appears close to HEAD. Differences 0.4.1→0.4.2 in `src/web` are small (context menus, grid select-all; +21 CSS lines).

## Layout: panels, arrangement, resizing/collapsing

### Takeaway
A two-column CSS grid: fixed 280 px left "Gezgin" sidebar + main work area containing a tab strip, a target header bar, and a fixed two-column body (editor left, fixed 400 px run/log column right) with a thin result strip at the bottom. Only the sidebar is collapsible (Ctrl/Cmd+B); no panel is resizable except grid columns, and there is no status bar.

### Cited Findings
- Root layout is `.tezgah { display:grid; grid-template-columns: auto 1fr }`; sidebar `.kenar { width: 280px }` (fixed) — `src/web/styles.css:47-70`.
- Sidebar header: title "Tezgah" plus five small icon buttons: "Ctrl K" (palette), `⇩` (import), `⊞` (new folder), `+` (new connection), `«` (hide navigator) — `src/web/App.tsx:723-770`. Footer shows only the version — `src/web/App.tsx:802`.
- Sidebar collapses via Ctrl/Cmd+B or `«`; when hidden, a vertical strip button "» Gezgin" appears — `src/web/App.tsx:169-172, 710-720`. State is not persisted ("diske yazılmaz") — `src/web/App.tsx:141-142`.
- Script screen body: `.script-govde { grid-template-columns: minmax(0,1fr) 400px }` — editor + toolbar left, a fixed 400 px "çalıştırma" column (run summary + "Log" tab) right — `src/web/styles.css:1001-1007`. No splitter component exists anywhere in `src/web` (only grid column handles: `src/web/grid/SonucGridi.tsx:593-606`).
- Results appear in a thin strip below the editor ("SELECT sonuçları burada açılır.") rather than a large result pane — screenshot `03-prod-konsol-acik.png`.
- Query history (Ctrl/Cmd+Alt+E) opens as a third column on the right, squeezing editor and log — screenshot `15-gecmis.png`; panel code `src/web/gecmis/GecmisPaneli.tsx`.
- New/edit connection form replaces the console in the main area (console is hidden, not unmounted) and is a ~520 px card left-aligned in an otherwise empty area — `src/web/App.tsx:820-852`; screenshot `08-yeni-baglanti-formu.png`.
- Table tab: header row with `public.musteri`, a WHERE CodeMirror field and an ORDER BY field, "+ Kolon", refresh `↻` and a row-view toggle `◧`; before loading it shows "Tablo henüz yüklenmedi; yüklemek hedefe bağlanır. [Yükle]" — screenshot `12-tablo-sekmesi.png`.
- Only one responsive rule: `@media (max-width: 720px)` — `src/web/styles.css:2080`. At 900x700 the 280 px sidebar + 400 px log column leave ~150 px for the editor; SQL wraps every 2-3 words, the bottom toolbar buttons become tall stacked blocks and "Salt okunur" is clipped; the tab strip gets a horizontal scrollbar — screenshot `11-dar-pencere.png`.

### Inferences
- The fixed 400 px log column dominates even when empty ("Henüz çalıştırma yok.") and the result area is small; for an IntelliJ-like tool the usual expectation is editor top / results bottom with a draggable splitter, and a collapsible log.
- No status bar means transaction state, connection state, row counts, timing etc. live in scattered places (header chips, toolbar chips, log column).

### Gaps
- Could not observe the result grid / pending-changes / row-view panels populated with real data (would require a DB connection).

## Styling approach, tokens, theme, fonts, icons

### Takeaway
Plain global CSS in one 2660-line file with Turkish class names, a small set of CSS custom-property color tokens (11 colors) and automatic light/dark via `prefers-color-scheme`. No spacing/typography/radius tokens, no icon set (Unicode glyphs), system UI font; CodeMirror uses its light-only default highlight style, which is nearly unreadable in dark mode.

### Cited Findings
- Tokens: `--zemin, --kenar-zemin, --cizgi, --metin, --soluk, --uyari, --prod, --secili, --vurgu, --basarili, --dikkat` (zinc/Tailwind-like palette) with a dark override block — `src/web/styles.css:1-31`. `color-scheme: light dark` is set — `src/web/styles.css:2`.
- No manual theme switch: dark mode only follows the OS (`@media (prefers-color-scheme: dark)`, `src/web/styles.css:18`); no other theme code in `src/web`.
- Hard-coded values outside tokens are few for color (`#fff` x5, `#b91c1c` x1) but sizes are ad hoc: font sizes used: 12px (32x), 11px (14x), 13px (8x), 10px (5x), 16px, 15px, 14px, 12.5px, 18px, 10.5px; border-radius values: 6px, 0, 999px, 4px, 50%, 9px, 8px, 5px, 3px, 14px — counted from `src/web/styles.css`.
- 17 inline `style={{...}}` usages in components (mostly dynamic colors/positions), e.g. env badge background from connection color — `src/web/script/ScriptEkrani.tsx:289`.
- Fonts: UI `system-ui, -apple-system, 'Segoe UI', sans-serif` at 14px — `src/web/styles.css:14-15`; monospace `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` repeated in ~9 places instead of a token — e.g. `src/web/styles.css:842, 1034, 1537`. Editor 13px, grid 12px — `src/web/styles.css:1033, 1538`.
- Icons are Unicode glyphs: `⇩ ⊞ + « » ↻ ▸ ▾ ⟲ ▶ ■ ⚠ ›_ ▦ ◧` and a padlock emoji in "Salt okunur" — `src/web/App.tsx:741, 750, 759, 768`; `src/web/script/ScriptEkrani.tsx:319, 347, 359`; screenshots. Rendering differs per OS font (emoji padlock is colored).
- CodeMirror theme: `syntaxHighlighting(defaultHighlightStyle)` in both the script editor and the table filter box — `src/web/script/ScriptEditoru.tsx:119`, `src/web/tablo/FiltreKutusu.tsx:56`. Only background/gutter/cursor are re-tokened — `src/web/styles.css:1028-1046`. In dark mode keywords (`SELECT`, `FROM`, `WHERE`) render dark purple/blue on `#18181b` and are barely visible — screenshot `04-prod-konsol-koyu.png`.
- No CSS transitions/animations anywhere (`grep transition|animation` in styles.css returns nothing).
- No CSS framework, no CSS modules, no component library; only React, CodeMirror 6 and `@tanstack/react-virtual` — `package.json`.

### Inferences
- The token base is a good starting point; adding spacing, font-size, radius and font-family tokens (and a dark highlight style for CodeMirror) would remove most inconsistency cheaply.
- A real icon set (e.g. inline SVG/Lucide-like) would make the toolbar look deliberate and consistent across macOS/Windows.

### Gaps
- No design docs/screenshots in repo describe an intended visual direction (no images tracked by git; `.scratch/oneriler/arastirma.md` is feature- not visual-focused).

## Consistency of controls (buttons, inputs, menus, dialogs, empty/loading/error states)

### Takeaway
Base controls are uniform (one global button style with `birincil`/`tehlikeli` variants, shared `Menu` and `Onay`), but secondary controls drift: link-style buttons in toolbars, native radios/checkboxes/date pickers in the history panel, several "chip/rozet" styles, and errors/notices shown as plain red paragraphs at the top of the work area. Loading states are text only.

### Cited Findings
- Global button: 4px 12px padding, 1px border, 6px radius; variants `.birincil` (blue fill) and `.tehlikeli` (red outline) — `src/web/styles.css:114-138`. Icon buttons 28x28 with 18px glyphs — `src/web/styles.css:141-147`.
- Link-styled button `.baglanti-dugme` (underlined blue) — `src/web/styles.css:149-155`; "Çalıştırma kayıtları klasörünü aç" sits as an underlined link in the target header next to a normal "hedefi değiştir ▾" button — `src/web/script/ScriptEkrani.tsx:306-311`; screenshot `03`.
- History panel uses native radio buttons, checkboxes and `<input type=date>` ("gg.aa.yyyy") with default browser styling — screenshot `15-gecmis.png`.
- Multiple pill styles: `.cip`, `.ortam-rozeti`, `.kilit-rozeti`, `.kilit-dugmesi`, `.mod-rozeti`, `.rozet sayi-rozeti` — `src/web/styles.css:419-437, 310, 1120-1140`; `src/web/script/ScriptEkrani.tsx:289-345`.
- Shared components are only `Menu`, `Onay` and `pencere.ts` in `src/web/ortak/`; other dialogs (folder name, password, host key, import) each build their own `.perde`/`.diyalog` markup — `src/web/App.tsx:904-916`, `src/web/ortak/Onay.tsx:24-31`.
- Dialog backdrop `rgb(0 0 0 / .4)`, dialog 420 px, 8px radius — `src/web/styles.css:456-479`. Import dialog is a wide two-pane modal with a live preview of the resulting tree — screenshot `10-ice-aktarma.png`.
- Global errors/notices: `<p role="alert" className="uyari">` stacked at the top of the work area (red text, no container, no dismiss button) — `src/web/App.tsx:805-819`. Info "kopyalandı" messages use the same slot.
- Loading states are text: "Yükleniyor…" (`src/web/gecmis/GecmisPaneli.tsx:150`), "Test ediliyor…" (`src/web/baglantilar/TestSonucu.tsx:42`); no spinners or skeletons.
- Empty states: sidebar "Henüz bağlantı yok." + "İçe aktar…" / "Yeni bağlantı…" buttons; editor "Hedef seçilmedi · Soldaki gezginden bir veritabanı seçin."; log "Script çalıştırılınca ifadeler burada listelenir." — screenshot `01-bos-acilis-acik.png`. The empty editor is still a full CodeMirror with "1" gutter and a disabled Çalıştır button.
- Context menu is a plain list (no icons, no shortcut hints, no separators), "Sil" in red, disabled items greyed — screenshot `07-baglam-menusu.png`; implementation `src/web/ortak/Menu.tsx`. In the capture the menu opened over the row that was right-clicked, hiding it.

### Inferences
- A small component layer (Button/IconButton/Chip/Dialog/Toast/Spinner) with tokens would remove most drift.
- Notices without dismiss/timeout push content down and can accumulate; a toast/inline banner pattern would be cleaner.

### Gaps
- Did not exercise error flows (password prompt, host key, failed connect) visually.

## Discoverability (shortcuts, palette, context menus, tooltips, onboarding)

### Takeaway
Power features exist (Ctrl/Cmd+K palette that also accepts `postgres://` URLs, Ctrl/Cmd+B, Ctrl/Cmd+Alt+E history, Ctrl/Cmd+Enter / +Shift run & try, context menus, keyboard tree navigation), but they are surfaced mostly through `title` tooltips; there is no shortcut list/help, the palette has only 4 commands, and onboarding is minimal.

### Cited Findings
- Global shortcuts: Ctrl/Cmd+K palette, Ctrl/Cmd+Alt+E history (uses `e.code`, AltGr-safe), Ctrl/Cmd+B navigator — `src/web/App.tsx:156-176`; editor Ctrl/Cmd+Enter = Çalıştır, +Shift = Dene; table Ctrl/Cmd+Enter = uygula, +Shift = dene, +Alt = SQL; Shift+Enter row view — `src/core/kisayollar.ts:24-51`.
- Palette: groups "HEDEFLER" (connection / database, PROD badge, "hedef" marker) and "KOMUTLAR" (only: Yeni bağlantı, Yeni klasör, İçe aktar, Çalıştırma kayıtları klasörünü aç); footer hint "↵ hedef yap · Alt+↵ listede göster · Esc kapat" — `src/web/App.tsx:470-475`; screenshot `06-palet.png`.
- The palette button in the sidebar shows the literal text "Ctrl K" — `src/web/App.tsx:725-733`.
- ~34 `title=` tooltips in components (count over `src/web/**/*.tsx`, tests excluded); shortcut hints for Çalıştır/Dene only in tooltips + `aria-keyshortcuts` — `src/web/script/ScriptEkrani.tsx:353-366`.
- The history shortcut is not shown on any visible control (only reachable by shortcut) — `src/web/App.tsx:162-168`; no button for it was seen in screenshots `03`/`14`.
- Tree keyboard navigation exists (ArrowLeft/Right toggle, `aria-expanded`) — `src/web/gezgin/GezginAgaci.tsx:280, 357-370`.
- Context menus: connection (Yeni konsol, Hedef yap, Bağlan/Yenile, Düzenle, Kopyala, Klasöre taşı ▸, URL'yi kopyala, Bağlantıyı kes, Sil), database (Yeni konsol, Hedef yap, Adı kopyala), table (Aç, Yeni konsolda SELECT, Adı kopyala), folder — `src/web/App.tsx:606-677`. Rows also show a `…` button on hover/selection — screenshot `08`.
- Editor keymap is only `defaultKeymap` + `historyKeymap` — no search/replace keymap, bracket matching, close-brackets or active-line highlight — `src/web/script/ScriptEditoru.tsx:113-124`.

### Inferences
- A "Kısayollar" help (e.g. `?` or palette command), more palette commands (run, try, toggle write mode, new console, history, theme), and showing shortcut hints in context menus/buttons would greatly raise discoverability.
- Adding `@codemirror/search` (Ctrl/Cmd+F) is a cheap, expected editor feature.

### Gaps
- No onboarding/first-run guidance beyond the empty-state buttons; did not find docs listing shortcuts for users (README not inspected in detail for this).

## Data grid: density, alignment, NULL, resizing, sticky headers, selection

### Takeaway
Custom virtualized grid (`@tanstack/react-virtual`) with compact density (24 px rows, 12 px monospace), sticky header and sticky row-number column, resizable columns, italic grey `NULL`, translucent blue selection and an outlined active cell. Numbers are not right-aligned, there is no zebra striping or row hover, and column type is shown in tiny 10.5 px text.

### Cited Findings
- Row height 24 px, header 26 px — `src/web/grid/SonucGridi.tsx:32-33`; monospace 12 px — `src/web/styles.css:1532-1540`.
- Sticky header `.grid-basligi { position: sticky; top:0 }` — `src/web/styles.css:1552-1558`; sticky row-number column `.grid-satir-no { position: sticky; left:0 }`, right-aligned grey numbers — `src/web/styles.css:1595-1608`.
- Column resize handles (6 px, `cursor: col-resize`, `role="separator"`) — `src/web/styles.css:1636-1645`; `src/web/grid/SonucGridi.tsx:593-606`. Initial widths measured from first page, 48–400 px — `src/core/grid/sabitler.ts`.
- NULL shown as literal `NULL`, grey italic — `src/core/grid/gosterim.ts:6`; `src/web/styles.css:1660-1663`. Cell text truncated with ellipsis, max 1000 chars rendered — `src/core/grid/sabitler.ts`.
- Selection: `color-mix(var(--vurgu) 16%)` background; active cell 2px blue outline — `src/web/styles.css:1664-1672`.
- All cells left-aligned: `.grid-hucresi` has no alignment by type, and no numeric class is applied in `SonucGridi.tsx:648-660` (only `varsayilan`, `null`, `secili`, `aktif`, `degisti`). Row-number column uses no `tabular-nums` either (`tabular-nums` appears only once at `src/web/styles.css:1293`).
- No hover style on data rows (only on row numbers/corner, `src/web/styles.css:1630-1634`) and no zebra striping.
- Column header shows name + type (`grid-kolon-tipi`, 10.5 px grey) and sort arrow with `aria-sort` — `src/web/styles.css:1586-1591`; `src/web/grid/SonucGridi.tsx:569-592`.
- F2/double-click opens a 144 px resizable value box (read-only or editor) over the cell — `src/web/styles.css:1675-1710`.
- Good ARIA: `role="grid"`, `aria-rowcount`, `aria-multiselectable`, `aria-selected`, `aria-invalid` for failed rows — `src/web/grid/SonucGridi.tsx:539-660`.
- Pending-edit states exist as classes (`degisti`, `varsayilan`) — `src/web/grid/SonucGridi.tsx:653`.

### Inferences
- Right-aligning numeric columns with `tabular-nums`, a subtle row hover/zebra, and clearer type badges would make the grid read like DataGrip's.
- Using a distinct color/badge for NULL vs empty string is already done; consider `<null>` style chip for clarity with monospace text.

### Gaps
- Could not visually verify grid density, edited-cell colors, or the row-view side panel without a DB.

## Prod-safety visuals

### Takeaway
Prod is signalled in many places: a 2 px red inset frame around the whole app, red-tinted target header, red `PROD` badge, red dot + left stripe in the tree and palette, and a "Salt okunur" pill toggle. It is clear but somewhat noisy, and the write-mode toggle is duplicated (header badge + toolbar button) with the actual toggle placed low next to Çalıştır.

### Cited Findings
- App frame: `.tezgah.prod-cerceve { box-shadow: inset 0 0 0 2px var(--prod) }` applied when the active tab's target is prod — `src/web/styles.css:55-58`; `src/web/App.tsx:709`.
- Target header tint `color-mix(var(--prod) 14%, var(--zemin))` — `src/web/styles.css:975-976`; env badge with the connection color as background and white text — `src/web/script/ScriptEkrani.tsx:288-291`.
- Tree/palette stripes: `.agac-satiri.prod-serit`, `.palet-secenegi.prod { box-shadow: inset 3px 0 0 var(--prod) }` — `src/web/styles.css:1971-1972, 1795-1796`.
- Write lock: read-only badge in header (`kilit-rozeti`, title "Yazma kilidi") and a pill button in the bottom toolbar (`kilit-dugmesi`, `aria-pressed`) that toggles with one click, no confirm, per the invariant in CLAUDE.md — `src/web/script/ScriptEkrani.tsx:293-345`; `src/web/styles.css:1120-1140`. When write mode is on, both turn red-outlined.
- The red frame stays visible while the new-connection form is open (form unrelated to prod) because it follows the hidden console's active tab — screenshot `08-yeni-baglanti-formu.png`; `src/web/App.tsx:709, 820-852`.
- Env colors: local `#64748b`, dev `#16a34a`, test `#0891b2`, staging `#d97706`, prod `#dc2626` — `src/core/baglanti.ts:9-15`. White text on `#16a34a` ≈ 3.3:1 and on `#d97706` ≈ 3.2:1 (my calculation from WCAG relative luminance), below 4.5:1 for small text; on `#dc2626` ≈ 4.8:1.
- Autocommit warning strip "⚠ N ifade anında kalıcı uygulanır, geri alınamaz" in amber — `src/web/script/ScriptEkrani.tsx:317-321`; `src/web/styles.css:1148-1151`.

### Inferences
- Consider making write-mode state visually stronger when ON (e.g. red header + "YAZMA AÇIK" label) and quieter when read-only, and keep one toggle location (header) to reduce duplication.
- Env badge text color should be computed for contrast (dark text on amber/green).

### Gaps
- Did not capture the write-mode ON state or the "deneme prod" banner.

## Accessibility basics

### Takeaway
Semantics are above average for a personal tool (ARIA roles on tabs, grid, tree toggles, menus, dialogs, `aria-keyshortcuts`, `role="alert"`), but focus visibility is inconsistent (several `outline: none`), dialogs have no focus trap, motion/zoom/contrast concerns exist in dark mode syntax colors and env badges.

### Cited Findings
- Focus styles: `:focus-visible` outlines on grid (`src/web/styles.css:1542-1545`), chips (`:430-433`), dashed outline on row menus (`:184-195`); but `outline: none` at `src/web/styles.css:507` (menu items, replaced by background), `:1759`, `:2181` (history entries `:focus`), `:2588`.
- Native button focus otherwise relies on browser default (no global focus ring token).
- Dialogs: `role="dialog"/"alertdialog"`, `aria-modal`, labelled/described, initial focus on "Vazgeç", Escape closes — `src/web/ortak/Onay.tsx:12-31`. No focus trap or `inert` usage found in `src/web` (grep for `inert|showModal|trapFocus` returned nothing), so Tab can leave the modal.
- Menu: arrow-key navigation, focus first enabled item — `src/web/ortak/Menu.tsx:38-62`.
- Icon-only buttons have `aria-label` + `title` — `src/web/App.tsx:725-769`.
- `<html lang="tr">` set — `src/web/index.html:2`.
- Dark-mode syntax highlight contrast very low (see styling section) — screenshot `04-prod-konsol-koyu.png`.
- Many secondary texts at 10–11 px in `--soluk` grey (e.g. tree counts, column types) — font-size counts above.

### Inferences
- Add a global `:focus-visible` ring token, a focus trap for modals (or use `<dialog>.showModal()`), and raise the smallest text sizes to 11–12 px minimum.

### Gaps
- No automated contrast/axe audit was run; contrast numbers above are hand-computed for env badges only.
