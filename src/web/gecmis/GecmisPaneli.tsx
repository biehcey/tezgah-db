import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react';
import { DEFAULT_ENV_COLORS, type Connection } from '../../core/baglanti';
import {
  ALL_RESULT_GROUPS,
  DEFAULT_HISTORY_LIMIT,
  resultGroup,
  type HistoryEntry,
  type HistoryFilter,
  type HistoryQuery,
  type ResultGroup,
} from '../../core/gecmis-filtresi';
import type { Target } from '../../core/veritabani-secimi';
import { useApi } from '../api/client';
import { X } from 'lucide-react';
import { Dugme } from '../ortak/Dugme';
import { OnayKutusu, Radyo, TarihAlani } from '../ortak/FormKontrolleri';
import { Rozet, type RozetTuru } from '../ortak/Rozet';

interface Props {
  connections: readonly Connection[];
  /** Aktif sekmenin hedefi; "Bu hedef" filtresi onu izler. */
  activeTarget: Target | null;
  /** Çift tık / Enter: kayıt yeni sekmede açılır. */
  onOpen: (entry: HistoryEntry) => void;
  onClose: () => void;
}

const GROUP_LABELS: Record<ResultGroup, string> = { basarili: 'Başarılı', hata: 'Hata', deneme: 'Deneme', rollback: 'Rollback' };

/** Metin araması her tuşta diski okumasın. */
const SEARCH_DELAY_MS = 250;
/** Listenin sonuna bu kadar yaklaşınca sonraki sayfa istenir. */
const LOAD_MORE_PX = 120;

/** `YYYY-MM-DD` (yerel gün) → o günün yerel başlangıcı; `days` gün sonrası. */
function localDay(value: string, days = 0): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days) : null;
}

interface Listing {
  entries: HistoryEntry[];
  next: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Sorgu geçmişi: Çalıştırma kayıtları yeniden eskiye, sayfa sayfa. Filtre değişince liste baştan
 * istenir; eski isteklerin yanıtı yok sayılır.
 */
export function GecmisPaneli({ connections, activeTarget, onOpen, onClose }: Props) {
  const api = useApi();
  const [allTargets, setAllTargets] = useState(false);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<readonly ResultGroup[]>(ALL_RESULT_GROUPS);
  const [fromDay, setFromDay] = useState('');
  const [toDay, setToDay] = useState('');
  const [listing, setListing] = useState<Listing>({ entries: [], next: null, loading: true, error: null });
  const generation = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setSearch(text), SEARCH_DELAY_MS);
    return () => clearTimeout(id);
  }, [text]);

  const scopeTarget = allTargets || !activeTarget ? null : activeTarget;
  const baglantiId = scopeTarget?.connectionId ?? null;
  const veritabani = scopeTarget?.database ?? null;

  const load = useCallback(
    (imlec: string | null) => {
      const filter: HistoryFilter = {
        hedef: baglantiId !== null && veritabani !== null ? { baglantiId, veritabani } : null,
        metin: search,
        sonuclar: groups,
        baslangic: localDay(fromDay),
        bitis: localDay(toDay, 1),
      };
      const query: HistoryQuery = { ...filter, imlec, limit: DEFAULT_HISTORY_LIMIT };
      const current = imlec === null ? ++generation.current : generation.current;
      setListing((l) => ({ ...(imlec === null ? { entries: [], next: null } : l), loading: true, error: null }));
      api.listRunHistory(query).then(
        (page) => {
          if (current !== generation.current) return;
          setListing((l) => ({ entries: [...l.entries, ...page.kayitlar], next: page.sonraki, loading: false, error: null }));
        },
        (err: unknown) => {
          if (current !== generation.current) return;
          setListing((l) => ({ ...l, loading: false, error: err instanceof Error ? err.message : String(err) }));
        },
      );
    },
    [api, baglantiId, veritabani, search, groups, fromDay, toDay],
  );

  useEffect(() => load(null), [load]);

  function scrolled(e: UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    if (listing.loading || listing.next === null) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MORE_PX) load(listing.next);
  }

  function toggleGroup(group: ResultGroup) {
    setGroups((current) => (current.includes(group) ? current.filter((g) => g !== group) : ALL_RESULT_GROUPS.filter((g) => g === group || current.includes(g))));
  }

  return (
    <aside className="gecmis-paneli" aria-label="Sorgu geçmişi">
      <header className="gecmis-basligi">
        <h2>Sorgu geçmişi</h2>
        <Dugme tur="sade" ikon aria-label="Geçmişi kapat" title="Kapat (Ctrl/Cmd+Alt+E)" onClick={onClose}>
          <X aria-hidden="true" />
        </Dugme>
      </header>
      <div className="gecmis-filtresi">
        <div role="radiogroup" aria-label="Hedef" className="gecmis-satiri">
          <Radyo name="gecmis-hedef" checked={scopeTarget !== null} disabled={!activeTarget} onChange={() => setAllTargets(false)}>
            Bu hedef
          </Radyo>
          <Radyo name="gecmis-hedef" checked={scopeTarget === null} onChange={() => setAllTargets(true)}>
            Tüm hedefler
          </Radyo>
        </div>
        <input type="search" aria-label="Script’te ara" placeholder="Script’te ara" value={text} onChange={(e) => setText(e.target.value)} />
        <div role="group" aria-label="Sonuç" className="gecmis-satiri">
          {ALL_RESULT_GROUPS.map((group) => (
            <OnayKutusu key={group} checked={groups.includes(group)} onChange={() => toggleGroup(group)}>
              {GROUP_LABELS[group]}
            </OnayKutusu>
          ))}
        </div>
        <div className="gecmis-satiri">
          <TarihAlani aria-label="Başlangıç tarihi" value={fromDay} onChange={(e) => setFromDay(e.target.value)} />
          <span aria-hidden="true">–</span>
          <TarihAlani aria-label="Bitiş tarihi" value={toDay} onChange={(e) => setToDay(e.target.value)} />
        </div>
      </div>
      {listing.error && (
        <p role="alert" className="uyari kucuk">
          Kayıtlar okunamadı: {listing.error}
        </p>
      )}
      <ul aria-label="Çalıştırma kayıtları" className="gecmis-listesi" onScroll={scrolled}>
        {listing.entries.map((entry) => (
          <GecmisKaydi key={entry.runId} entry={entry} connections={connections} onOpen={onOpen} />
        ))}
      </ul>
      {listing.loading && <p className="soluk kucuk gecmis-durumu">Yükleniyor…</p>}
      {/* Liste paneli doldurmuyorsa kaydırma olayı gelmez; sonraki sayfa düğmeyle de istenir. */}
      {!listing.loading && listing.next !== null && (
        <Dugme tur="sade" boyut="kucuk" className="gecmis-durumu" onClick={() => load(listing.next)}>
          Daha eski kayıtlar
        </Dugme>
      )}
      {!listing.loading && !listing.error && listing.entries.length === 0 && <p className="soluk kucuk gecmis-durumu">Kayıt yok.</p>}
    </aside>
  );
}

