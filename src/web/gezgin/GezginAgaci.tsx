import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { Folder } from '../../core/ayarlar';
import { connectionAddress, isProd, type Connection, type DatabaseSelection } from '../../core/baglanti';
import { compactRowCount, searchTree, type SearchNode, type TreeSearch } from '../../core/gezgin';
import { searchTables } from '../../core/katalog';
import { TEST_ICONS, type ImportTestState } from '../../core/ice-aktarma/toplu-baglanti-testi';
import {
  databasePanel,
  isTarget as isTargetOf,
  setDatabaseVisible,
  setSchemaVisible,
  visibleSchemas,
  type Target,
} from '../../core/veritabani-secimi';
import { ApiError, useApi } from '../api/client';
import { catalogKey, type CatalogEntry } from '../katalog/kataloglar';
import { menuBelow, type MenuPosition } from '../ortak/Menu';
import type { ConnectionSession } from '../veritabanlari/hedef';
import { Yukleniyor } from '../ortak/Yukleniyor';

/** Son içe aktarmanın izleri: bir sonraki içe aktarmaya kadar "yeni" rozeti ve toplu test sonucu. */
export interface ImportMarks {
  newIds: readonly string[];
  tests: Readonly<Record<string, ImportTestState>>;
}

interface Props {
  connections: Connection[];
  folders: Folder[];
  selectedId: string | null;
  /** Bağlantı kimliğine göre sunucu oturumu; satırdaki durum ikonu ve veritabanı listesi buradan. */
  sessions: Readonly<Record<string, ConnectionSession>>;
  target: Target | null;
  /** Hedef değiştirilemiyorsa nedeni; veritabanı satırları pasif görünür ama odaklanabilir kalır. */
  targetLock: string | null;
  /** Hızlı geçişte Alt+Enter: bağlantısı (ve klasörü) açılır, veritabanı satırı odaklanır. */
  reveal: Target | null;
  /** Gösterilecek satır odaklandı (ya da yok); gösterme bir kez yapılır. */
  onRevealed: () => void;
  importMarks: ImportMarks;
  onSelect: (id: string) => void;
  onConnectionMenu: (connection: Connection, at: MenuPosition) => void;
  onFolderMenu: (folder: Folder, at: MenuPosition) => void;
  /** Veritabanı ve tablo satırına sağ tık (Yeni konsol, Hedef yap…). */
  onDatabaseMenu: (connection: Connection, database: string, at: MenuPosition) => void;
  onTableMenu: (connection: Connection, database: string, schema: string, table: string, at: MenuPosition) => void;
  /** Sürükle-bırakla klasör değişimi; `null` Klasörsüz. */
  onMove: (connection: Connection, folderId: string | null) => void;
  /** Boş listedeki düğmeler. */
  onImport: () => void;
  onNew: () => void;
  /** Bağlan / yenile: `pg_database` listesi. */
  onConnect: (connection: Connection) => void;
  /** Hedef şifre istedi ya da reddetti: şifre penceresi açılır; şifre verilirse `true` (istek yeniden denenir). */
  onPasswordNeeded: (connection: Connection, err: unknown) => Promise<boolean>;
  onSelectTarget: (connection: Connection, database: string) => void;
  onSelectionChange: (connection: Connection, selection: DatabaseSelection[]) => void;
  onEdit: (connection: Connection) => void;
  /** Hedef başına katalog (bkz. `catalogKey`); tablolar ve tahmini satır sayıları bundan. */
  catalogs: Readonly<Record<string, CatalogEntry>>;
  /** Şema açıldı: veritabanının katalogu istenir (yoksa). */
  onCatalog: (target: Target) => void;
  /** Tabloya tıklandı: Tablo sekmesinde açılır. */
  onOpenTable: (connection: Connection, database: string, schema: string, table: string) => void;
}

/** Sürüklenen bağlantının kimliğini taşıyan veri türü; başka sürüklemeler bırakılamaz. */
const DRAG_TYPE = 'application/x-tezgah-baglanti';
const UNFILED = 'klasorsuz';

