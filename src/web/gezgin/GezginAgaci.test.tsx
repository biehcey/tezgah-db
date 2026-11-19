import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { editConnection, editorScript, tabTitle } from '../test/eylemler';
import { connection, createFakeConnections, emptyCatalog, renderWithApi, type FakeConnections } from '../test/sahte-api';

const nav = () => screen.getByRole('navigation', { name: 'Bağlantılar' });
/** Açık (tek) bağlantının veritabanları. */
const panel = () => screen.getByRole('region', { name: / veritabanları$/ });
const header = () => screen.getByRole('region', { name: 'Hedef' });
const tabs = () => within(screen.getByRole('tablist', { name: 'Konsol sekmeleri' })).getAllByRole('tab');

/** Ağaçtaki bağlantı satırı; satır düğmesi, ⟳ ve ⋯ menüsü içinde. */
const rowOf = (name: string) => within(nav()).getByText(name, { selector: '.baglanti-adi' }).closest<HTMLElement>('.dugum-satiri')!;

function setup(fake: FakeConnections = createFakeConnections([connection()])) {
  const user = userEvent.setup();
  renderWithApi(<App />, fake.api);
  return { user, fake };
}

async function selectConnection(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await within(nav()).findByRole('button', { name: new RegExp(name) }));
}

function withServer(fake: FakeConnections, id = 'b1') {
  fake.servers.set(id, {
    databases: {
      postgres: ['information_schema', 'pg_catalog', 'pg_toast', 'public'],
      app: ['information_schema', 'pg_catalog', 'public', 'raporlar'],
      analitik: ['public'],
    },
  });
  return fake;
}

describe('Gezgin ağacı: bağlanmamış bağlantı', () => {
  it('bağlantıya tıklayınca açılır, kayıtlı seçim görünür ve hiçbir sunucuya bağlanılmaz', async () => {
    const { user, fake } = setup(
      createFakeConnections([
        connection({
          databaseSelection: [
            { database: 'postgres', schemas: null },
            { database: 'app', schemas: ['public'] },
          ],
        }),
      ]),
    );
    expect(screen.queryByRole('region', { name: 'Yerel veritabanları' })).not.toBeInTheDocument();
    await selectConnection(user, 'Yerel');
    expect(within(rowOf('Yerel')).getByRole('button', { name: /Yerel/ })).toHaveAttribute('aria-expanded', 'true');
    const p = within(panel());
    expect(p.getByRole('button', { name: 'postgres' })).toBeInTheDocument();
    expect(p.getByRole('button', { name: 'app' })).toBeInTheDocument();
    expect(p.getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' })).toBeInTheDocument();
    expect(fake.databaseRequests).toEqual([]);
  });

  it('bağlanmadan bir veritabanına tıklamak onu hedef yapar', async () => {
    const { user, fake } = setup();
    // Sekmeler açılışta dosyadan okunur; hedef başlığı ilk sekmeyle gelir.
    expect(within(await screen.findByRole('region', { name: 'Hedef' })).getByText('Hedef seçilmedi')).toBeInTheDocument();
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'postgres' }));
    expect(within(header()).getByRole('heading')).toHaveTextContent('Yerel / postgres');
    expect(within(panel()).getByRole('button', { name: 'postgres' })).toHaveAttribute('aria-current', 'true');
    expect(within(rowOf('Yerel')).getByText('● hedef')).toBeInTheDocument();
    expect(fake.databaseRequests).toEqual([]);
  });
});

