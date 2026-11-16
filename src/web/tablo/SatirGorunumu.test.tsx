import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Catalog } from '../../core/katalog';
import { TABS_VERSION, type SavedTabs } from '../../core/konsol-sekmeleri';
import type { TablePageResponse } from '../../core/tablo-sayfasi';
import { App } from '../App';
import { GridOlcumu } from '../grid/olcum';
import { SonucGovdesi } from '../grid/SonucGovdesi';
import { JSDOM_OLCUMU } from '../test/grid';
import { connection, createFakeConnections, createFakeScriptRuns, emptyCatalog, renderWithApi } from '../test/sahte-api';

const DEV = connection({ id: 'd1', name: 'Yerel', databaseSelection: [{ database: 'postgres', schemas: null }] });
const CATALOG: Catalog = emptyCatalog({ semalar: ['public'] });

const page = (overrides: Partial<TablePageResponse> = {}): TablePageResponse => ({
  kolonlar: ['id', 'ad', 'notlar'],
  tipler: [23, 25, 25],
  pk: ['id'],
  uretilmis: [],
  satirlar: [
    ['1', 'Ali', 'satır 1\nsatır 2'],
    ['2', 'Ayşe', null],
  ],
  sonraki: null,
  tutarlilikNotu: false,
  ...overrides,
});

/** `users` Tablo sekmesi geri gelmiş olarak açılır; "Yükle" ile ilk sayfa çekilir. */
async function setup(firstPage = page()) {
  const user = userEvent.setup();
  const fake = createFakeConnections([structuredClone(DEV)]);
  const tabs: SavedTabs = {
    version: TABS_VERSION,
    sekmeler: [{ id: 't1', tur: 'tablo', hedef: { connectionId: DEV.id, database: 'postgres', schema: 'public' }, sema: 'public', tablo: 'users', where: '', orderBy: '' }],
    aktif: 't1',
  };
  fake.savedTabs = tabs;
  fake.catalogs.set(`${DEV.id}/postgres`, CATALOG);
  fake.tablePage = async () => firstPage;
  fake.api.runScript = createFakeScriptRuns().runScript;
  renderWithApi(<App />, fake.api);
  await screen.findByRole('region', { name: 'public.users tablosu' });
  await user.click(t().getByRole('button', { name: 'Yükle' }));
  await within(tableTab()).findByRole('grid');
  return { user };
}

const tableTab = () => screen.getByRole('region', { name: 'public.users tablosu' });
const t = () => within(tableTab());
const cell = (r: number, c: number) => {
  const row = t().getByRole('grid').querySelector(`[role="row"][aria-rowindex="${r + 2}"]`) as HTMLElement;
  return within(row).getAllByRole('gridcell')[c]!;
};
const panel = () => t().getByRole('complementary', { name: 'Satır görünümü' });
const p = () => within(panel());
const field = (ad: string) => p().getByRole('textbox', { name: ad });
const sqlLines = () => t().getByRole('region', { name: 'SQL önizlemesi' }).querySelector('pre')?.textContent?.split('\n') ?? [];

async function openOn(user: ReturnType<typeof userEvent.setup>, r: number) {
  await user.click(cell(r, 1));
  await user.keyboard('{Shift>}{Enter}{/Shift}');
}

