import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { sqlDili, tamamlamaTemeli, type TamamlamaGirdisi } from '../script/tamamlama';

interface Props {
  /** Erişilebilir ad ve yer tutucu (`WHERE` / `ORDER BY`). */
  etiket: string;
  value: string;
  onChange: (value: string) => void;
  /** Enter (tamamlama listesi kapalıyken). */
  onApply: () => void;
  /** Tamamlama motorunun girdisi (örtük tablo ve kutu türüyle). */
  completion: TamamlamaGirdisi | null;
  invalid: boolean;
}

/**
 * Tablo sekmesinin tek satırlık SQL kutusu (CodeMirror): renklendirme ve editörle aynı tamamlama;
 * Enter uygular, yani yazarken satır eklenmez. Tamamlama listesi açıkken Enter öneriyi seçer
 * (tamamlamanın tuşları önce). Yapıştırılan çok satırlı metin olduğu gibi kalır: satır sonunu
 * boşluğa çevirmek `--` yorumundan sonraki satırı yorumun içine alırdı.
 */
export function FiltreKutusu({ etiket, value, onChange, onApply, completion, invalid }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onApply });
  handlers.current = { onChange, onApply };
  const language = useRef(new Compartment());
  const attributes = useRef(new Compartment());

  const ariaAttributes = (bad: boolean) =>
    EditorView.contentAttributes.of({ 'aria-label': etiket, ...(bad && { 'aria-invalid': 'true' }) });

  useEffect(() => {
    const created = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          tamamlamaTemeli,
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                handlers.current.onApply();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          syntaxHighlighting(defaultHighlightStyle),
          placeholder(etiket),
          language.current.of(sqlDili(completion)),
          attributes.current.of(ariaAttributes(invalid)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) handlers.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = created;
    return () => {
      created.destroy();
      view.current = null;
    };
    // Kutu bir kez kurulur; metin, tamamlama ve geçerlilik aşağıdaki effect'lerle eşitlenir.
  }, []);

  useEffect(() => {
    const current = view.current;
    if (current && current.state.doc.toString() !== value) {
      current.dispatch({ changes: { from: 0, to: current.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: language.current.reconfigure(sqlDili(completion)) });
  }, [completion]);

  useEffect(() => {
    view.current?.dispatch({ effects: attributes.current.reconfigure(ariaAttributes(invalid)) });
    // `etiket` sabittir.
  }, [invalid]);

  return <div ref={host} className="filtre-editoru" />;
}