describe('Gezgin ağacı: aç/kapa', () => {
  it('ok tıklaması ve ←/→ bağlantıyı kapatıp açar; yeniden tıklamak kapatmaz', async () => {
    const { user } = setup();
    await selectConnection(user, 'Yerel');
    const row = within(rowOf('Yerel')).getByRole('button', { name: /Yerel/ });
    await user.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    await user.click(row.querySelector('.agac-oku')!);
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Yerel veritabanları' })).not.toBeInTheDocument();
    row.focus();
    await user.keyboard('{ArrowRight}');
    expect(panel()).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(row).toHaveAttribute('aria-expanded', 'false');
  });

  it('Ctrl/Cmd+B gezgini gizler; ince “» Gezgin” şeridi geri açar ve ağaç durumu korunur', async () => {
    const { user } = setup();
    await selectConnection(user, 'Yerel');
    await user.keyboard('{Control>}b{/Control}');
    expect(screen.queryByRole('navigation', { name: 'Bağlantılar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gezgini aç' }));
    expect(panel()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gezgini gizle' }));
    expect(screen.getByRole('button', { name: 'Gezgini aç' })).toBeInTheDocument();
    await user.keyboard('{Meta>}b{/Meta}');
    expect(nav()).toBeInTheDocument();
  });
});

describe('Gezgin ağacı: şemalar, tablolar ve arama', () => {
  function withCatalog() {
    const fake = withServer(createFakeConnections([connection({ databaseSelection: [{ database: 'app', schemas: null }] }), connection({ id: 'b2', name: 'Analiz' })]));
    const rel = (sema: string, ad: string, reltuples: number) => ({ sema, ad, tur: 'r' as const, kolonlar: [], pk: [], reltuples });
    fake.catalogs.set(
      'b1/app',
      emptyCatalog({ semalar: ['public', 'raporlar'], iliskiler: [rel('public', 'musteri', 12_345), rel('public', 'siparis', -1), rel('raporlar', 'aylik', 40)] }),
    );
    return fake;
  }

  async function openSchemas(user: ReturnType<typeof userEvent.setup>) {
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));
    await user.click(await within(panel()).findByRole('button', { name: 'app şemaları' }));
    return within(await within(panel()).findByRole('group', { name: 'app şemaları' }));
  }

  it('şema açılınca tabloları tahmini satır sayısıyla listelenir; tıklayınca Tablo sekmesinde açılır', async () => {
    const { user } = setup(withCatalog());
    const schemas = await openSchemas(user);
    await user.click(schemas.getByRole('button', { name: 'public' }));
    const tables = within(await within(panel()).findByRole('list', { name: 'public tabloları' }));
    expect(tables.getByRole('button', { name: 'musteri' })).toHaveTextContent('≈12k');
    // Hiç analiz edilmemiş tabloda sayı yok.
    expect(tables.getByRole('button', { name: 'siparis' }).textContent).toBe('▦siparis');
    await user.click(tables.getByRole('button', { name: 'musteri' }));
    expect(await screen.findByRole('region', { name: 'public.musteri tablosu' })).toBeInTheDocument();
  });

  it('veritabanına sağ tık: "Yeni konsol" o veritabanında yeni konsol sekmesi açar, aktif sekmenin hedefi değişmez', async () => {
    const { user } = setup(withCatalog());
    await openSchemas(user);
    const before = tabs().length;
    await user.pointer({ keys: '[MouseRight]', target: within(panel()).getByRole('button', { name: 'app' }) });
    await user.click(screen.getByRole('menuitem', { name: 'Yeni konsol' }));
    expect(tabs()).toHaveLength(before + 1);
    expect(tabTitle(tabs().find((t) => t.getAttribute('aria-selected') === 'true')!)).toBe('Yerel / app');
    expect(within(header()).getByRole('heading')).toHaveTextContent('Yerel / app');
    expect(editorScript()).toBe('');
  });

  it('veritabanı menüsünde "Hedef yap" ve "Adı kopyala"', async () => {
    const { user } = setup(withCatalog());
    await openSchemas(user);
    await user.pointer({ keys: '[MouseRight]', target: within(panel()).getByRole('button', { name: 'app' }) });
    await user.click(screen.getByRole('menuitem', { name: 'Adı kopyala' }));
    expect(await navigator.clipboard.readText()).toBe('app');
    await user.pointer({ keys: '[MouseRight]', target: within(panel()).getByRole('button', { name: 'app' }) });
    await user.click(screen.getByRole('menuitem', { name: 'Hedef yap' }));
    expect(within(header()).getByRole('heading')).toHaveTextContent('Yerel / app');
  });

  it('tabloya sağ tık: "Yeni konsolda SELECT" tablonun sorgusuyla yeni konsol açar; "Aç" Tablo sekmesinde açar', async () => {
    const { user } = setup(withCatalog());
    const schemas = await openSchemas(user);
    await user.click(schemas.getByRole('button', { name: 'public' }));
    const tables = within(await within(panel()).findByRole('list', { name: 'public tabloları' }));
    await user.pointer({ keys: '[MouseRight]', target: tables.getByRole('button', { name: 'musteri' }) });
    await user.click(screen.getByRole('menuitem', { name: 'Yeni konsolda SELECT' }));
    await waitFor(() => expect(editorScript()).toBe('SELECT * FROM public.musteri;'));
    expect(within(header()).getByRole('heading')).toHaveTextContent('Yerel / app');
    await user.pointer({ keys: '[MouseRight]', target: tables.getByRole('button', { name: 'musteri' }) });
    await user.click(screen.getByRole('menuitem', { name: 'Aç' }));
    expect(await screen.findByRole('region', { name: 'public.musteri tablosu' })).toBeInTheDocument();
  });

  it('arama eşleşen tablonun yolunu açar, diğerlerini gizler; bağlantı adıyla da eşleşir; Esc temizler', async () => {
    const { user } = setup(withCatalog());
    const schemas = await openSchemas(user);
    await user.click(schemas.getByRole('button', { name: 'public' }));
    await within(panel()).findByRole('button', { name: 'musteri' });
    await user.click(schemas.getByRole('button', { name: 'public' }));
    expect(within(panel()).queryByRole('button', { name: 'musteri' })).not.toBeInTheDocument();

    const box = screen.getByRole('searchbox', { name: 'Gezginde ara' });
    await user.type(box, 'MUS');
    expect(within(panel()).getByRole('button', { name: 'musteri' })).toBeInTheDocument();
    expect(within(panel()).queryByRole('button', { name: 'siparis' })).not.toBeInTheDocument();
    expect(within(panel()).queryByRole('button', { name: 'raporlar' })).not.toBeInTheDocument();
    expect(within(nav()).queryByText('Analiz')).not.toBeInTheDocument();

    await user.clear(box);
    await user.type(box, 'anal');
    expect(within(nav()).getByText('Analiz')).toBeInTheDocument();
    expect(within(nav()).queryByText('Yerel')).not.toBeInTheDocument();

    await user.type(box, 'zzz');
    expect(within(nav()).getByText(/Eşleşme yok/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(within(nav()).getByText('Yerel')).toBeInTheDocument();
    expect(within(nav()).getByText('Analiz')).toBeInTheDocument();
  });
});

describe('Gezgin ağacı: bağlanınca', () => {
  it('görünürler ⭐ ile üstte, diğerleri "Gizli (N)" altında; satırda bağlı işareti', async () => {
    const { user } = setup(withServer(createFakeConnections([connection()])));
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));

    const p = within(panel());
    expect(await p.findByRole('heading', { name: 'Gizli (2)' })).toBeInTheDocument();
    const visible = within(p.getByRole('list', { name: 'Görünür veritabanları' }));
    expect(visible.getByRole('button', { name: 'postgres' })).toBeInTheDocument();
    expect(visible.getByRole('button', { name: 'postgres görünürlükten çıkar' })).toBeInTheDocument();
    const hidden = within(p.getByRole('list', { name: 'Gizli veritabanları' }));
    expect(hidden.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('analitik'),
      expect.stringContaining('app'),
    ]);
    expect(within(rowOf('Yerel')).getByLabelText('bağlı')).toBeInTheDocument();
  });

  it('bağlanırken satırda ◌ görünür, düğme beklemeye geçer', async () => {
    let finish!: () => void;
    const fake = withServer(createFakeConnections([connection()]));
    const list = fake.api.listDatabases;
    fake.api.listDatabases = (id) => new Promise((resolve) => (finish = () => resolve(list(id))));
    const { user } = setup(fake);
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));
    expect(within(rowOf('Yerel')).getByLabelText('bağlanıyor')).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Bağlanıyor…' })).toBeDisabled();
    finish();
    expect(await within(rowOf('Yerel')).findByLabelText('bağlı')).toBeInTheDocument();
  });

  it('⭐ gizli veritabanını görünür, görünürü gizli yapar ve seçim kaydedilir', async () => {
    const { user, fake } = setup(withServer(createFakeConnections([connection()])));
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));

    await user.click(await within(panel()).findByRole('button', { name: 'app görünür yap' }));
    await waitFor(() =>
      expect(fake.connections[0]!.databaseSelection).toEqual([
        { database: 'postgres', schemas: null },
        { database: 'app', schemas: null },
      ]),
    );
    expect(within(panel()).getByRole('heading', { name: 'Gizli (1)' })).toBeInTheDocument();

    await user.click(within(panel()).getByRole('button', { name: 'postgres görünürlükten çıkar' }));
    await waitFor(() => expect(fake.connections[0]!.databaseSelection).toEqual([{ database: 'app', schemas: null }]));
    expect(within(panel()).getByRole('heading', { name: 'Gizli (2)' })).toBeInTheDocument();
  });

  it('şemalar açılıp kapanır; görünmeyenler tek satırda toplanır, görünürlük düğmesi görünürlüğü değiştirir', async () => {
    const { user, fake } = setup(
      withServer(
        createFakeConnections([
          connection({
            databaseSelection: [
              { database: 'postgres', schemas: null },
              { database: 'app', schemas: null },
            ],
          }),
        ]),
      ),
    );
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));
    const toggle = await within(panel()).findByRole('button', { name: 'app şemaları' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const chips = within(await within(panel()).findByRole('group', { name: 'app şemaları' }));
    expect(chips.getByRole('button', { name: 'public görünürlüğü' })).toHaveAttribute('aria-pressed', 'true');
    expect(chips.getByRole('button', { name: 'raporlar görünürlüğü' })).toHaveAttribute('aria-pressed', 'true');
    expect(chips.queryByRole('button', { name: 'pg_catalog görünürlüğü' })).not.toBeInTheDocument();

    // Sistem şemaları tek satırda; açılınca görünür yapılabilir, ama adları tablo listesi açmaz.
    await user.click(chips.getByRole('button', { name: '+ 2 gizli şema' }));
    expect(chips.getByRole('button', { name: 'pg_catalog görünürlüğü' })).toHaveAttribute('aria-pressed', 'false');
    expect(chips.queryByRole('button', { name: 'pg_catalog' })).not.toBeInTheDocument();
    await user.click(chips.getByRole('button', { name: 'raporlar görünürlüğü' }));
    await waitFor(() => expect(chips.getByRole('button', { name: 'raporlar görünürlüğü' })).toHaveAttribute('aria-pressed', 'false'));
    expect(chips.getByRole('button', { name: '+ 3 gizli şema' })).toBeInTheDocument();
    expect(fake.connections[0]!.databaseSelection).toEqual([
      { database: 'postgres', schemas: null },
      { database: 'app', schemas: ['public'] },
    ]);

    await user.click(toggle);
    expect(within(panel()).queryByRole('group', { name: 'app şemaları' })).not.toBeInTheDocument();
  });

  it('⟳ veritabanı listesini yeniler', async () => {
    const { user, fake } = setup(withServer(createFakeConnections([connection()])));
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));
    await within(panel()).findByRole('heading', { name: 'Gizli (2)' });
    fake.servers.get('b1')!.databases.yeni = ['public'];
    await user.click(within(rowOf('Yerel')).getByRole('button', { name: 'Yenile' }));
    expect(await within(panel()).findByRole('heading', { name: 'Gizli (3)' })).toBeInTheDocument();
  });
});

