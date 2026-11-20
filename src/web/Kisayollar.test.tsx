import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { setEditorScript } from './test/eylemler';
import { connection, createFakeConnections, createFakeScriptRuns, renderWithApi } from './test/sahte-api';

async function setup({ target = true }: { target?: boolean } = {}) {
  const user = userEvent.setup();
  const runs = createFakeScriptRuns();
  const fake = createFakeConnections([connection({ databaseSelection: [{ database: 'postgres', schemas: null }] })]);
  fake.api.runScript = runs.runScript;
  renderWithApi(<App />, fake.api);
  await screen.findByText('Yerel', { selector: '.baglanti-adi' });
  if (target) {
    // Paletteki ilk hedef: aktif sekmenin hedefi olur.
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Enter}');
  }
  const palette = () => screen.getByRole('dialog', { name: 'Hızlı geçiş' });
  const command = async (name: string) => {
    await user.keyboard('{Control>}k{/Control}');
    // Seçeneğin adı etiket, not ve kısayolun birleşimidir; etiket tam eşleşmeyle bulunur.
    return within(palette()).getByText(name, { exact: true }).closest<HTMLElement>('[role="option"]')!;
  };
  return { user, runs, palette, command };
}

const tabs = () => screen.getAllByRole('tab');
const shortcutsPage = () => screen.queryByRole('dialog', { name: 'Kısayollar' });

describe('Cmd/Ctrl+K paleti: konsol komutları', () => {
  it('"Yeni konsol" yeni sekme açar', async () => {
    const { user, command } = await setup();
    const before = tabs().length;
    await user.click(await command('Yeni konsol'));
    expect(tabs()).toHaveLength(before + 1);
    expect(tabs().at(-1)).toHaveAttribute('aria-selected', 'true');
  });

  it('komutun yanında katalogdaki kısayolu yazar', async () => {
    const { command, palette } = await setup();
    expect(await command('Çalıştır')).toHaveTextContent('Ctrl+Enter');
    expect(within(palette()).getByText('Tümünü dene', { exact: true }).closest('[role="option"]')).toHaveTextContent('Ctrl+Alt+Shift+Enter');
  });

  it('hedefsiz sekmede Çalıştır pasif ve nedeni yazar', async () => {
    const { command } = await setup({ target: false });
    const run = await command('Çalıştır');
    expect(run).toHaveAttribute('aria-disabled', 'true');
    expect(run).toHaveTextContent('hedef seçilmedi');
  });

  it('"Çalıştır" etkin sekmenin Çalışacak aralığını çalıştırır', async () => {
    const { user, runs, command } = await setup();
    setEditorScript('SELECT 1;');
    await user.click(await command('Çalıştır'));
    await waitFor(() => expect(runs.runs).toHaveLength(1));
    expect(runs.last()).toMatchObject({ script: 'SELECT 1;', deneme: false });
  });
});

describe('Kısayol sayfası', () => {
  it('paletteki "Kısayollar" sayfayı gruplu açar; Esc kapatır', async () => {
    const { user, command } = await setup();
    await user.click(await command('Kısayollar'));
    const page = shortcutsPage()!;
    expect(page).toBeInTheDocument();
    expect(within(page).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Genel',
      'Editör',
      'Grid',
      'Tablo sekmesi',
      'Palet',
    ]);
    const general = within(page).getByRole('table', { name: 'Genel' });
    expect(within(general).getByRole('row', { name: /Hızlı geçiş ve komutlar/ })).toHaveTextContent('Ctrl+K');
    await user.keyboard('{Escape}');
    expect(shortcutsPage()).not.toBeInTheDocument();
  });

  it('? editörde yazılınca sayfa açılmaz, metne girer', async () => {
    const { user } = await setup();
    const editor = screen.getByRole('region', { name: 'Script editörü' }).querySelector<HTMLElement>('.cm-content')!;
    await user.click(editor);
    await user.keyboard('?');
    expect(shortcutsPage()).not.toBeInTheDocument();
  });

  it('? gezgindeyken sayfayı açar', async () => {
    const { user } = await setup();
    screen.getByText('Yerel', { selector: '.baglanti-adi' }).closest('button')!.focus();
    await user.keyboard('?');
    expect(shortcutsPage()).toBeInTheDocument();
  });

  it('? bir metin alanındayken açılmaz', async () => {
    const { user } = await setup();
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('?');
    expect(shortcutsPage()).not.toBeInTheDocument();
  });
});
