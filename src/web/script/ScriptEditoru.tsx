import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { Compartment, EditorState, RangeSet, StateEffect, StateField, type Extension, type Range } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, ViewPlugin, gutter, keymap, lineNumbers, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { calisacakAralik } from '../../core/calisacak-aralik';
import type { StatementStatus } from '../../core/script-calistirma';
import { sqlRenklendirme } from '../ortak/sozdizimi';
import { editorTemelleri } from './editor-temelleri';
import { ANALYSIS_MARKS, STATUS_LABELS, STATUS_SYMBOLS, isAnalysisMark, type AnalysisMark } from './durum';
import { sqlDili, tamamlamaTemeli, type TamamlamaGirdisi } from './tamamlama';

/** Editörün süsleri: ifade başına satır işareti, hatalı ifadenin vurgusu ve analiz işaretleri. */
export interface EditorMarks {
  /** 1 tabanlı satır → o satırda başlayan ifadenin durumu ya da analiz işareti. */
  lines: Map<number, StatementStatus | AnalysisMark>;
  /** Hatanın betik offset aralığı. */
  error: { bas: number; bit: number } | null;
  /** Analizin işaretlediği ifadelerin betik offset aralıkları. */
  analysis?: { bas: number; bit: number; tur: AnalysisMark }[];
}

export interface ScriptEditoruHandle {
  /** İmleci satırın başına koyar, görünür yapar ve editöre odaklanır. */
  goToLine(line: number): void;
}

/** Editörün ana seçimi; boşsa `from === to === imlec`. */
export interface EditorSecimi {
  from: number;
  to: number;
  imlec: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  marks: EditorMarks;
  /** Tamamlama motorunun girdisi (katalog + görünür şemalar); katalog yoksa `null`. */
  completion?: TamamlamaGirdisi | null;
  /** Seçim ya da imleç değişti (açılışta da bir kez). */
  onSelectionChange?: (secim: EditorSecimi) => void;
}

const secimOf = (state: EditorState): EditorSecimi => {
  const { from, to, head } = state.selection.main;
  return { from, to, imlec: head };
};


class StatusMarker extends GutterMarker {
  constructor(
    readonly status: StatementStatus | AnalysisMark,
    readonly line: number,
  ) {
    super();
  }
  override eq(other: StatusMarker) {
    return other.status === this.status && other.line === this.line;
  }
  override toDOM() {
    const el = document.createElement('span');
    // Satır 0: sütun genişliğini ayıran görünmez yer tutucu.
    el.className = this.line === 0 ? 'cm-ifade-bosluk' : `cm-ifade-isareti ${this.status}`;
    el.dataset.satir = String(this.line);
    const status = this.status;
    el.title = isAnalysisMark(status) ? ANALYSIS_MARKS[status].label : STATUS_LABELS[status];
    el.textContent = isAnalysisMark(status) ? ANALYSIS_MARKS[status].symbol : STATUS_SYMBOLS[status];
    return el;
  }
}

const setMarks = StateEffect.define<EditorMarks>();
const EMPTY: EditorMarks = { lines: new Map(), error: null };

const marksField = StateField.define<EditorMarks>({
  create: () => EMPTY,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setMarks)) return effect.value;
    return value;
  },
});

const errorDecorations = EditorView.decorations.compute([marksField], (state): DecorationSet => {
  const { error } = state.field(marksField);
  const length = state.doc.length;
  if (!error || error.bas > length) return Decoration.none;
  const bas = error.bas;
  const bit = Math.min(Math.max(error.bit, bas + 1), length);
  const ranges: Range<Decoration>[] = [];
  // Hatalı aralığın kapladığı her satır kırmızı zeminli; aralık dalgalı alt çizgili.
  const last = state.doc.lineAt(Math.max(bas, bit - 1)).number;
  for (let n = state.doc.lineAt(bas).number; n <= last; n++) {
    ranges.push(Decoration.line({ class: 'cm-hatali-satir' }).range(state.doc.line(n).from));
  }
  if (bit > bas) ranges.push(Decoration.mark({ class: 'cm-hata-alti' }).range(bas, bit));
  return Decoration.set(ranges, true);
});

