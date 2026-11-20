import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { setEditorCursor, setEditorScript } from './test/eylemler';
import { connection, createFakeConnections, createFakeScriptRuns, renderWithApi } from './test/sahte-api';

const DK = 60_000;

async function setup() {
  const user = userEvent.setup();
  const runs = createFakeScriptRuns();
  const fake = createFakeConnections([connection({ envTag: 'dev', databaseSelection: [{ database: 'postgres', schemas: null }] })]);
  fake.api.runScript = runs.runScript;
  fake.history = [];
  renderWithApi(<App />, fake.api);
  await screen.findByText('Yerel', { selector: '.baglanti-adi' });
  return { user, runs };
}

/** Ctrl/Cmd+K ile ilk hedef seçilir. */
async function chooseTarget(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Control>}k{/Control}');
  await user.keyboard('{Enter}');
}

const bar = () => screen.getByRole('contentinfo', { name: 'Durum çubuğu' });

describe('Durum çubuğu', () => {
  it('hedef yokken Bağlı değil; hedef seçilince hedef, ortam ve Hazır', async () => {
    const { user } = await setup();
    expect(bar()).toHaveTextContent('Bağlı değil');
    await chooseTarget(user);
    expect(within(bar()).getByText('Yerel / postgres')).toBeInTheDocument();
    expect(within(bar()).getByText('dev')).toBeInTheDocument();
    expect(within(bar()).getByRole('status', { name: 'Transaction durumu' })).toHaveTextContent('Hazır');
    expect(bar()).not.toHaveTextContent(/Salt okunur|Yazma açık/);
  });

  it('karar beklenirken kalan süreyi, son çalıştırmanın süresini ve satır sayısını gösterir', async () => {
    const { user, runs } = await setup();
    await chooseTarget(user);
    setEditorScript('UPDATE t SET a = 1');
    await user.click(screen.getByRole('button', { name: 'Çalıştır' }));
    expect(within(bar()).getByRole('status', { name: 'Transaction durumu' })).toHaveTextContent('Çalışıyor 0/1');
    runs.last().emit({ type: 'done', i: 0, rowCount: 7, ms: 12, komut: 'UPDATE' }, { type: 'kararBekleniyor', commitEdilebilir: true, kalanMs: 30 * DK });
    expect(within(bar()).getByRole('status', { name: 'Transaction durumu' })).toHaveTextContent('Karar bekleniyor · 30:00');
    expect(bar()).toHaveTextContent('12 ms · 7 satır');
    runs.last().emit({ type: 'bitti', sonuc: 'commit' });
    expect(within(bar()).getByRole('status', { name: 'Transaction durumu' })).toHaveTextContent('Hazır');
  });

  it('grid’de seçim yapınca hücre sayısı, sayısal toplam ve ortalama görünür', async () => {
    const { user, runs } = await setup();
    await chooseTarget(user);
    setEditorScript('SELECT n, ad FROM t');
    await user.click(screen.getByRole('button', { name: 'Çalıştır' }));
    const onizleme = { kolonlar: ['n', 'ad'], tipler: [1700, 25], satirlar: [['10000000000000000000.5', 'a'], [null, 'b'], ['1', 'c']], dahaVar: false };
    runs.last().emit({ type: 'done', i: 0, rowCount: 3, ms: 1, komut: 'SELECT', onizleme }, { type: 'bitti', sonuc: 'commit' });
    expect(bar()).not.toHaveTextContent('hücre');

    const grid = screen.getByRole('grid', { name: /sonucu$/ });
    await user.click(within(grid).getAllByRole('gridcell')[0]!);
    await user.keyboard('{Shift>}{ArrowDown}{ArrowDown}{ArrowRight}{/Shift}');
    const ozet = within(bar()).getByLabelText('Seçim özeti');
    expect(ozet).toHaveTextContent('6 hücre');
    expect(ozet).toHaveTextContent('Toplam 10000000000000000001.5');
    expect(ozet).toHaveTextContent('Ortalama 5000000000000000000.75');
  });

  it('imleçte çalışacak ifade yoksa geri bildirim durum çubuğunda görünür', async () => {
    const { user, runs } = await setup();
    await chooseTarget(user);
    setEditorScript('-- not\nSELECT 1;');
    setEditorCursor('-- not');
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(runs.runs).toHaveLength(0);
    expect(within(bar()).getByRole('status', { name: 'Çalıştırma bildirimi' })).toHaveTextContent('İmleçte çalışacak ifade yok');
  });

  it('sürümü gösterir', async () => {
    await setup();
    expect(await within(bar()).findByText(/^v\d/)).toBeInTheDocument();
  });
});

describe('Sorgu geçmişi çekmecesi', () => {
  const drawer = () => screen.queryByRole('complementary', { name: 'Sorgu geçmişi' });

  it('hedef başlığındaki düğme açar; Esc ve dışına tıklama kapatır; editör yerinde kalır', async () => {
    const { user } = await setup();
    await chooseTarget(user);
    const editor = screen.getByRole('region', { name: 'Script editörü' });
    await user.click(within(screen.getByRole('region', { name: 'Hedef' })).getByRole('button', { name: 'Sorgu geçmişi' }));
    expect(drawer()).toBeInTheDocument();
    expect(drawer()!.closest('.konsol-ekrani')).toBeNull();
    expect(screen.getByRole('region', { name: 'Script editörü' })).toBe(editor);

    await user.keyboard('{Escape}');
    expect(drawer()).not.toBeInTheDocument();

    await user.click(within(screen.getByRole('region', { name: 'Hedef' })).getByRole('button', { name: 'Sorgu geçmişi' }));
    expect(drawer()).toBeInTheDocument();
    await user.click(drawer()!);
    expect(drawer()).toBeInTheDocument();
    await user.click(editor);
    expect(drawer()).not.toBeInTheDocument();
  });
});

describe('Araç çubuğu taşması', () => {
  const widths: PropertyDescriptor[] = [];
  afterEach(() => {
    const [client, offset] = widths.splice(0);
    if (client) Object.defineProperty(HTMLElement.prototype, 'clientWidth', client);
    if (offset) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offset);
  });

  /** jsdom'da yerleşim yok: araç çubuğu 300 px, her öğe 100 px sayılır. */
  function narrowToolbar() {
    widths.push(
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')!,
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!,
    );
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('script-cubugu') ? 300 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.parentElement?.classList.contains('script-cubugu') ? 100 : 0;
      },
    });
  }

  it('dar araç çubuğunda ikincil eylem "⋯" menüsünden çalışır; Çalıştır ve Dene görünür kalır', async () => {
    narrowToolbar();
    const { user, runs } = await setup();
    await chooseTarget(user);
    setEditorScript('SELECT 1;\nSELECT 2');
    fireEvent(window, new Event('resize'));
    const toolbar = screen.getByRole('toolbar', { name: 'Çalıştırma' });
    expect(within(toolbar).queryByRole('button', { name: 'Tümünü çalıştır' })).not.toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Çalıştır' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Dene' })).toBeInTheDocument();

    await user.click(within(toolbar).getByRole('button', { name: 'Diğer eylemler' }));
    await user.click(screen.getByRole('menuitem', { name: 'Tümünü çalıştır' }));
    expect(runs.last().script).toBe('SELECT 1;\nSELECT 2');
  });
});
