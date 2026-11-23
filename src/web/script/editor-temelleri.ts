/**
 * Script editörünün temel eklentileri: Türkçe ara/değiştir paneli (Ctrl/Cmd+F, F3/Shift+F3,
 * Cmd+G/Cmd+Shift+G), parantez eşi vurgusu, otomatik kapanış, aktif satır ve seçili kelimenin
 * diğer geçişlerinin vurgusu. Kısayollar yalnızca editör odaktayken çalışır; dışarıda Ctrl/Cmd+F
 * tarayıcının aramasıdır.
 */
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { closeSearchPanel, highlightSelectionMatches, openSearchPanel, search, searchKeymap, searchPanelOpen } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import { highlightActiveLine, keymap, ViewPlugin } from '@codemirror/view';

/** `@codemirror/search` panelinin metinleri. */
const ARAMA_METINLERI: Record<string, string> = {
  Find: 'Ara',
  Replace: 'Değiştir',
  next: 'Sonraki',
  previous: 'Önceki',
  all: 'Tümünü seç',
  'match case': 'Büyük/küçük harf',
  regexp: 'Düzenli ifade',
  'by word': 'Tam kelime',
  replace: 'Değiştir',
  'replace all': 'Tümünü değiştir',
  close: 'Kapat',
  'current match': 'Geçerli eşleşme',
  'on line': 'satırda',
  'replaced match on line $': '$. satırdaki eşleşme değiştirildi',
  'replaced $ matches': '$ eşleşme değiştirildi',
  'Go to line': 'Satıra git',
  go: 'Git',
};

/** Kapanışı otomatik eklenen açılışlar (`{` SQL'de nadir; eklenmez). */
const KAPANAN_ACILISLAR = ['(', '[', "'", '"'];

/**
 * Panel salt okunurluğa açılışta bakar (değiştirme alanları yalnızca düzenlenebilirken kurulur).
 * Panel açıkken salt okunurluk değişirse panel aynı sorguyla yeniden kurulur; odak paneldeyse
 * arama kutusuna, değilse eski yerine döner.
 */
const paneliSaltOkunurlugaUydur = ViewPlugin.define((view) => ({
  update(update) {
    if (update.startState.readOnly === update.state.readOnly || !searchPanelOpen(update.state)) return;
    queueMicrotask(() => {
      if (!searchPanelOpen(view.state)) return;
      const odak = document.activeElement as HTMLElement | null;
      const paneldeydi = !!odak?.closest('.cm-search');
      closeSearchPanel(view);
      openSearchPanel(view);
      if (!paneldeydi) odak?.focus();
    });
  },
}));

export const editorTemelleri: Extension = [
  EditorState.phrases.of(ARAMA_METINLERI),
  search({ top: true }),
  paneliSaltOkunurlugaUydur,
  highlightSelectionMatches(),
  bracketMatching(),
  closeBrackets(),
  EditorState.languageData.of(() => [{ closeBrackets: { brackets: KAPANAN_ACILISLAR } }]),
  highlightActiveLine(),
  keymap.of([...closeBracketsKeymap, ...searchKeymap]),
];
