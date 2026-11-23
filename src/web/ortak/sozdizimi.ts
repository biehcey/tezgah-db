import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

/**
 * SQL sözdizimi renkleri: değerler `styles.css`'teki `--sozdizimi-*` token'larıdır, yani açık/koyu
 * tema CSS'te değişir ve editör yeniden kurulmaz. Script editörü ve Tablo sekmesinin filtre kutuları
 * aynı stili kullanır.
 */
export const sqlVurguStili = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: 'var(--sozdizimi-anahtar)' },
  { tag: [t.string], color: 'var(--sozdizimi-dizge)' },
  { tag: [t.number], color: 'var(--sozdizimi-sayi)' },
  { tag: [t.bool, t.null, t.atom], color: 'var(--sozdizimi-sabit)' },
  { tag: [t.lineComment, t.blockComment, t.comment], color: 'var(--sozdizimi-yorum)', fontStyle: 'italic' },
  { tag: [t.typeName, t.standard(t.name)], color: 'var(--sozdizimi-tip)' },
  // lang-sql tırnaklı adları (`"Kolon"`) `special(string)` olarak işaretler: dizge değil, addır.
  { tag: [t.name, t.special(t.name), t.special(t.string), t.propertyName, t.variableName], color: 'var(--sozdizimi-ad)' },
  { tag: [t.invalid], color: 'var(--sozdizimi-gecersiz)' },
]);

/** Editörün kendi yüzeyleri (seçim, imleç, tamamlama listesi) de token'lara bağlıdır. */
const editorTemasi = EditorView.theme({
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--metin)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground': {
    background: 'var(--editor-secim)',
  },
  '.cm-tooltip': {
    border: '1px solid var(--cizgi)',
    background: 'var(--kenar-zemin)',
    color: 'var(--metin)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    background: 'var(--renk-vurgu)',
    color: 'var(--metin-zit)',
  },
});

/** Script editörü ve filtre kutusunun ortak renklendirme eklentisi. */
export const sqlRenklendirme: Extension = [syntaxHighlighting(sqlVurguStili), editorTemasi];
