import { completionStatus, currentCompletions, selectedCompletion } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Catalog } from '../../core/katalog';
import { emptyCatalog } from '../test/sahte-api';
import { ScriptEditoru } from './ScriptEditoru';
import type { TamamlamaGirdisi } from './tamamlama';

const kolon = (ad: string) => ({ ad, tip: 'integer', tipOid: 23, notNull: false, varsayilan: false, uretilmis: false });
const KATALOG: Catalog = emptyCatalog({
  iliskiler: [
    { sema: 'public', ad: 'customer_orders', tur: 'r', kolonlar: [kolon('id')], pk: [], reltuples: 0 },
    { sema: 'public', ad: 'customers', tur: 'r', kolonlar: [kolon('id')], pk: [], reltuples: 0 },
  ],
});
const GIRDI: TamamlamaGirdisi = { katalog: KATALOG, gorunurSemalar: ['public'] };

/** Editörü `|` imleç işaretli metinle açar. */
function editor(isaretli: string, completion: TamamlamaGirdisi | null = GIRDI): EditorView {
  const imlec = isaretli.indexOf('|');
  const { container } = render(
    <ScriptEditoru value={isaretli.replace('|', '')} onChange={() => {}} readOnly={false} marks={{ lines: new Map(), error: null }} completion={completion} />,
  );
  const view = EditorView.findFromDOM(container.querySelector('.cm-content') as HTMLElement)!;
  view.dispatch({ selection: { anchor: imlec } });
  view.focus();
  return view;
}

const tus = (view: EditorView, key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(view.contentDOM, { key, ...init });

async function ctrlSpace(view: EditorView) {
  tus(view, ' ', { code: 'Space', ctrlKey: true });
  await waitFor(() => expect(completionStatus(view.state)).toBe('active'));
  // CodeMirror açılıştan sonraki ilk 75 ms'deki Enter'ı seçim saymaz (`interactionDelay`).
  await new Promise((r) => setTimeout(r, 100));
}

describe('ScriptEditoru: tamamlama', () => {
  it('Ctrl+Space motorun önerilerini açar: FROM sonrası yalnızca ilişkiler (lang-sql anahtar kelimesi yok)', async () => {
    const view = editor('SELECT * FROM |');
    await ctrlSpace(view);
    expect(currentCompletions(view.state).map((c) => c.label)).toEqual(['customer_orders', 'customers']);
  });

  it('katalog yokken de anahtar kelimeler önerilir', async () => {
    const view = editor('sel|', null);
    await ctrlSpace(view);
    expect(currentCompletions(view.state).map((c) => c.label)).toContain('select');
  });

  it('Enter seçili öneriyi imleçteki kelimenin önüne ekler', async () => {
    const view = editor('SELECT * FROM cu|stomers_eski');
    await ctrlSpace(view);
    const secili = selectedCompletion(view.state)!.label;
    tus(view, 'Enter');
    expect(view.state.doc.toString()).toBe(`SELECT * FROM ${secili}stomers_eski`);
  });

  it('popup açıkken Tab imleçteki kelimenin tamamını değiştirir', async () => {
    const view = editor('SELECT * FROM cu|stomers_eski WHERE true');
    await ctrlSpace(view);
    const secili = selectedCompletion(view.state)!.label;
    tus(view, 'Tab');
    expect(view.state.doc.toString()).toBe(`SELECT * FROM ${secili} WHERE true`);
    expect(view.state.selection.main.head).toBe(`SELECT * FROM ${secili}`.length);
  });

  it('fonksiyon seçilince ad() eklenir ve imleç parantezin içine konur', async () => {
    const katalog = { ...KATALOG, fonksiyonlar: [{ sema: 'public', ad: 'topla', tur: 'f' as const, argumanlar: 'a integer', donus: 'integer', kumeDondurur: false, aciklama: null }] };
    const view = editor('SELECT topl|', { katalog, gorunurSemalar: ['public'] });
    await ctrlSpace(view);
    expect(selectedCompletion(view.state)!.label).toBe('topla');
    tus(view, 'Enter');
    expect(view.state.doc.toString()).toBe('SELECT topla()');
    expect(view.state.selection.main.head).toBe('SELECT topla('.length);
  });

  it('popup kapalıyken Tab tamamlamaya dokunmaz', () => {
    const view = editor('SELECT * FROM cu|');
    tus(view, 'Tab');
    expect(view.state.doc.toString()).toBe('SELECT * FROM cu');
    expect(completionStatus(view.state)).toBeNull();
  });
});
