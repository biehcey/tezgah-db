import { completionStatus, currentCompletions, selectedCompletion } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

/** Metni ve salt okunurluğu dışarıdan verilen editör; `rerender` salt okunurluğu değiştirir. */
function kontrolluEditor(value: string, { onChange = () => {}, readOnly = false }: { onChange?: (v: string) => void; readOnly?: boolean } = {}) {
  const ciz = (ro: boolean) => <ScriptEditoru value={value} onChange={onChange} readOnly={ro} marks={BOS_ISARETLER} />;
  const { container, rerender } = render(ciz(readOnly));
  const view = EditorView.findFromDOM(container.querySelector('.cm-content') as HTMLElement)!;
  view.focus();
  return { view, saltOkunur: (ro: boolean) => rerender(ciz(ro)) };
}
const BOS_ISARETLER = { lines: new Map(), error: null };

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

describe('ScriptEditoru: ara/değiştir', () => {
  it('Ctrl/Cmd+F Türkçe etiketli arama panelini açar', () => {
    const view = editor('SELECT 1|');
    tus(view, 'f', { ctrlKey: true });
    expect(screen.getByRole('textbox', { name: 'Ara' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Değiştir' })).toBeInTheDocument();
    for (const ad of ['Sonraki', 'Önceki', 'Tümünü seç', 'Değiştir', 'Tümünü değiştir']) {
      expect(screen.getByRole('button', { name: ad })).toBeInTheDocument();
    }
    for (const ad of ['Büyük/küçük harf', 'Düzenli ifade', 'Tam kelime']) {
      expect(screen.getByRole('checkbox', { name: ad })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Kapat' })).toBeInTheDocument();
  });

  it('Tümünü değiştir editör metnini değiştirir ve bildirir', () => {
    const onChange = vi.fn();
    const { view } = kontrolluEditor('SELECT a, a FROM t', { onChange });
    tus(view, 'f', { ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox', { name: 'Ara' }), { target: { value: 'a' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Değiştir' }), { target: { value: 'b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tümünü değiştir' }));
    expect(view.state.doc.toString()).toBe('SELECT b, b FROM t');
    expect(onChange).toHaveBeenLastCalledWith('SELECT b, b FROM t');
  });

  it('salt okunurken arama çalışır, değiştirme yoktur', () => {
    const { view } = kontrolluEditor('SELECT a FROM t', { readOnly: true });
    tus(view, 'f', { ctrlKey: true });
    expect(screen.queryByRole('textbox', { name: 'Değiştir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tümünü değiştir' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Ara' }), { target: { value: 'FROM' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
    const { from, to } = view.state.selection.main;
    expect(view.state.sliceDoc(from, to)).toBe('FROM');
  });

  it('panel açıkken çalışma başlayınca değiştirme kalkar, bitince geri gelir; arama korunur', async () => {
    const { view, saltOkunur } = kontrolluEditor('SELECT a FROM t');
    tus(view, 'f', { ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox', { name: 'Ara' }), { target: { value: 'FROM' } });
    saltOkunur(true);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Değiştir' })).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Ara' })).toHaveValue('FROM');
    saltOkunur(false);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Değiştir' })).toBeInTheDocument());
  });
});

/** Klavyeden yazılmış gibi ekler: önce editörün girdi işleyicileri (otomatik kapanış), yoksa düz ekleme. */
function yaz(view: EditorView, metin: string) {
  for (const ch of metin) {
    const { from, to } = view.state.selection.main;
    const ekle = () => view.state.update({ changes: { from, to, insert: ch }, selection: { anchor: from + 1 } });
    if (!view.state.facet(EditorView.inputHandler).some((h) => h(view, from, to, ch, ekle))) view.dispatch(ekle());
  }
}

describe('ScriptEditoru: otomatik kapanış', () => {
  it.each([
    ['(', '()'],
    ['[', '[]'],
    ["'", "''"],
    ['"', '""'],
  ])('%s yazınca kapanışı eklenir, imleç arada kalır', (acilis, beklenen) => {
    const view = editor('SELECT |');
    yaz(view, acilis);
    expect(view.state.doc.toString()).toBe(`SELECT ${beklenen}`);
    expect(view.state.selection.main.head).toBe('SELECT '.length + 1);
  });

  it(') yazınca kapanış çiftlenmez', () => {
    const view = editor('SELECT count|');
    yaz(view, '(*)');
    expect(view.state.doc.toString()).toBe('SELECT count(*)');
    expect(view.state.selection.main.head).toBe('SELECT count(*)'.length);
  });

  it('{ için kapanış eklenmez', () => {
    const view = editor('SELECT |');
    yaz(view, '{');
    expect(view.state.doc.toString()).toBe('SELECT {');
  });
});