const STATUS: Record<ConnectionSession['durum'], { icon: string; label: string }> = {
  baglaniyor: { icon: '◌', label: 'bağlanıyor' },
  bagli: { icon: '●', label: 'bağlı' },
  hata: { icon: '⚠', label: 'bağlanamadı' },
};

type SchemaState = { kind: 'yukleniyor' } | { kind: 'tamam'; schemas: string[] } | { kind: 'hata'; message: string };

// Düğüm anahtarları: klasör, bağlantı, veritabanı, şema, tablo, gizli şemalar satırı.
const SEP = '\u0000';
const folderKey = (id: string) => `k${SEP}${id}`;
const connKey = (id: string) => `b${SEP}${id}`;
const dbKey = (id: string, db: string) => `v${SEP}${id}${SEP}${db}`;
const schemaKey = (id: string, db: string, s: string) => `s${SEP}${id}${SEP}${db}${SEP}${s}`;
const tableKey = (id: string, db: string, s: string, t: string) => `t${SEP}${id}${SEP}${db}${SEP}${s}${SEP}${t}`;
const hiddenSchemasKey = (id: string, db: string) => `g${SEP}${id}${SEP}${db}`;
const schemasOf = (id: string, db: string) => `${id}${SEP}${db}`;

/**
 * Kenar çubuğundaki gezgin: tek ağaç, klasör › bağlantı › veritabanı › şema › tablo; üstte tek
 * arama kutusu. Bağlantıya tıklamak onu seçer ve açar; ok (ya da ←/→) açar/kapatır. Bağlanmamış
 * bağlantının altında kayıtlı Veritabanı seçimi görünür; hedef bağlanmadan seçilebilir. Şemaları
 * açmak hedefe bağlanır; şemayı açmak katalogu ister. Görünür olmayan şemalar tek satırda toplanır.
 * Arama yalnızca bilinen (yüklenmiş) düğümlerde yapılır; hiçbir şey yüklemez, hiçbir yere bağlanmaz.
 */