const SONUC_ROZETLERI: Record<ResultGroup | 'bilinmiyor', RozetTuru> = {
  basarili: 'basari',
  hata: 'tehlike',
  deneme: 'dikkat',
  rollback: 'dikkat',
  bilinmiyor: 'notr',
};

/** Kaydın sonucu; Autocommit başarısı `commit` olarak yazılır, mod ayırır. */
function resultLabel(entry: HistoryEntry): string {
  switch (entry.sonuc) {
    case 'commit':
      return entry.mod === 'autocommit' ? 'autocommit' : 'commit';
    case 'deneme-rollback':
      return 'deneme';
    case 'karar-suresi-doldu':
      return 'süre doldu';
    case 'kopma-rollback':
      return 'kopma';
    default:
      return entry.sonuc;
  }
}

/** Script'in ilk dolu satırı. */
function scriptHead(script: string): string {
  return script.split('\n').find((line) => line.trim() !== '')?.trim() ?? '';
}

function GecmisKaydi({ entry, connections, onOpen }: { entry: HistoryEntry; connections: readonly Connection[]; onOpen: Props['onOpen'] }) {
  const { hedef } = entry;
  const color = connections.find((c) => c.id === hedef.baglantiId)?.color ?? (hedef.ortam ? DEFAULT_ENV_COLORS[hedef.ortam] : null);
  const group = resultGroup(entry.sonuc) ?? 'bilinmiyor';
  return (
    <li
      tabIndex={0}
      className="gecmis-kaydi"
      title="Çift tıklayınca yeni sekmede açılır"
      onDoubleClick={() => onOpen(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(entry);
        }
      }}
    >
      <div className="gecmis-ust">
        <time dateTime={entry.zaman}>{new Date(entry.zaman).toLocaleString('tr-TR')}</time>
        <Rozet tur={SONUC_ROZETLERI[group]} className="gecmis-sonucu">
          {resultLabel(entry)}
        </Rozet>
      </div>
      <div className="gecmis-hedefi">
        <span className="sekme-rengi" data-testid="gecmis-rengi" style={{ backgroundColor: color ?? 'transparent' }} aria-hidden="true" />
        {hedef.ad} / {hedef.veritabani}
      </div>
      <code className="gecmis-scripti" title={entry.script}>
        {scriptHead(entry.script)}
      </code>
    </li>
  );
}