describe('Gezgin ağacı: bağlantı düzenlenince', () => {
  async function connected() {
    const ctx = setup(withServer(createFakeConnections([connection()])));
    await selectConnection(ctx.user, 'Yerel');
    await ctx.user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));
    await within(rowOf('Yerel')).findByLabelText('bağlı');
    await editConnection(ctx.user, /Yerel/);
    return { ...ctx, f: within(screen.getByRole('form', { name: /bağlantı/i })) };
  }

  it('yalnızca ad değişince bağlı kalır', async () => {
    const { user, f } = await connected();
    await user.type(f.getByLabelText('Ad'), ' 2');
    await user.click(f.getByRole('button', { name: 'Kaydet' }));
    expect(await within(rowOf('Yerel 2')).findByLabelText('bağlı')).toBeInTheDocument();
  });

  it('host değişince sunucu pool’ları kapattığı için bağlı değil görünür', async () => {
    const { user, f } = await connected();
    await user.type(f.getByLabelText('Host'), '.example');
    await user.click(f.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(within(rowOf('Yerel')).queryByLabelText('bağlı')).not.toBeInTheDocument());
    expect(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' })).toBeInTheDocument();
  });
});

describe('Gezgin ağacı: hata', () => {
  it('bağlanılamazsa mesaj, "Tekrar dene" ve "Düzenle" görünür; satırda ⚠', async () => {
    const { user, fake } = setup();
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));
    expect(await within(panel()).findByRole('alert')).toHaveTextContent('bağlantıyı reddetti');
    expect(within(rowOf('Yerel')).getByLabelText('bağlanamadı')).toBeInTheDocument();

    withServer(fake);
    await user.click(within(panel()).getByRole('button', { name: 'Tekrar dene' }));
    expect(await within(panel()).findByRole('heading', { name: 'Gizli (2)' })).toBeInTheDocument();
    expect(within(panel()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('"Düzenle" bağlantı formunu açar', async () => {
    const { user } = setup();
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' }));
    await user.click(await within(panel()).findByRole('button', { name: 'Düzenle' }));
    expect(screen.getByRole('form', { name: /bağlantı/i })).toBeInTheDocument();
  });
});

describe('bağlantı menüsü', () => {
  async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(within(rowOf(name)).getByRole('button', { name: 'Bağlantı menüsü' }));
  }

  it('"Hedef yap" bağlantının ilk görünür veritabanını hedef yapar', async () => {
    const { user } = setup(
      createFakeConnections([connection({ databaseSelection: [{ database: 'app', schemas: null }] })]),
    );
    await within(nav()).findByRole('button', { name: /Yerel/ });
    await openMenu(user, 'Yerel');
    await user.click(screen.getByRole('menuitem', { name: 'Hedef yap' }));
    expect(within(header()).getByRole('heading')).toHaveTextContent('Yerel / app');
  });

  it('"Bağlan" listeler; bağlıyken "Yenile" ve "Bağlantıyı kes" sunulur, kesince kayıtlı seçime döner', async () => {
    const { user, fake } = setup(withServer(createFakeConnections([connection()])));
    await within(nav()).findByRole('button', { name: /Yerel/ });
    await openMenu(user, 'Yerel');
    expect(screen.getByRole('menuitem', { name: 'Bağlantıyı kes' })).toBeDisabled();
    await user.click(screen.getByRole('menuitem', { name: 'Bağlan' }));
    expect(await within(panel()).findByRole('heading', { name: 'Gizli (2)' })).toBeInTheDocument();

    await openMenu(user, 'Yerel');
    expect(screen.getByRole('menuitem', { name: 'Yenile' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Bağlantıyı kes' }));
    await waitFor(() => expect(fake.databaseRequests).toContain('b1: kes'));
    expect(within(panel()).getByRole('button', { name: 'Bağlan ve tüm veritabanlarını listele' })).toBeInTheDocument();
    expect(within(rowOf('Yerel')).queryByLabelText('bağlı')).not.toBeInTheDocument();
  });

  it('"Yeni konsol" bağlantının ilk görünür veritabanında yeni konsol sekmesi açar', async () => {
    const { user } = setup(
      createFakeConnections([connection({ databaseSelection: [{ database: 'app', schemas: null }] })]),
    );
    await within(nav()).findByRole('button', { name: /Yerel/ });
    const before = tabs().length;
    await openMenu(user, 'Yerel');
    await user.click(screen.getByRole('menuitem', { name: 'Yeni konsol' }));
    expect(tabs()).toHaveLength(before + 1);
    expect(within(header()).getByRole('heading')).toHaveTextContent('Yerel / app');
  });

  it('sağ tık aynı menüyü açar', async () => {
    const { user } = setup();
    await within(nav()).findByRole('button', { name: /Yerel/ });
    await user.pointer({ keys: '[MouseRight]', target: within(rowOf('Yerel')).getByRole('button', { name: /Yerel/ }) });
    expect(screen.getByRole('menuitem', { name: 'Hedef yap' })).toBeInTheDocument();
  });
});

describe('hedef başlığı', () => {
  it('hedefin renk noktası, bağlantı / veritabanı ve ortam rozeti görünür', async () => {
    const { user } = setup(
      createFakeConnections([connection({ name: 'Dev DB', envTag: 'dev', color: '#16a34a' })]),
    );
    await selectConnection(user, 'Dev DB');
    await user.click(within(panel()).getByRole('button', { name: 'postgres' }));
    const h = within(header());
    expect(h.getByRole('heading')).toHaveTextContent('Dev DB / postgres');
    expect(h.getByText('dev')).toBeInTheDocument();
    expect(h.getByTestId('hedef-noktasi')).toHaveStyle({ backgroundColor: '#16a34a' });
    expect(header()).not.toHaveClass('prod');
    expect(document.querySelector('.tezgah')).not.toHaveClass('prod-cerceve');
  });

  it('prod hedefte başlık kırmızımsı, uygulama kırmızı çerçeveli', async () => {
    const { user } = setup(
      createFakeConnections([connection({ name: 'Canlı', envTag: 'prod', color: '#dc2626' })]),
    );
    await selectConnection(user, 'Canlı');
    await user.click(within(panel()).getByRole('button', { name: 'postgres' }));
    expect(header()).toHaveClass('prod');
    expect(within(header()).getByText('prod')).toBeInTheDocument();
    expect(document.querySelector('.tezgah')).toHaveClass('prod-cerceve');
  });

  it('başlığın altında henüz boş bir editör alanı var', async () => {
    setup();
    expect(await screen.findByRole('region', { name: 'Script editörü' })).toBeInTheDocument();
  });

  it('hedefin bağlantısı silinince hedef temizlenir', async () => {
    const { user } = setup();
    await selectConnection(user, 'Yerel');
    await user.click(within(panel()).getByRole('button', { name: 'postgres' }));
    await user.click(within(rowOf('Yerel')).getByRole('button', { name: 'Bağlantı menüsü' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sil' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(within(header()).getByText('Hedef seçilmedi')).toBeInTheDocument());
  });
});
