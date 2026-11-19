/**
 * Editörün tamamlaması: core'daki motoru (`tamamla`) CodeMirror'a bağlar (ADR-0005). lang-sql
 * yalnızca renklendirir; ona `schema` verilmez ve kendi kaynakları `override` ile devre dışıdır.
 *
 * Tuşlar (IntelliJ gibi): popup yazarken ve `.` sonrası açılır; Ctrl+Space (tüm platformlarda)
 * elle açar; Enter `from`–imleç aralığına ekler; popup açıkken Tab `from`–`to`'yu (imlecin
 * sağındaki kelime kalanı dahil) değiştirir; popup kapalıyken Tab'a dokunulmaz.
 */
import {
  autocompletion,
  closeCompletion,
  completionStatus,
  pickedCompletion,
  selectedCompletion,
  startCompletion,
  type Completion,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { Facet, Prec, type Extension } from '@codemirror/state';
import { keymap, type Command, type EditorView } from '@codemirror/view';
import type { Catalog } from '../../core/katalog';
import { popupAcilir, tabAraligi, tamamla, type Oneri, type OrtukTablo } from '../../core/tamamlama';

/** Editörün tamamlama girdisi; katalog yoksa da motor anahtar kelime ve takma ad önerir. */
export interface TamamlamaGirdisi {
  katalog: Catalog | null;
  gorunurSemalar: readonly string[];
  /** Tablo sekmesi kutuları: metin bu tablonun ifadesidir. */
  ortukTablo?: OrtukTablo;
}

/** Editöre verilen girdi; testler editörün aldığını buradan okur. */
export const tamamlamaGirdisi = Facet.define<TamamlamaGirdisi | null, TamamlamaGirdisi | null>({ combine: (values) => values[0] ?? null });

/** Motorun önerisinden kurulan seçenek; Tab için motorun `from`–`to` aralığını taşır. */
interface MotorSecenegi extends Completion {
  oneri: Oneri;
  aralik: { from: number; to: number };
}

function uygula(view: EditorView, secenek: MotorSecenegi, from: number, to: number) {
  const { eklenecek, imlec } = secenek.oneri;
  view.dispatch({
    changes: { from, to, insert: eklenecek },
    selection: { anchor: from + (imlec ?? eklenecek.length) },
    annotations: pickedCompletion.of(secenek),
    userEvent: 'input.complete',
    scrollIntoView: true,
  });
}

const kaynak: CompletionSource = (ctx) => {
  const girdi = ctx.state.facet(tamamlamaGirdisi);
  const metin = ctx.state.doc.toString();
  const sonuc = tamamla(metin, ctx.pos, girdi?.katalog ?? null, {
    gorunurSemalar: girdi?.gorunurSemalar ?? [],
    ...(girdi?.ortukTablo && { ortukTablo: girdi.ortukTablo }),
  });
  if (!sonuc || !popupAcilir(metin, sonuc, ctx.pos, ctx.explicit)) return null;
  const aralik = { from: sonuc.from, to: sonuc.to };
  return {
    from: sonuc.from,
    options: sonuc.oneriler.map(
      (oneri): MotorSecenegi => ({
        label: oneri.etiket,
        type: oneri.tur,
        boost: oneri.oncelik,
        ...(oneri.detail !== undefined && { detail: oneri.detail }),
        ...(oneri.info !== undefined && { info: oneri.info }),
        oneri,
        aralik,
        apply: (view, completion, from, to) => uygula(view, completion as MotorSecenegi, from, to),
      }),
    ),
  };
};

/** Tab: popup açıkken seçili öneriyle `from`–`to`'yu değiştirir; kapalıyken işlemez. */
const tabIleDegistir: Command = (view) => {
  if (completionStatus(view.state) !== 'active') return false;
  const secenek = selectedCompletion(view.state) as MotorSecenegi | null;
  if (!secenek?.aralik) return false;
  const { from, to } = tabAraligi(secenek.aralik, view.state.selection.main.head);
  uygula(view, secenek, from, to);
  closeCompletion(view);
  return true;
};

/** Tamamlama tuşları; `autocompletion`'ın kendi eşlemesinden (Enter, oklar, Escape) önce. */
export const TAMAMLAMA_TUSLARI = [
  { key: 'Ctrl-Space', run: startCompletion },
  { key: 'Tab', run: tabIleDegistir },
];

/** Değişmeyen parça: motor kaynağı ve tuşlar. */
export const tamamlamaTemeli: Extension = [
  autocompletion({ override: [kaynak], activateOnTyping: true }),
  Prec.highest(keymap.of(TAMAMLAMA_TUSLARI)),
];

/** Yeniden yapılandırılan parça (katalog değişince): renklendirme ve girdi. */
export function sqlDili(girdi: TamamlamaGirdisi | null): Extension {
  return [sql({ dialect: PostgreSQL }), tamamlamaGirdisi.of(girdi)];
}