export function GezginAgaci(props: Props) {
  const { connections, folders, selectedId, reveal, onRevealed, onFolderMenu, onMove, onSelect, catalogs } = props;
  const api = useApi();
  const [query, setQuery] = useState('');
  /** Açık bağlantı/veritabanı/şema/gizli şema düğümleri. */
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  /** Kapatılan klasörler (klasörler varsayılan olarak açık). */
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [schemas, setSchemas] = useState<Record<string, SchemaState>>({});
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const toggle = (key: string, next?: boolean) =>
    setOpen((prev) => {
      const isOpen = prev.has(key);
      const want = next ?? !isOpen;
      if (want === isOpen) return prev;
      const s = new Set(prev);
      if (want) s.add(key);
      else s.delete(key);
      return s;
    });

  async function loadSchemas(connection: Connection, database: string) {
    const k = schemasOf(connection.id, database);
    setSchemas((prev) => ({ ...prev, [k]: { kind: 'yukleniyor' } }));
    try {
      const { semalar } = await api.listSchemas(connection.id, database);
      setSchemas((prev) => ({ ...prev, [k]: { kind: 'tamam', schemas: semalar } }));
    } catch (err) {
      if (await props.onPasswordNeeded(connection, err)) return loadSchemas(connection, database);
      const message = err instanceof ApiError && err.body?.hata ? err.body.hata : 'Şemalar listelenemedi.';
      setSchemas((prev) => ({ ...prev, [k]: { kind: 'hata', message } }));
    }
  }

  // Seçilen bağlantı (tık, menüden Bağlan/Hedef yap, form) açılır; kullanıcı sonra kapatabilir.
  useEffect(() => {
    if (selectedId !== null) toggle(connKey(selectedId), true);
  }, [selectedId]);

  // Alt+Enter: arama temizlenir, klasör ve bağlantı açılır; çizimden sonra veritabanı satırı odaklanır.
  const [revealing, setRevealing] = useState<Target | null>(null);
  useEffect(() => {
    if (!reveal) return;
    const connection = connections.find((c) => c.id === reveal.connectionId);
    setQuery('');
    if (connection) {
      toggle(connKey(connection.id), true);
      const fk = folderKey(connection.folderId ?? UNFILED);
      setClosed((prev) => (prev.has(fk) ? new Set([...prev].filter((k) => k !== fk)) : prev));
    }
    setRevealing(reveal);
    onRevealed();
  }, [reveal, onRevealed, connections]);
  useLayoutEffect(() => {
    if (!revealing) return;
    setRevealing(null);
    const region = rootRef.current?.querySelector(`[data-baglanti="${CSS.escape(revealing.connectionId)}"]`);
    const row = [...(region?.querySelectorAll<HTMLElement>('[data-veritabani]') ?? [])].find((el) => el.dataset.veritabani === revealing.database);
    // Görünür veritabanında adı (hedef yap), gizlide ⭐ (görünür yap) odaklanır.
    (row?.querySelector<HTMLElement>('.veritabani-adi') ?? row?.querySelector<HTMLElement>('.yildiz'))?.focus();
  }, [revealing]);

  /** Aramaya giren ağaç: yalnızca bilinen düğümler. */
  const searchNodes = useMemo((): SearchNode[] => {
    const connNode = (c: Connection): SearchNode => ({
      key: connKey(c.id),
      metinler: [c.name],
      cocuklar: c.databaseSelection.map((entry) => {
        const state = schemas[schemasOf(c.id, entry.database)];
        const katalog = catalogs[catalogKey({ connectionId: c.id, database: entry.database })]?.katalog;
        return {
          key: dbKey(c.id, entry.database),
          metinler: [entry.database],
          cocuklar:
            state?.kind === 'tamam'
              ? visibleSchemas(entry, state.schemas).map((s) => ({
                  key: schemaKey(c.id, entry.database, s),
                  metinler: [s],
                  cocuklar: katalog
                    ? searchTables(katalog, [s], '').map((r) => ({
                        key: tableKey(c.id, entry.database, s, r.ad),
                        metinler: [r.ad, `${s}.${r.ad}`],
                        cocuklar: [],
                      }))
                    : [],
                }))
              : [],
        };
      }),
    });
    if (folders.length === 0) return connections.map(connNode);
    return [
      ...folders.map((f) => ({ key: folderKey(f.id), metinler: [f.name], cocuklar: connections.filter((c) => c.folderId === f.id).map(connNode) })),
      ...connections.filter((c) => c.folderId === null).map(connNode),
    ];
  }, [connections, folders, schemas, catalogs]);
  const search: TreeSearch | null = useMemo(() => searchTree(searchNodes, query), [searchNodes, query]);
  const shown = (key: string) => !search || search.gorunen.has(key);
  /** Düğümün altı süzülmeden gösterilir: arama yok ya da düğüm adıyla eşleşti. */
  const unfiltered = (key: string) => !search || (search.gorunen.has(key) && !search.acik.has(key));
  const isOpen = (key: string) => (search?.acik.has(key) ?? false) || open.has(key);

  if (connections.length === 0 && folders.length === 0) {
    return (
      <div className="bos-liste">
        <p>Henüz bağlantı yok.</p>
        <div className="bos-liste-dugmeleri">
          <button type="button" onClick={props.onImport}>
            İçe aktar…
          </button>
          <button type="button" onClick={props.onNew}>
            Yeni bağlantı…
          </button>
        </div>
      </div>
    );
  }

  const rows = (list: Connection[]) => (
    <ul className="baglanti-listesi">
      {list
        .filter((c) => shown(connKey(c.id)))
        .map((c) => (
          <BaglantiDugumu
            key={c.id}
            connection={c}
            props={props}
            selected={c.id === selectedId}
            expanded={isOpen(connKey(c.id))}
            onToggle={(next) => toggle(connKey(c.id), next)}
            onSelect={() => {
              onSelect(c.id);
              toggle(connKey(c.id), true);
            }}
          >
            <VeritabaniDugumleri
              connection={c}
              props={props}
              schemas={schemas}
              loadSchemas={(db) => void loadSchemas(c, db)}
              isOpen={isOpen}
              toggle={toggle}
              shown={shown}
              unfiltered={unfiltered}
              full={unfiltered(connKey(c.id))}
            />
          </BaglantiDugumu>
        ))}
    </ul>
  );

  const section = (key: string, name: string, folderId: string | null, folder?: Folder) => {
    const list = connections.filter((c) => c.folderId === folderId);
    const fk = folderKey(key);
    if (search && !shown(fk) && !list.some((c) => shown(connKey(c.id)))) return null;
    // Altında eşleşme olan klasör aramada açılır; kapatılan klasör aramasız kapalı kalır.
    const expanded = (search?.acik.has(fk) ?? false) || !closed.has(fk);
    const accepts = (e: DragEvent) => [...e.dataTransfer.types].includes(DRAG_TYPE);
    return (
      <section
        key={key}
        aria-label={name}
        className={`klasor${dropTarget === key ? ' birakilacak' : ''}`}
        onDragOver={(e) => {
          if (!accepts(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDropTarget(key);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
        }}
        onDrop={(e) => {
          setDropTarget(null);
          const moved = connections.find((c) => c.id === e.dataTransfer.getData(DRAG_TYPE));
          if (!moved) return;
          e.preventDefault();
          if (moved.folderId !== folderId) onMove(moved, folderId);
        }}
      >
        <button
          type="button"
          className="klasor-basligi"
          aria-expanded={expanded}
          onClick={() =>
            setClosed((prev) => {
              const next = new Set(prev);
              if (expanded) next.add(fk);
              else next.delete(fk);
              return next;
            })
          }
          onContextMenu={
            folder &&
            ((e) => {
              e.preventDefault();
              onFolderMenu(folder, { x: e.clientX, y: e.clientY });
            })
          }
        >
          <span className="ok" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
          <span className="klasor-adi">{name}</span>
          <span className="sayi">{list.length}</span>
        </button>
        {expanded && rows(list)}
      </section>
    );
  };

  const empty = search !== null && search.gorunen.size === 0;
  return (
    <div ref={rootRef}>
      <div className="gezgin-arama">
        <input
          type="search"
          aria-label="Gezginde ara"
          placeholder="Ara: tablo, şema, bağlantı…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
        />
      </div>
      {empty && <p className="soluk kucuk gezgin-bos">Eşleşme yok. Yalnızca açılmış şemaların tabloları aranır.</p>}
      {folders.length === 0 ? (
        rows(connections)
      ) : (
        <>
          {folders.map((f) => section(f.id, f.name, f.id, f))}
          {section(UNFILED, 'Klasörsüz', null)}
        </>
      )}
    </div>
  );
}

/** Ağacın bağlantı satırı ve (açıksa) altındaki veritabanları. */
function BaglantiDugumu({
  connection: c,
  props,
  selected,
  expanded,
  onToggle,
  onSelect,
  children,
}: {
  connection: Connection;
  props: Props;
  selected: boolean;
  expanded: boolean;
  onToggle: (next?: boolean) => void;
  onSelect: () => void;
  children: ReactNode;
}) {
  const session = props.sessions[c.id];
  const status = session && STATUS[session.durum];
  const test = props.importMarks.tests[c.id];
  const isNew = props.importMarks.newIds.includes(c.id);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onToggle(e.key === 'ArrowRight');
    }
  };
  return (
    <li className="baglanti-ogesi">
      <div className="dugum-satiri">
        <button
          type="button"
          className={`baglanti-satiri${isProd(c.envTag) ? ' prod-serit' : ''}`}
          data-ortam={c.envTag ?? undefined}
          aria-current={selected ? 'true' : undefined}
          aria-expanded={expanded}
          title={connectionAddress(c)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_TYPE, c.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onClick={onSelect}
          onKeyDown={onKeyDown}
          onContextMenu={(e) => {
            e.preventDefault();
            props.onConnectionMenu(c, { x: e.clientX, y: e.clientY });
          }}
        >
          <span
            className="agac-oku"
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? '▾' : '▸'}
          </span>
          <span className="ortam-noktasi" data-testid="ortam-noktasi" style={{ backgroundColor: c.color ?? 'transparent' }} aria-hidden="true" />
          <span className="baglanti-adi">{c.name}</span>
          {session && status && (
            <span className={`durum durum-${session.durum}`} role="img" aria-label={status.label} title={status.label}>
              {status.icon}
            </span>
          )}
          {(isNew || (test !== undefined && test !== 'bekliyor')) && (
            <span className="ice-izi">
              {isNew && <span className="rozet">yeni</span>}
              {test === 'calisiyor' && (
                <span role="img" aria-label="test ediliyor" title="test ediliyor">
                  ◌
                </span>
              )}
              {typeof test === 'object' && (
                <span className={`test-${test.sonuc}`} role="img" aria-label={`test: ${test.mesaj}`} title={test.mesaj}>
                  {TEST_ICONS[test.sonuc]}
                </span>
              )}
            </span>
          )}
          {c.id === props.target?.connectionId && <span className="hedef-isareti">● hedef</span>}
        </button>
        {session?.durum === 'bagli' && (
          <button type="button" className="satir-menusu" aria-label="Yenile" title="Veritabanlarını yeniden listele" onClick={() => props.onConnect(c)}>
            ⟳
          </button>
        )}
        <button
          type="button"
          className="satir-menusu"
          aria-label="Bağlantı menüsü"
          title="Bağlantı menüsü"
          aria-haspopup="menu"
          onClick={(e) => props.onConnectionMenu(c, menuBelow(e))}
        >
          ⋯
        </button>
      </div>
      {expanded && children}
    </li>
  );
}

