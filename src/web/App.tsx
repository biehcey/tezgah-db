import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Folder } from '../core/ayarlar';
import {
  isProd,
  type Connection,
  type DatabaseSelection,
  type PasswordWriteOutcome,
  type SessionSecret,
} from '../core/baglanti';
import { asksForSessionPassword, isPasswordRejected } from '../core/baglanti-testi';
import { buildConnectionUrl } from '../core/baglanti-url';
import { identSql } from '../core/tamamlama/adlar';
import { asksForSshSecret, type HostKeyProblem } from '../core/ssh-tuneli';
import { HostAnahtariKutusu } from './baglantilar/HostAnahtariKutusu';
import {
  activateTab,
  closeTab,
  emptyTabs,
  forgetConnection,
  openConsoleTab,
  openTableTab,
  restoreTabs,
  savedTabs,
  setTabScript,
  setTabTarget,
  setTableFilter,
  toggleWriteMode,
  type ConsoleState,
  type SavedTabs,
  type TabTarget,
} from '../core/konsol-sekmeleri';
import { ApiError, connectionRequest, useApi } from './api/client';
import { HizliGecis, type PaletteCommand } from './hizli-gecis/HizliGecis';
import { BaglantiFormu } from './baglantilar/BaglantiFormu';
import { GezginAgaci, type ImportMarks } from './gezgin/GezginAgaci';
import { IceAktarma } from './ice-aktarma/IceAktarma';
import { IceAktarmaSonucu } from './ice-aktarma/IceAktarmaSonucu';
import type { ImportApplyResponse } from '../core/ice-aktarma/sozlesme';
import { SKIPPED_WITHOUT_PASSWORD, importTestRequest, importTestResult } from '../core/ice-aktarma/toplu-baglanti-testi';
import { KlasorAdi } from './baglantilar/KlasorAdi';
import { SifrePenceresi } from './baglantilar/SifrePenceresi';
import { SilmeOnayi } from './baglantilar/SilmeOnayi';
import { Menu, type MenuItem, type MenuPosition } from './ortak/Menu';
import { Onay } from './ortak/Onay';
import { Diyalog } from './ortak/Diyalog';
import { useBildirimler } from './ortak/Bildirimler';
import { Konsol } from './konsol/Konsol';
import { targetOfKey, useCatalogs } from './katalog/kataloglar';
import type { HistoryEntry } from '../core/gecmis-filtresi';
import type { TableFilter } from '../core/tablo-sayfasi';
import {
  changesServerSession,
  defaultTargetDatabase,
  setDatabaseVisible,
  type Target,
} from '../core/veritabani-secimi';
import type { ConnectionSession } from './veritabanlari/hedef';
import { navigatorShortcut, shortcutKey } from '../core/kisayollar';
import { APPLE, modalOpen } from './ortak/pencere';
import { themeCommands, usePreferences, useTheme } from './ortak/tercihler';

type Status = { kind: 'loading' } | { kind: 'ok'; version: string } | { kind: 'error'; message: string };
/**
 * Çalışma alanında açık form: yeni bağlantı (paletten URL'le dolu açılabilir; `key` her URL'de yeni
 * ki form baştan kurulsun) ya da düzenlenen bağlantının kimliği.
 */
type Editing = { kind: 'yeni'; url?: { text: string; key: number } } | { kind: 'duzenle'; id: string } | null;
/** Alt+Enter ile kenar çubuğunda gösterilecek veritabanı; gösterilince temizlenir. */
type Reveal = Target;

/** Kısayolların platformdaki yazılışı. */
const PALETTE_SHORTCUT = APPLE ? '⌘K' : 'Ctrl K';
const NAVIGATOR_SHORTCUT = APPLE ? '⌘B' : 'Ctrl+B';
/** Açık klasör penceresi. */
type FolderDialog = { kind: 'yeni' } | { kind: 'yeniden-adlandir'; folder: Folder } | { kind: 'sil'; folder: Folder } | null;
/** Açık menü; `key` her açılışta değişir ki menü (alt menü durumu dahil) baştan kurulsun. */
type OpenMenu = MenuPosition & { key: number; label: string; items: MenuItem[] };
/** Açık şifre penceresi; `resolve` şifre verilince güncel bağlantıyla, iptalde `null` ile çağrılır. */
type PasswordPrompt = {
  /** Her soruşta yeni: kapanıp hemen yeniden açılan pencere (28P01) baştan kurulsun. */
  key: number;
  connection: Connection;
  /** Sorulan sır: veritabanı şifresi ya da SSH tünelinin şifresi/passphrase'i. */
  secret: SessionSecret;
  rejection: string | null;
  resolve: (next: Connection | null) => void;
};

/** Listeden bağlanırken çıkan host anahtarı sorunu; `true` ile çözülürse istek yeniden denenir. */
type HostKeyPrompt = {
  problem: HostKeyProblem;
  kind: 'hostKeyUnknown' | 'hostKeyMismatch';
  resolve: (retry: boolean) => void;
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) {
    return 'Oturum geçersiz: Tezgah yeniden başlatılmış olabilir. Terminaldeki adresi yeniden açın.';
  }
  if (err instanceof ApiError && err.body?.hata) return err.body.hata;
  return 'Tezgah sunucusuna ulaşılamıyor.';
}