describe('Satır görünümü: açma ve kapama', () => {
  it('grid’de Shift+Enter açar ve kapatır; açıkken Esc kapatır; ◧ da açar/kapatır', async () => {
    const { user } = await setup();
    expect(t().queryByRole('complementary', { name: 'Satır görünümü' })).not.toBeInTheDocument();

    await openOn(user, 0);
    expect(panel()).toBeInTheDocument();
    expect(cell(0, 1)).toHaveFocus();
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(t().queryByRole('complementary', { name: 'Satır görünümü' })).not.toBeInTheDocument();

    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.keyboard('{Escape}');
    expect(t().queryByRole('complementary', { name: 'Satır görünümü' })).not.toBeInTheDocument();

    const toggle = t().getByRole('button', { name: 'Satır görünümü' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(panel()).toBeInTheDocument();
    await user.click(toggle);
    expect(t().queryByRole('complementary', { name: 'Satır görünümü' })).not.toBeInTheDocument();
  });

  it('düzenleyicideki Shift+Enter yeni satırdır, paneli açmaz', async () => {
    const { user } = await setup();
    await user.click(cell(0, 1));
    await user.keyboard('{F2}{Shift>}{Enter}{/Shift}x');
    expect(t().getByRole('textbox', { name: 'ad değeri' })).toHaveValue('Ali\nx');
    expect(t().queryByRole('complementary', { name: 'Satır görünümü' })).not.toBeInTheDocument();
  });
});

describe('Satır görünümü: Satır sekmesi', () => {
  it('her kolonun adı, tipi, PK işareti ve kırpılmamış değeri; NULL yer tutucu', async () => {
    const { user } = await setup();
    await openOn(user, 0);
    expect(p().getByRole('tab', { name: 'Satır' })).toHaveAttribute('aria-selected', 'true');
    expect(p().getByRole('tab', { name: 'Değişiklikler (0)' })).toBeInTheDocument();
    expect(panel()).toHaveTextContent('idPKinteger');
    expect(panel()).toHaveTextContent('adtext');
    expect(field('notlar')).toHaveValue('satır 1\nsatır 2');

    await user.click(cell(1, 0));
    expect(field('notlar')).toHaveValue('');
    expect(field('notlar')).toHaveAttribute('placeholder', 'NULL');
  });

  it('seçim değişince yeni satırı gösterir; çok hücreli seçimde aktif hücrenin satırı', async () => {
    const { user } = await setup();
    await openOn(user, 0);
    expect(field('ad')).toHaveValue('Ali');
    await user.keyboard('{ArrowDown}');
    expect(field('ad')).toHaveValue('Ayşe');
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(field('ad')).toHaveValue('Ali');
  });

  it('alanı değiştirip Enter bekleyen değişiklik olur ve grid’deki renkle işaretlenir', async () => {
    const { user } = await setup();
    await openOn(user, 0);
    await user.clear(field('ad'));
    await user.type(field('ad'), 'Veli{Enter}');
    expect(sqlLines()).toEqual([`UPDATE "public"."users" SET "ad" = 'Veli'::text WHERE "id" = '1'::integer;`]);
    expect(cell(0, 1)).toHaveTextContent('Veli');
    expect(field('ad').closest('.satir-alani')).toHaveClass('degisti');
    expect(p().getByRole('tab', { name: 'Değişiklikler (1)' })).toBeInTheDocument();
  });

  it('alandan çıkmak kaydeder; Esc yazılanı atar; dokunulmayan alan kaydedilmez', async () => {
    const { user } = await setup();
    await openOn(user, 1);
    await user.click(field('notlar'));
    await user.tab();
    expect(t().queryByRole('region', { name: 'SQL önizlemesi' })).not.toBeInTheDocument();

    await user.type(field('ad'), 'x{Escape}');
    expect(field('ad')).toHaveValue('Ayşe');
    await user.type(field('ad'), 'n');
    await user.click(cell(0, 0));
    expect(sqlLines()).toEqual([`UPDATE "public"."users" SET "ad" = 'Ayşen'::text WHERE "id" = '2'::integer;`]);
    expect(field('ad')).toHaveValue('Ali');
  });

  it('“NULL yap” alanı NULL yapar', async () => {
    const { user } = await setup();
    await openOn(user, 0);
    await user.click(p().getByRole('button', { name: 'notlar: NULL yap' }));
    expect(sqlLines()).toEqual([`UPDATE "public"."users" SET "notlar" = NULL WHERE "id" = '1'::integer;`]);
    expect(field('notlar')).toHaveAttribute('placeholder', 'NULL');
    expect(p().queryByRole('button', { name: 'notlar: NULL yap' })).not.toBeInTheDocument();
  });

  it('yüklü satırın PK’sı salt okunur ve nedeni yazar; eklenen satırınki yazılır, dokunulmayan alan DEFAULT', async () => {
    const { user } = await setup();
    await openOn(user, 0);
    expect(field('id')).toHaveAttribute('readonly');
    expect(field('id')).toHaveAccessibleDescription('Birincil anahtar (PK) yüklü satırda düzenlenmez');
    expect(p().queryByRole('button', { name: 'id: NULL yap' })).not.toBeInTheDocument();

    await user.click(t().getByRole('button', { name: '+ Satır' }));
    expect(panel()).toHaveTextContent('Yeni satır');
    expect(field('id')).not.toHaveAttribute('readonly');
    expect(field('ad')).toHaveAttribute('placeholder', 'DEFAULT');
  });

  it('Sil satırı silinecek yapar ve alanları kilitler; Geri al silmeyi geri alır', async () => {
    const { user } = await setup();
    await openOn(user, 1);
    await user.click(p().getByRole('button', { name: 'Sil' }));
    expect(sqlLines()).toEqual([`DELETE FROM "public"."users" WHERE "id" = '2'::integer;`]);
    expect(panel()).toHaveTextContent('Silinecek satır düzenlenemez; önce silmeyi geri alın.');
    expect(field('ad')).toHaveAttribute('readonly');

    await user.click(p().getByRole('button', { name: '↶ Geri al' }));
    expect(t().queryByRole('region', { name: 'SQL önizlemesi' })).not.toBeInTheDocument();
    expect(field('ad')).not.toHaveAttribute('readonly');
  });

  it('Değişiklikler sekmesi çekmecedeki bekleyen listesinin aynısı', async () => {
    const { user } = await setup();
    await openOn(user, 0);
    await user.type(field('ad'), '!{Enter}');
    await user.click(p().getByRole('tab', { name: 'Değişiklikler (1)' }));
    expect(p().getByRole('list', { name: 'Bekleyen değişiklikler' })).toHaveTextContent('id = 1 · ad');
  });

  it('PK’sız tabloda salt okunur açılır; nedeni yazar, NULL yap ve Sil yok', async () => {
    const { user } = await setup(page({ pk: [] }));
    await openOn(user, 0);
    expect(panel()).toHaveTextContent('Düzenleme kapalı: tablonun birincil anahtarı (PK) yok');
    expect(field('ad')).toHaveAttribute('readonly');
    expect(field('notlar')).toHaveValue('satır 1\nsatır 2');
    expect(p().queryByRole('button', { name: /NULL yap|Sil/ })).not.toBeInTheDocument();
    expect(p().queryByRole('tab', { name: /Değişiklikler/ })).not.toBeInTheDocument();
  });
});

describe('Satır görünümü: konsol sonucu', () => {
  it('Shift+Enter salt okunur görünümü açar; yalnızca tam değeri gösterir', async () => {
    const user = userEvent.setup();
    render(
      <GridOlcumu.Provider value={JSDOM_OLCUMU}>
        <SonucGovdesi etiket="Sonuç 1" kolonlar={['a']} satirlar={[['uzun\ndeğer']]} toplamSatir={1} />
      </GridOlcumu.Provider>,
    );
    const grid = screen.getByRole('grid', { name: 'Sonuç 1' });
    await user.click(within(grid).getAllByRole('gridcell')[0]!);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    const view = within(screen.getByRole('complementary', { name: 'Satır görünümü' }));
    expect(view.getByRole('textbox', { name: 'a' })).toHaveValue('uzun\ndeğer');
    expect(view.getByRole('textbox', { name: 'a' })).toHaveAttribute('readonly');
    expect(view.getByRole('note')).toHaveTextContent('Konsol sonuçları salt okunur');
    expect(view.queryByRole('button', { name: /NULL yap|Sil/ })).not.toBeInTheDocument();
  });
});