/**
 * Bağlantının altı: görünür veritabanları ⭐ ile (tıklayınca hedef), şemaları ve tabloları;
 * bağlıyken gizliler "Gizli (N)" altında. Bağlanmamışken kayıtlı seçim ve "Bağlan" düğmesi.
 */
function VeritabaniDugumleri({
  connection,
  props,
  schemas,
  loadSchemas,
  isOpen,
  toggle,
  shown,
  unfiltered,
  full,
}: {
  connection: Connection;
  props: Props;
  schemas: Readonly<Record<string, SchemaState>>;
  loadSchemas: (database: string) => void;
  isOpen: (key: string) => boolean;
  toggle: (key: string, next?: boolean) => void;
  shown: (key: string) => boolean;
  unfiltered: (key: string) => boolean;
  /** Bağlantının altı süzülmüyor (arama yok ya da bağlantı adıyla eşleşti). */
  full: boolean;
}) {
  const { sessions, target, targetLock, catalogs, onSelectTarget, onSelectionChange, onConnect, onEdit } = props;
  const session = sessions[connection.id];
  const connected = session?.durum === 'bagli';
  const model = databasePanel(connection.databaseSelection, connected ? session.veritabanlari : null);
  const isTarget = (database: string) => isTargetOf(target, connection.id, database);
  const show = (key: string) => full || shown(key);

  const star = (database: string, visible: boolean) => (
    <button
      type="button"
      className={`yildiz${visible ? '' : ' kapali'}`}
      aria-label={`${database} ${visible ? 'görünürlükten çıkar' : 'görünür yap'}`}
      title={visible ? 'Görünürlükten çıkar' : 'Görünür yap'}
      onClick={() => onSelectionChange(connection, setDatabaseVisible(connection.databaseSelection, database, !visible))}
    >
      ⭐
    </button>
  );

  function toggleSchemas(database: string) {
    const key = dbKey(connection.id, database);
    const opening = !isOpen(key);
    toggle(key, opening);
    if (opening && schemas[schemasOf(connection.id, database)]?.kind !== 'tamam') loadSchemas(database);
  }

  function toggleTables(database: string, schema: string) {
    const key = schemaKey(connection.id, database, schema);
    const opening = !isOpen(key);
    toggle(key, opening);
    if (opening) props.onCatalog({ connectionId: connection.id, database });
  }

  /** Şemanın tabloları, katalogdan; tahmini satır sayısıyla. */
  const tables = (database: string, schema: string) => {
    const entry = catalogs[catalogKey({ connectionId: connection.id, database })];
    const all = entry?.katalog ? searchTables(entry.katalog, [schema], '') : [];
    const found = unfiltered(schemaKey(connection.id, database, schema)) ? all : all.filter((r) => shown(tableKey(connection.id, database, schema, r.ad)));
    return (
      <>
        {entry?.durum === 'hata' && <p className="uyari-metni kucuk agac-notu">Tablolar okunamadı: {entry.hata}</p>}
        {!entry?.katalog && entry?.durum !== 'hata' && <p className="soluk kucuk agac-notu"><Yukleniyor>Tablolar yükleniyor…</Yukleniyor></p>}
        {entry?.katalog && all.length === 0 && <p className="soluk kucuk agac-notu">Bu şemada tablo yok.</p>}
        <ul aria-label={`${schema} tabloları`} className="agac-tablolari">
          {found.map((r) => (
            <li key={r.ad}>
              <button
                type="button"
                className="tablo-adi"
                title={`${schema}.${r.ad}`}
                onClick={() => props.onOpenTable(connection, database, schema, r.ad)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  props.onTableMenu(connection, database, schema, r.ad, { x: e.clientX, y: e.clientY });
                }}
              >
                <span className="tablo-ikonu" aria-hidden="true">
                  ▦
                </span>
                {r.ad}
                <span className="tablo-sayisi" aria-hidden="true">
                  {compactRowCount(r.reltuples)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  };

  const schemaList = (entry: DatabaseSelection) => {
    const state = schemas[schemasOf(connection.id, entry.database)];
    if (!state || state.kind === 'yukleniyor') return <p className="soluk kucuk agac-notu"><Yukleniyor>Şemalar yükleniyor…</Yukleniyor></p>;
    if (state.kind === 'hata') return <p className="uyari-metni kucuk agac-notu">{state.message}</p>;
    const visible = visibleSchemas(entry, state.schemas);
    const hidden = state.schemas.filter((s) => !visible.includes(s));
    const hiddenKey = hiddenSchemasKey(connection.id, entry.database);
    const hiddenOpen = isOpen(hiddenKey);
    const visibility = (schema: string, on: boolean) => (
      <button
        type="button"
        className="sema-gorunurluk"
        aria-label={`${schema} görünürlüğü`}
        aria-pressed={on}
        title={on ? 'Görünürlükten çıkar' : 'Görünür yap'}
        onClick={() => {
          // Gizlenen şemanın tabloları katalogdan düşer; listesi açık kalmasın.
          if (on) toggle(schemaKey(connection.id, entry.database, schema), false);
          onSelectionChange(connection, setSchemaVisible(connection.databaseSelection, entry.database, schema, !on, state.schemas));
        }}
      >
        {on ? '●' : '○'}
      </button>
    );
    const dbFull = unfiltered(dbKey(connection.id, entry.database));
    return (
      <ul role="group" aria-label={`${entry.database} şemaları`} className="agac-semalari">
        {visible
          .filter((s) => dbFull || shown(schemaKey(connection.id, entry.database, s)))
          .map((schema) => {
            const key = schemaKey(connection.id, entry.database, schema);
            const expanded = isOpen(key);
            return (
              <li key={schema} className="sema-satiri">
                <div className="dugum-satiri">
                  <button type="button" className="sema-adi" aria-expanded={expanded} title="Tabloları listele" onClick={() => toggleTables(entry.database, schema)}>
                    <span className="agac-oku" aria-hidden="true">
                      {expanded ? '▾' : '▸'}
                    </span>
                    {schema}
                  </button>
                  {visibility(schema, true)}
                </div>
                {expanded && tables(entry.database, schema)}
              </li>
            );
          })}
        {hidden.length > 0 && dbFull && (
          <li className="sema-satiri gizli-semalar">
            <button type="button" className="sema-adi soluk" aria-expanded={hiddenOpen} onClick={() => toggle(hiddenKey)}>
              <span className="agac-oku" aria-hidden="true">
                {hiddenOpen ? '▾' : '▸'}
              </span>
              + {hidden.length} gizli şema
            </button>
            {hiddenOpen && (
              <ul className="agac-semalari">
                {hidden.map((schema) => (
                  <li key={schema} className="dugum-satiri sema-satiri">
                    <span className="sema-adi soluk" title="Görünür değil; tabloları için görünür yapın">
                      {schema}
                    </span>
                    {visibility(schema, false)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        )}
      </ul>
    );
  };

  /** Görünür veritabanı satırı: şemalar oku, ⭐, tıklayınca hedef olan ad, hedefse işaret. */
  const visibleRow = (entry: DatabaseSelection, starControl: ReactNode, canExpand: boolean) => {
    const { database } = entry;
    const expanded = canExpand && isOpen(dbKey(connection.id, database));
    return (
      <li key={database} data-veritabani={database} className={`veritabani-satiri${isTarget(database) ? ' hedef' : ''}`}>
        <div className="dugum-satiri">
          {canExpand ? (
            <button
              type="button"
              className="sema-ac"
              aria-label={`${database} şemaları`}
              title="Şemalar"
              aria-expanded={expanded}
              onClick={() => toggleSchemas(database)}
            >
              {expanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="sema-ac" aria-hidden="true" />
          )}
          {starControl}
          <button
            type="button"
            className="veritabani-adi"
            aria-current={isTarget(database) ? 'true' : undefined}
            aria-disabled={targetLock ? true : undefined}
            title={targetLock ? `Hedef değiştirilemez: ${targetLock}` : 'Hedef yap'}
            onClick={() => !targetLock && onSelectTarget(connection, database)}
            onContextMenu={(e) => {
              e.preventDefault();
              props.onDatabaseMenu(connection, database, { x: e.clientX, y: e.clientY });
            }}
          >
            {database}
          </button>
          {isTarget(database) && <span className="hedef-isareti">● hedef</span>}
        </div>
        {expanded && schemaList(entry)}
      </li>
    );
  };

  const savedStar = (
    <span className="yildiz" aria-hidden="true">
      ⭐
    </span>
  );
  const visibleEntries = connection.databaseSelection.filter((e) => show(dbKey(connection.id, e.database)));
  return (
    <section aria-label={`${connection.name} veritabanları`} data-baglanti={connection.id} className="agac-veritabanlari">
      {session?.durum === 'hata' && full && (
        <div role="alert" className="panel-hatasi">
          <p>⚠ {session.hata}</p>
          <div className="dugmeler">
            <button type="button" onClick={() => onConnect(connection)}>
              Tekrar dene
            </button>
            <button type="button" onClick={() => onEdit(connection)}>
              Düzenle
            </button>
          </div>
        </div>
      )}
      <ul className="veritabani-listesi" aria-label="Görünür veritabanları">
        {visibleEntries.map((entry) => visibleRow(entry, connected ? star(entry.database, true) : savedStar, connected))}
      </ul>
      {model.visible.length === 0 && full && (
        <p className="soluk kucuk agac-notu">{connected ? 'Görünür veritabanı yok; aşağıdan ⭐ ile seçin.' : 'Görünür veritabanı yok.'}</p>
      )}
      {!connected && session?.durum !== 'hata' && full && (
        <div className="agac-notu">
          <button type="button" className="kucuk" disabled={session?.durum === 'baglaniyor'} onClick={() => onConnect(connection)}>
            {session?.durum === 'baglaniyor' ? 'Bağlanıyor…' : 'Bağlan ve tüm veritabanlarını listele'}
          </button>
        </div>
      )}
      {connected && full && model.hidden !== null && model.hidden.length > 0 && (
        <>
          <h3 className="gizli-basligi">Gizli ({model.hidden.length})</h3>
          <ul className="veritabani-listesi gizli" aria-label="Gizli veritabanları">
            {model.hidden.map((database) => (
              <li key={database} data-veritabani={database} className="veritabani-satiri">
                <div className="dugum-satiri">
                  <span className="sema-ac" aria-hidden="true" />
                  {star(database, false)}
                  <span className="soluk">{database}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