// Reddedilen işlem yazma da silme de olabilir ("Keychain'e kaydet" kapatıldıysa). Kütüphane
// "Deny"ı kilitli depo gibi diğer erişim hatalarından ayırmadığı için mesaj ikisini de kapsar.
const KEYCHAIN_UNREACHABLE = "keychain'e erişilemedi (erişim reddedildi ya da keychain kilitli)";
const SAVE_DENIED = `keychain'deki şifre güncellenemedi: ${KEYCHAIN_UNREACHABLE}.`;

/** Sekme değişiklikleri bu kadar duraklamadan sonra diske yazılır. */
const TABS_WRITE_DELAY_MS = 300;

const newTabId = () => crypto.randomUUID();

export function App() {
  const api = useApi();
  const { preferences, update: updatePreferences } = usePreferences();
  useTheme(preferences.tema);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Connection | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [folderDialog, setFolderDialog] = useState<FolderDialog>(null);
  /** Hatalar ve kısa geri bildirimler (ör. "URL kopyalandı") toast olarak gösterilir. */
  const bildir = useBildirimler();
  /** Konsol sekmeleri; aktif sekmenin hedefi editörün hedefidir, bağlanmadan da seçilebilir. */
  const [konsol, setKonsol] = useState<ConsoleState>({ tabs: [], active: null });
  /**
   * Diske en son yazılan (ya da okunan) sekmeler; `null`: sekmeler okunamadı ya da henüz okunmadı.
   * Bu durumda yazılmaz: okunamayan dosyanın üzerine boş liste yazılmasın.
   */
  const persisted = useRef<string | null>(null);
  /** Hedef başına Katalog önbelleği; yalnızca kullanıcı eylemiyle (hedef seçme, çalıştırma, ↻) dolar. */
  const catalogs = useCatalogs(api);
  /** Bağlantı kimliğine göre sunucu oturumu; olmayan bağlantı bağlı değildir. */
  const [sessions, setSessions] = useState<Record<string, ConnectionSession>>({});
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordPrompt | null>(null);
  const promptCount = useRef(0);
  const [hostKeyPrompt, setHostKeyPrompt] = useState<HostKeyPrompt | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  /** Kenar çubuğundaki gezgin açık (Ctrl/Cmd+B); diske yazılmaz. */
  const [navigatorOpen, setNavigatorOpen] = useState(true);
  /** Bu oturumda listeden açılan Tablo sekmeleri; ilk sayfaları hemen çekilir. */
  const [autoLoadTabs, setAutoLoadTabs] = useState<ReadonlySet<string>>(new Set());
  /** Sekme başına hedef kilidi: script çalışırken ve karar beklenirken hedef değiştirilemez; neden. */
  const [targetLocks, setTargetLocks] = useState<Record<string, string>>({});
  const urlFormCount = useRef(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportApplyResponse | null>(null);
  const [importMarks, setImportMarks] = useState<ImportMarks>({ newIds: [], tests: {} });
  /** Başka bir pencere (klasör, onay, şifre) açıkken kısayol paleti onun üstüne açmaz. */
  const dialogOpen = useRef(false);
  /** Bağlantı formu açıkken konsol gizlidir; geçmiş kısayolu çalışmaz. */
  const consoleHidden = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!dialogOpen.current) setPaletteOpen(true);
      }
      // Sorgu geçmişi: Ctrl/Cmd+Alt+E, yalnızca konsol görünürken. Alt ile `key` klavyeye göre değişir,
      // `code` değişmez. Windows'ta AltGr de Ctrl+Alt gelir: AltGr+E (€) yazmaya devam etmeli.
      if ((e.metaKey || e.ctrlKey) && e.altKey && !e.shiftKey && e.code === 'KeyE' && !e.getModifierState('AltGraph')) {
        if (dialogOpen.current || consoleHidden.current) return;
        e.preventDefault();
        setHistoryOpen((open) => !open);
      }
      if (navigatorShortcut(shortcutKey(e)) && !modalOpen()) {
        e.preventDefault();
        setNavigatorOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let active = true;
    // İlk hata kalır: aynı nedenle düşen ikinci istek mesajı ezmesin.
    const fail = (err: unknown) =>
      active && setStatus((prev) => (prev.kind === 'error' ? prev : { kind: 'error', message: errorMessage(err) }));
    api.status().then(
      (s) => active && setStatus((prev) => (prev.kind === 'error' ? prev : { kind: 'ok', version: s.surum })),
      fail,
    );
    // Bağlantılar klasörleriyle birlikte gösterilir; liste bir an yanlış bölümlenmesin. Sekmeler de
    // bağlantılarla birlikte açılır: silinmiş bağlantıya işaret eden sekme hedefsiz kalır. Sekmeler
    // yalnızca dosyadan okunur; geri gelen sekme hiçbir sunucuya bağlanmaz.
    const tabs = api.readTabs().then(
      (saved): SavedTabs | null => saved,
      (err: unknown) => {
        if (active && !(err instanceof ApiError && err.status === 401)) {
          bildir.hata(`Konsol sekmeleri okunamadı: ${errorMessage(err)} Bu oturumda sekmeler diske yazılmayacak.`);
        }
        return null;
      },
    );
    Promise.all([api.listConnections(), api.listFolders(), tabs]).then(([list, folderList, saved]) => {
      if (!active) return;
      setFolders(folderList);
      setConnections(list);
      const restored = restoreTabs(saved ?? emptyTabs(), list.map((c) => c.id));
      persisted.current = saved ? JSON.stringify(savedTabs(restored)) : null;
      setKonsol(restored.tabs.length > 0 ? restored : openConsoleTab(restored, newTabId(), null));
    }, fail);
    return () => {
      active = false;
    };
  }, [api, bildir]);

  // Sunucuya ulaşılamıyorsa ya da oturum geçersizse kalıcı hata toast'ı.
  const statusError = status.kind === 'error' ? status.message : null;
  useEffect(() => {
    if (statusError) bildir.hata(statusError);
  }, [statusError, bildir]);

  // Sekme değişiklikleri gecikmeli yazılır; değişmeyen liste yeniden yazılmaz.
  useEffect(() => {
    if (persisted.current === null) return;
    const tabs = savedTabs(konsol);
    const text = JSON.stringify(tabs);
    if (text === persisted.current) return;
    const write = (keepalive: boolean) => {
      persisted.current = text;
      api.writeTabs(tabs, { keepalive }).catch((err: unknown) => bildir.hata(`Konsol sekmeleri kaydedilemedi: ${errorMessage(err)}`));
    };
    const id = setTimeout(() => write(false), TABS_WRITE_DELAY_MS);
    // Sayfa kapanırken bekleyen yazma kaybolmasın.
    const flush = () => {
      clearTimeout(id);
      write(true);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(id);
      window.removeEventListener('pagehide', flush);
    };
  }, [konsol, api, bildir]);

  const activeTab = konsol.tabs.find((t) => t.id === konsol.active) ?? null;
  const target: Target | null = activeTab?.hedef
    ? { connectionId: activeTab.hedef.connectionId, database: activeTab.hedef.database }
    : null;
  const targetLock = (konsol.active && targetLocks[konsol.active]) || null;

  const changeTargetLock = useCallback((id: string, reason: string | null) => {
    setTargetLocks((locks) => {
      if ((locks[id] ?? null) === reason) return locks;
      const { [id]: _old, ...rest } = locks;
      return reason === null ? rest : { ...rest, [id]: reason };
    });
  }, []);
  const changeTabScript = useCallback((id: string, script: string) => setKonsol((k) => setTabScript(k, id, script)), []);
  const changeTableFilter = useCallback((id: string, filter: TableFilter) => setKonsol((k) => setTableFilter(k, id, filter)), []);
  const toggleTabWriteMode = useCallback((id: string) => setKonsol((k) => toggleWriteMode(k, id)), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);
  /** Metin verilen hedefte yeni konsol sekmesinde (geçmişten açma, Tablo sekmesinden "Konsola aktar"). */
  const openConsoleWith = useCallback(
    (hedef: TabTarget | null, metin: string) => setKonsol((k) => openConsoleTab(k, newTabId(), hedef, metin)),
    [],
  );
  /** Geçmişten açılan kayıt yeni sekmede, kaydın hedefiyle; bağlantı artık yoksa hedefsiz. */
  const openFromHistory = useCallback(
    ({ hedef, script }: HistoryEntry) => {
      const exists = connections?.some((c) => c.id === hedef.baglantiId) ?? false;
      openConsoleWith(exists ? { connectionId: hedef.baglantiId, database: hedef.veritabani, schema: null } : null, script);
    },
    [connections, openConsoleWith],
  );

  const edited = editing?.kind === 'duzenle' ? connections?.find((c) => c.id === editing.id) : undefined;
  const formOpen = editing?.kind === 'yeni' || edited !== undefined;
  consoleHidden.current = formOpen;
  const targetConnection = target ? connections?.find((c) => c.id === target.connectionId) : undefined;

  function open(next: Editing) {
    setEditing(next);
  }

  function setSession(id: string, session: ConnectionSession | null) {
    setSessions((prev) => {
      const { [id]: _old, ...rest } = prev;
      return session ? { ...rest, [id]: session } : rest;
    });
  }

  /**
   * Sunucu şifre istediyse ya da reddettiyse (`28P01`) ve şifre keychain'de tutulmuyorsa şifre
   * penceresini açar. Şifre verilince güncel bağlantıyı döndürür (istek yeniden denenir); pencere
   * açılmadıysa ya da iptal edildiyse `null`.
   */
  function askPassword(connection: Connection, err: unknown): Promise<Connection | null> {
    const kod = err instanceof ApiError ? err.body?.kod : undefined;
    const ssh = asksForSshSecret(connection, kod);
    if (!ssh && !asksForSessionPassword(connection, kod)) return Promise.resolve(null);
    const rejected = ssh ? kod === 'sshSirReddedildi' : isPasswordRejected(kod);
    return new Promise((resolve) =>
      setPasswordPrompt({
        key: ++promptCount.current,
        connection,
        secret: ssh ? 'ssh' : 'veritabani',
        rejection: rejected ? errorMessage(err) : null,
        resolve,
      }),
    );
  }

  /**
   * Tünelin host anahtarı bilinmiyor ya da uyuşmuyorsa kutuyu pencere olarak açar. Bilinmeyen
   * anahtara güvenilirse `true` (istek yeniden denenir); uyuşmazlıkta devam yok, her zaman `false`.
   */
  function askHostKey(err: unknown): Promise<boolean> {
    const body = err instanceof ApiError ? err.body : undefined;
    const kind = body?.kod;
    if (!body?.hostAnahtari || (kind !== 'hostKeyUnknown' && kind !== 'hostKeyMismatch')) return Promise.resolve(false);
    const problem = body.hostAnahtari;
    return new Promise((resolve) => setHostKeyPrompt({ problem, kind, resolve }));
  }

  function closeHostKey(prompt: HostKeyPrompt, retry: boolean) {
    setHostKeyPrompt(null);
    prompt.resolve(retry);
  }

  async function trustHostKey(prompt: HostKeyPrompt) {
    const { host, port, anahtar } = prompt.problem;
    await api.trustHostKey({ host, port, anahtar });
    closeHostKey(prompt, true);
  }

  async function forgetHostKey(prompt: HostKeyPrompt) {
    const { host, port } = prompt.problem;
    const { silinen } = await api.forgetHostKey({ host, port });
    if (silinen > 0) bildir.basari(`${host} için Tezgah'taki kayıtlı host anahtarı silindi; yeniden bağlanınca yeni anahtar sorulur.`);
    else bildir.hata(`${host} için Tezgah'ta kayıtlı host anahtarı yok.`);
    closeHostKey(prompt, false);
  }

  async function submitPassword(prompt: PasswordPrompt, password: string, saveToKeychain: boolean): Promise<string | null> {
    try {
      const result = await api.giveSessionPassword(prompt.connection.id, { password, saveToKeychain, secret: prompt.secret });
      setConnections((list) => (list ?? []).map((c) => (c.id === result.connection.id ? result.connection : c)));
      if (result.password === 'reddedildi') {
        bildir.hata(`Şifre keychain'e kaydedilemedi: ${KEYCHAIN_UNREACHABLE}. Tezgah kapanana kadar bellekte tutuluyor.`);
      }
      setPasswordPrompt(null);
      prompt.resolve(result.connection);
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  const cancelPassword = useCallback(() => {
    setPasswordPrompt((prompt) => {
      prompt?.resolve(null);
      return null;
    });
  }, []);

  /** Bağlan / yenile: başlangıç veritabanının pool'u üzerinden `pg_database` listesi. */
  async function connect(connection: Connection) {
    setSelectedId(connection.id);
    setSession(connection.id, { durum: 'baglaniyor' });
    let current = connection;
    for (;;) {
      try {
        const { veritabanlari } = await api.listDatabases(current.id);
        setSession(current.id, { durum: 'bagli', veritabanlari });
        return;
      } catch (err) {
        if (await askHostKey(err)) continue;
        const next = await askPassword(current, err);
        if (next) {
          current = next;
          continue;
        }
        setSession(current.id, { durum: 'hata', hata: errorMessage(err) });
        return;
      }
    }
  }

  async function disconnect(connection: Connection) {
    try {
      await api.disconnect(connection.id);
      setSession(connection.id, null);
      // Sunucu katalogu attı; yeniden okumak yeniden bağlanmak olurdu, istenmez.
      catalogs.drop(connection.id);
    } catch (err) {
      bildir.hata(`“${connection.name}” bağlantısı kesilemedi: ${errorMessage(err)}`);
    }
  }

  async function changeSelection(connection: Connection, selection: DatabaseSelection[]) {
    try {
      const updated = await api.updateDatabaseSelection(connection.id, selection);
      setConnections((list) => (list ?? []).map((c) => (c.id === updated.id ? updated : c)));
      // Sunucu eski seçimle okunan katalogu attı; kullanıcının açtığı kataloglar yeni seçimle istenir.
      catalogs.drop(connection.id, { reload: updated.databaseSelection.map((d) => d.database) });
    } catch (err) {
      bildir.hata(`Veritabanı seçimi kaydedilemedi: ${errorMessage(err)}`);
    }
  }

  /**
   * Aktif sekmenin hedefini değiştirmenin tek yolu (panel, menü, palet); sekme kilitliyken hiçbiri
   * değiştiremez. Açık sekme yoksa hedef yeni bir sekmede açılır. Şema seçilmez: hedef bağlantı +
   * veritabanıdır, `search_path` değişmez.
   */
  function chooseTarget(next: Target): boolean {
    if (targetLock) return false;
    const hedef = { connectionId: next.connectionId, database: next.database, schema: null };
    const id = konsol.active;
    setKonsol((k) => (id ? setTabTarget(k, id, hedef) : openConsoleTab(k, newTabId(), hedef)));
    catalogs.request(next, 'hedef');
    return true;
  }

  function selectTarget(connection: Connection, database: string) {
    chooseTarget({ connectionId: connection.id, database });
  }

  /**
   * Gezgin ağacının tablo listesinden: tablo yeni bir Tablo sekmesinde açılır (aynı tablonun
   * sekmesi açıksa ona geçilir). Aktif sekmenin hedefi değişmez.
   */
  function openTable(connection: Connection, database: string, schema: string, table: string) {
    // Açık ama henüz yüklenmemiş (geri gelen) sekmesine geçilirse o da yüklenir: kullanıcı tabloyu açtı.
    const next = openTableTab(konsol, newTabId(), { connectionId: connection.id, database, schema }, schema, table);
    setKonsol(next);
    setAutoLoadTabs((ids) => new Set(ids).add(next.active!));
  }

  /** Paletten (gizli veritabanı, URL eşleşmesi): hedef olur; seçimde yoksa görünür yapılır. */
  function chooseAndShow(next: Target) {
    const connection = connections?.find((c) => c.id === next.connectionId);
    if (!connection || !chooseTarget(next)) return;
    if (!connection.databaseSelection.some((d) => d.database === next.database)) {
      void changeSelection(connection, setDatabaseVisible(connection.databaseSelection, next.database, true));
    }
  }

  /** Alt+Enter: bağlantı seçilir, gezginde açılır (gizliyse gezgin de), veritabanı satırı odaklanır. */
  function revealInList(shown: Target) {
    setSelectedId(shown.connectionId);
    setNavigatorOpen(true);
    setReveal(shown);
  }

  /** Paletin "Tablolar" grubu: yalnızca katalog önbelleği dolu hedefler. */
  const cachedCatalogs = useMemo(
    () =>
      Object.entries(catalogs.entries).flatMap(([key, entry]) => (entry.katalog ? [{ ...targetOfKey(key), katalog: entry.katalog }] : [])),
    [catalogs.entries],
  );

  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const revealed = useCallback(() => setReveal(null), []);
  dialogOpen.current =
    folderDialog !== null ||
    deleting !== null ||
    passwordPrompt !== null ||
    hostKeyPrompt !== null ||
    importOpen ||
    importResult !== null;
  const paletteCommands: PaletteCommand[] = [
    { label: 'Yeni bağlantı', run: () => open({ kind: 'yeni' }) },
    { label: 'Yeni klasör', run: () => setFolderDialog({ kind: 'yeni' }) },
    { label: 'İçe aktar', run: () => setImportOpen(true) },
    { label: 'Çalıştırma kayıtları klasörünü aç', run: () => void api.openRunHistoryFolder().catch((err: unknown) => console.error('Kayıt klasörü açılamadı', err)) },
    ...themeCommands(preferences.tema, (tema) => updatePreferences({ tema })),
  ];
  const serverDatabases = Object.fromEntries(
    Object.entries(sessions).flatMap(([id, s]) => (s.durum === 'bagli' ? [[id, s.veritabanlari]] : [])),
  );

  const closeImport = useCallback(() => setImportOpen(false), []);
  const closeImportResult = useCallback(() => setImportResult(null), []);

  /** İçe aktarılanlar listeye eklenir, "yeni" rozeti öncekilerden bunlara geçer; istenirse sırayla test edilir. */
  async function imported(response: ImportApplyResponse, testAfter: boolean) {
    const added = response.added.map((a) => a.connection);
    setFolders((list) => [...list, ...response.folders]);
    setConnections((list) => [...(list ?? []), ...added]);
    setImportOpen(false);
    setImportResult(response);
    const setTest = (id: string, state: ImportMarks['tests'][string]) =>
      setImportMarks((m) => ({ ...m, tests: { ...m.tests, [id]: state } }));
    setImportMarks({
      newIds: added.map((c) => c.id),
      tests: testAfter ? Object.fromEntries(added.map((c) => [c.id, 'bekliyor' as const])) : {},
    });
    if (!testAfter) return;
    // Sırayla ve etkileşimsiz: şifre ya da host anahtarı sorulmaz, uyarı olarak kalır.
    for (const { connection, password } of response.added) {
      if (password !== 'kaydedildi') {
        setTest(connection.id, SKIPPED_WITHOUT_PASSWORD);
        continue;
      }
      setTest(connection.id, 'calisiyor');
      try {
        setTest(connection.id, importTestResult(await api.testConnection(importTestRequest(connection))));
      } catch (err) {
        setTest(connection.id, { sonuc: 'hata', mesaj: errorMessage(err) });
      }
    }
  }

  function edit(id: string) {
    setSelectedId(id);
    open({ kind: 'duzenle', id });
  }

  const closeMenu = useCallback(() => setMenu(null), []);
  const closeFolderDialog = useCallback(() => setFolderDialog(null), []);
  const cancelDelete = useCallback(() => setDeleting(null), []);

  function showMenu(label: string, at: MenuPosition, items: MenuItem[]) {
    setMenu((prev) => ({ ...at, label, items, key: (prev?.key ?? 0) + 1 }));
  }

  function saved(connection: Connection, password: PasswordWriteOutcome) {
    const before = connections?.find((c) => c.id === connection.id);
    // Sunucu bağlanma ayarı ya da şifresi değişen bağlantının pool'larını kapattı.
    if (before && (changesServerSession(before, connection) || password === 'kaydedildi' || password === 'silindi')) {
      setSession(connection.id, null);
      // Sunucu bu bağlantının katalogunu da attı.
      catalogs.drop(connection.id);
    }
    setConnections((list) => {
      const current = list ?? [];
      return current.some((c) => c.id === connection.id)
        ? current.map((c) => (c.id === connection.id ? connection : c))
        : [...current, connection];
    });
    setSelectedId(connection.id);
    setEditing(null);
    if (password === 'reddedildi') bildir.hata(`“${connection.name}” kaydedildi ama ${SAVE_DENIED}`);
  }

  async function confirmDelete(connection: Connection) {
    try {
      const result = await api.deleteConnection(connection.id);
      setConnections((list) => (list ?? []).filter((c) => c.id !== connection.id));
      if (selectedId === connection.id) setSelectedId(null);
      setKonsol((k) => forgetConnection(k, connection.id));
      setSession(connection.id, null);
      catalogs.drop(connection.id);
      setEditing(null);
      if (result.password === 'reddedildi') {
        bildir.hata(
          `“${connection.name}” silindi ama keychain'e erişilemediği için şifresi keychain'de kaldı (service tezgah, hesap ${connection.id}).`,
        );
      }
    } catch (err) {
      bildir.hata(`Silinemedi:${errorMessage(err)}`);
    } finally {
      setDeleting(null);
    }
  }

  async function move(connection: Connection, folderId: string | null) {
    try {
      const result = await api.updateConnection(connection.id, { ...connectionRequest(connection), folderId });
      setConnections((list) => (list ?? []).map((c) => (c.id === connection.id ? result.connection : c)));
    } catch (err) {
      bildir.hata(`“${connection.name}” taşınamadı: ${errorMessage(err)}`);
    }
  }

  /** Kopya kaynağın hemen arkasında oluşur ve formu açılır. */
  async function copy(source: Connection) {
    try {
      const { connection, password } = await api.copyConnection(source.id);
      setConnections((list) => {
        const current = [...(list ?? [])];
        current.splice(current.findIndex((c) => c.id === source.id) + 1, 0, connection);
        return current;
      });
      edit(connection.id);
      if (password === 'reddedildi') {
        bildir.hata(
          `“${connection.name}” oluşturuldu ama şifre kopyalanamadı: ${KEYCHAIN_UNREACHABLE}. Şifreyi formda yeniden girin.`,
        );
      }
    } catch (err) {
      bildir.hata(`Kopyalanamadı: ${errorMessage(err)}`);
    }
  }

  /** Panoya yazar; sonuç toast'ta (`etiket`: "URL", "Ad"). */
  async function copyToClipboard(metin: string, etiket: string) {
    try {
      await navigator.clipboard.writeText(metin);
      bildir.basari(`${etiket} kopyalandı: ${metin}`);
    } catch {
      bildir.hata(`${etiket} panoya kopyalanamadı: ${metin}`);
    }
  }

  function connectionMenu(connection: Connection, at: MenuPosition) {
    const targets: MenuItem[] = [
      ...folders.map((f) => ({
        label: f.name,
        disabled: connection.folderId === f.id,
        onSelect: () => void move(connection, f.id),
      })),
      { label: 'Klasörsüz', disabled: connection.folderId === null, onSelect: () => void move(connection, null) },
    ];
    const targetDatabase = defaultTargetDatabase(connection);
    const session = sessions[connection.id];
    showMenu(`${connection.name} menüsü`, at, [
      {
        label: 'Yeni konsol',
        disabled: targetDatabase === null,
        onSelect: () => {
          setSelectedId(connection.id);
          newConsole({ connectionId: connection.id, database: targetDatabase! });
        },
      },
      {
        label: 'Hedef yap',
        disabled: targetDatabase === null || targetLock !== null,
        onSelect: () => {
          setSelectedId(connection.id);
          selectTarget(connection, targetDatabase!);
        },
      },
      {
        label: session?.durum === 'bagli' ? 'Yenile' : 'Bağlan',
        disabled: session?.durum === 'baglaniyor',
        onSelect: () => void connect(connection),
      },
      { label: 'Düzenle', onSelect: () => edit(connection.id) },
      { label: 'Kopyala', onSelect: () => void copy(connection) },
      { label: 'Klasöre taşı ▸', submenu: targets, disabled: folders.length === 0 },
      { label: 'URL’yi kopyala (şifresiz)', onSelect: () => void copyToClipboard(buildConnectionUrl(connection), 'URL') },
      { label: 'Bağlantıyı kes', disabled: session === undefined, onSelect: () => void disconnect(connection) },
      { label: 'Sil', danger: true, onSelect: () => setDeleting(connection) },
    ]);
  }

  /** Verilen veritabanında yeni, boş (ya da `metin`li) konsol sekmesi; aktif sekmenin hedefi değişmez. */
  function newConsole(target: Target, metin = '') {
    openConsoleWith({ connectionId: target.connectionId, database: target.database, schema: null }, metin);
    catalogs.request(target, 'hedef');
  }

  function databaseMenu(connection: Connection, database: string, at: MenuPosition) {
    const target = { connectionId: connection.id, database };
    showMenu(`${database} menüsü`, at, [
      { label: 'Yeni konsol', onSelect: () => newConsole(target) },
      { label: 'Hedef yap', disabled: targetLock !== null, onSelect: () => selectTarget(connection, database) },
      { label: 'Adı kopyala', onSelect: () => void copyToClipboard(database, 'Ad') },
    ]);
  }

  function tableMenu(connection: Connection, database: string, schema: string, table: string, at: MenuPosition) {
    const name = `${identSql(schema)}.${identSql(table)}`;
    showMenu(`${schema}.${table} menüsü`, at, [
      { label: 'Aç', onSelect: () => openTable(connection, database, schema, table) },
      { label: 'Yeni konsolda SELECT', onSelect: () => newConsole({ connectionId: connection.id, database }, `SELECT * FROM ${name};`) },
      { label: 'Adı kopyala', onSelect: () => void copyToClipboard(name, 'Ad') },
    ]);
  }

  function folderMenu(folder: Folder, at: MenuPosition) {
    showMenu(`${folder.name} klasör menüsü`, at, [
      { label: 'Yeniden adlandır', onSelect: () => setFolderDialog({ kind: 'yeniden-adlandir', folder }) },
      { label: 'Sil', danger: true, onSelect: () => setFolderDialog({ kind: 'sil', folder }) },
    ]);
  }

  async function submitFolderName(name: string): Promise<string | null> {
    if (!folderDialog || folderDialog.kind === 'sil') return null;
    try {
      if (folderDialog.kind === 'yeni') {
        const created = await api.createFolder(name);
        setFolders((list) => [...list, created]);
      } else {
        const renamed = await api.renameFolder(folderDialog.folder.id, name);
        setFolders((list) => list.map((f) => (f.id === renamed.id ? renamed : f)));
      }
      setFolderDialog(null);
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  async function confirmFolderDelete(folder: Folder) {
    try {
      await api.deleteFolder(folder.id);
      setFolders((list) => list.filter((f) => f.id !== folder.id));
      setConnections((list) => (list ?? []).map((c) => (c.folderId === folder.id ? { ...c, folderId: null } : c)));
    } catch (err) {
      bildir.hata(`Klasör silinemedi: ${errorMessage(err)}`);
    } finally {
      setFolderDialog(null);
    }
  }

  return (
    <div className={`tezgah${targetConnection && isProd(targetConnection.envTag) ? ' prod-cerceve' : ''}`}>
      {!navigatorOpen && (
        <button
          type="button"
          className="gezgin-seridi"
          aria-label="Gezgini aç"
          title={`Gezgini aç (${NAVIGATOR_SHORTCUT})`}
          onClick={() => setNavigatorOpen(true)}
        >
          » Gezgin
        </button>
      )}
      {/* Gizlenince kapanmaz: açık düğümler, yüklü şemalar ve arama korunur. */}
      <aside className="kenar" hidden={!navigatorOpen}>
        <header className="kenar-baslik">
          <h1>Tezgah</h1>
          <button
            type="button"
            className="ikon-dugme kisayol-dugmesi"
            aria-label="Hızlı geçiş"
            title={`Hızlı geçiş (${PALETTE_SHORTCUT})`}
            onClick={() => setPaletteOpen(true)}
          >
            {PALETTE_SHORTCUT}
          </button>
          <button
            type="button"
            className="ikon-dugme"
            aria-label="İçe aktar"
            title="İçe aktar (.pgpass)"
            onClick={() => setImportOpen(true)}
          >
            <span aria-hidden="true">⇩</span>
          </button>
          <button
            type="button"
            className="ikon-dugme"
            aria-label="Yeni klasör"
            title="Yeni klasör"
            onClick={() => setFolderDialog({ kind: 'yeni' })}
          >
            <span aria-hidden="true">⊞</span>
          </button>
          <button
            type="button"
            className="ikon-dugme"
            aria-label="Yeni bağlantı"
            title="Yeni bağlantı"
            onClick={() => open({ kind: 'yeni' })}
          >
            +
          </button>
          <button
            type="button"
            className="ikon-dugme"
            aria-label="Gezgini gizle"
            title={`Gezgini gizle (${NAVIGATOR_SHORTCUT})`}
            onClick={() => setNavigatorOpen(false)}
          >
            «
          </button>
        </header>
        <nav aria-label="Bağlantılar" className="baglantilar">
          {connections && (
            <GezginAgaci
              connections={connections}
              folders={folders}
              selectedId={selectedId}
              sessions={sessions}
              target={target}
              targetLock={targetLock}
              reveal={reveal}
              onRevealed={revealed}
              importMarks={importMarks}
              onSelect={setSelectedId}
              onConnectionMenu={connectionMenu}
              onFolderMenu={folderMenu}
              onDatabaseMenu={databaseMenu}
              onTableMenu={tableMenu}
              onMove={(connection, folderId) => void move(connection, folderId)}
              onImport={() => setImportOpen(true)}
              onNew={() => open({ kind: 'yeni' })}
              onConnect={(connection) => void connect(connection)}
              onPasswordNeeded={async (connection, err) => (await askPassword(connection, err)) !== null}
              onSelectTarget={selectTarget}
              onSelectionChange={(connection, selection) => void changeSelection(connection, selection)}
              onEdit={(connection) => edit(connection.id)}
              catalogs={catalogs.entries}
              onCatalog={(t) => catalogs.request(t, 'hedef')}
              onOpenTable={openTable}
            />
          )}
        </nav>
        <footer className="kenar-alt">{status.kind === 'ok' && <span>v{status.version}</span>}</footer>
      </aside>
      <main className="calisma-alani">
        {formOpen && (
          <BaglantiFormu
            key={edited?.id ?? (editing?.kind === 'yeni' && editing.url ? `url-${editing.url.key}` : 'yeni')}
            connection={edited ?? null}
            initialUrl={editing?.kind === 'yeni' ? editing.url?.text : undefined}
            folders={folders}
            onSaved={saved}
            onCancel={() => setEditing(null)}
            onDelete={setDeleting}
          />
        )}
        {/* Form açıkken gizlenir ama kapanmaz: sekmeler, log ve karar bekleyen transaction'lar korunur. */}
        <Konsol
          state={konsol}
          connections={connections ?? []}
          onActivate={(id) => setKonsol((k) => activateTab(k, id))}
          onNew={() => setKonsol((k) => openConsoleTab(k, newTabId(), activeTab?.hedef ?? null))}
          onClose={(id) => setKonsol((k) => closeTab(k, id))}
          onScriptChange={changeTabScript}
          onTableFilterChange={changeTableFilter}
          onToggleWriteMode={toggleTabWriteMode}
          onTargetLockChange={changeTargetLock}
          targetLocks={targetLocks}
          catalogs={catalogs.entries}
          onCatalog={catalogs.request}
          onChangeTarget={openPalette}
          hidden={formOpen}
          historyOpen={historyOpen}
          onCloseHistory={closeHistory}
          onOpenFromHistory={openFromHistory}
          onOpenConsole={openConsoleWith}
          autoLoadTabs={autoLoadTabs}
        />
      </main>
      {paletteOpen && (
        <HizliGecis
          connections={connections ?? []}
          serverDatabases={serverDatabases}
          target={target}
          targetLock={targetLock}
          commands={paletteCommands}
          catalogs={cachedCatalogs}
          onOpenTable={(t) => {
            const connection = connections?.find((c) => c.id === t.connectionId);
            if (connection) openTable(connection, t.database, t.sema, t.tablo);
          }}
          onSelectTarget={chooseTarget}
          onSelectAndShow={chooseAndShow}
          onReveal={revealInList}
          onNewFromUrl={(text) => open({ kind: 'yeni', url: { text, key: ++urlFormCount.current } })}
          onClose={closePalette}
        />
      )}
      {menu && <Menu key={menu.key} x={menu.x} y={menu.y} label={menu.label} items={menu.items} onClose={closeMenu} />}
      {folderDialog && folderDialog.kind !== 'sil' && (
        <KlasorAdi
          title={folderDialog.kind === 'yeni' ? 'Yeni klasör' : 'Klasörü yeniden adlandır'}
          initial={folderDialog.kind === 'yeni' ? '' : folderDialog.folder.name}
          submitLabel={folderDialog.kind === 'yeni' ? 'Oluştur' : 'Kaydet'}
          onSubmit={submitFolderName}
          onCancel={closeFolderDialog}
        />
      )}
      {folderDialog?.kind === 'sil' && (
        <Onay
          title={`“${folderDialog.folder.name}” klasörü silinsin mi?`}
          description={folderDeleteDescription(
            (connections ?? []).filter((c) => c.folderId === folderDialog.folder.id).length,
          )}
          confirmLabel="Sil"
          onConfirm={() => confirmFolderDelete(folderDialog.folder)}
          onCancel={closeFolderDialog}
        />
      )}
      {passwordPrompt && (
        <SifrePenceresi
          key={passwordPrompt.key}
          connection={passwordPrompt.connection}
          secret={passwordPrompt.secret}
          rejection={passwordPrompt.rejection}
          onSubmit={(password, save) => submitPassword(passwordPrompt, password, save)}
          onCancel={cancelPassword}
        />
      )}
      {hostKeyPrompt && (
        <Diyalog baslik="Host anahtarı" onClose={() => closeHostKey(hostKeyPrompt, false)}>
          <HostAnahtariKutusu
            problem={hostKeyPrompt.problem}
            kind={hostKeyPrompt.kind}
            onTrust={() => trustHostKey(hostKeyPrompt)}
            onForget={() => forgetHostKey(hostKeyPrompt)}
            onCancel={() => closeHostKey(hostKeyPrompt, false)}
          />
        </Diyalog>
      )}
      {importOpen && (
        <IceAktarma
          connections={connections ?? []}
          folders={folders}
          onImported={(response, testAfter) => void imported(response, testAfter)}
          onCancel={closeImport}
        />
      )}
      {importResult && (
        <IceAktarmaSonucu
          result={importResult}
          folders={folders}
          tests={importMarks.tests}
          onOpenForm={(id) => {
            setImportResult(null);
            edit(id);
          }}
          onClose={closeImportResult}
        />
      )}
      {deleting && <SilmeOnayi connection={deleting} onConfirm={() => confirmDelete(deleting)} onCancel={cancelDelete} />}
    </div>
  );
}

function folderDeleteDescription(count: number): string {
  return count === 0 ? 'Klasör boş.' : `İçindeki ${count} bağlantı silinmez, Klasörsüz bölümüne taşınır.`;
}