/** Analizin işaretlediği ifadelerin her satırı kendi zeminiyle. */
const analysisDecorations = EditorView.decorations.compute([marksField], (state): DecorationSet => {
  const { analysis } = state.field(marksField);
  const length = state.doc.length;
  const ranges: Range<Decoration>[] = [];
  for (const { bas, bit, tur } of analysis ?? []) {
    if (bas > length) continue;
    const last = state.doc.lineAt(Math.min(Math.max(bas, bit - 1), length)).number;
    for (let n = state.doc.lineAt(bas).number; n <= last; n++) {
      ranges.push(Decoration.line({ class: ANALYSIS_MARKS[tur].lineClass }).range(state.doc.line(n).from));
    }
  }
  return Decoration.set(ranges, true);
});

/**
 * Çalışacak ifadenin hafif zemini: yalnızca editör odaktayken ve seçim boşken; hata vurgusu
 * varken gösterilmez (hata önce gelir).
 */
const calisacakVurgu = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      const marksChanged = update.startState.field(marksField) !== update.state.field(marksField);
      if (update.docChanged || update.selectionSet || update.focusChanged || marksChanged) this.decorations = this.build(update.view);
    }
    build(view: EditorView): DecorationSet {
      const { state } = view;
      const { main } = state.selection;
      if (!view.hasFocus || !main.empty || state.field(marksField).error) return Decoration.none;
      const aralik = calisacakAralik(state.doc.toString(), main, main.head);
      if (!aralik || aralik.bit <= aralik.bas) return Decoration.none;
      return Decoration.set([Decoration.mark({ class: 'cm-calisacak-aralik' }).range(aralik.bas, aralik.bit)]);
    }
  },
  { decorations: (v) => v.decorations },
);

const statusGutter = gutter({
  class: 'cm-ifade-isaretleri',
  markers: (view) => {
    const { lines } = view.state.field(marksField);
    const doc = view.state.doc;
    const markers = [...lines]
      .filter(([line]) => line <= doc.lines)
      .sort(([a], [b]) => a - b)
      .map(([line, status]) => new StatusMarker(status, line).range(doc.line(line).from));
    return RangeSet.of(markers);
  },
  initialSpacer: () => new StatusMarker('sirada', 0),
});

const baseExtensions: Extension[] = [
  statusGutter,
  lineNumbers(),
  history(),
  tamamlamaTemeli,
  editorTemelleri,
  keymap.of([...defaultKeymap, ...historyKeymap]),
  sqlRenklendirme,
  marksField,
  errorDecorations,
  analysisDecorations,
  calisacakVurgu,
  EditorView.lineWrapping,
];

/** CodeMirror 6 SQL editörü; durumu (metin, salt okunurluk, süsler) React'ten gelir. */
export const ScriptEditoru = forwardRef<ScriptEditoruHandle, Props>(function ScriptEditoru(
  { value, onChange, readOnly, marks, completion = null, onSelectionChange },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectionRef = useRef(onSelectionChange);
  onSelectionRef.current = onSelectionChange;
  const readOnlyCompartment = useRef(new Compartment());
  const languageCompartment = useRef(new Compartment());

  useEffect(() => {
    const created = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          ...baseExtensions,
          languageCompartment.current.of(sqlDili(completion)),
          // Çalışırken düzenleme kapalı: ifade offset'leri sunucunun gördüğüyle aynı kalmalı.
          readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
          EditorView.contentAttributes.of({ 'aria-label': 'SQL script' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) onSelectionRef.current?.(secimOf(update.state));
          }),
        ],
      }),
    });
    view.current = created;
    onSelectionRef.current?.(secimOf(created.state));
    return () => {
      created.destroy();
      view.current = null;
    };
    // Editör bir kez kurulur; metin, süsler ve salt okunurluk aşağıdaki effect'lerle eşitlenir.
  }, []);

  useEffect(() => {
    const current = view.current;
    if (current && current.state.doc.toString() !== value) {
      current.dispatch({ changes: { from: 0, to: current.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: setMarks.of(marks) });
  }, [marks]);

  // Katalog değişince (yüklendi, ↻, DDL sonrası) dil yeniden yapılandırılır.
  useEffect(() => {
    view.current?.dispatch({ effects: languageCompartment.current.reconfigure(sqlDili(completion)) });
  }, [completion]);

  useEffect(() => {
    view.current?.dispatch({ effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)) });
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    goToLine(line) {
      const current = view.current;
      if (!current) return;
      const target = current.state.doc.line(Math.min(Math.max(line, 1), current.state.doc.lines));
      current.dispatch({ selection: { anchor: target.from }, effects: EditorView.scrollIntoView(target.from, { y: 'center' }) });
      current.focus();
    },
  }));

  return <div ref={host} className="script-editoru" />;
});
