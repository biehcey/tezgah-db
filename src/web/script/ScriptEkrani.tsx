import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ARAYUZ_TERCIHLERI_VARSAYILAN, type ArayuzTercihleri } from '../../core/arayuz-tercihleri';
import {
  baslangicSecimi,
  bildirimSayilari,
  calismaIlerledi,
  editorBoyu,
  gosterilenSekme,
  kendiligindenAcilir,
  kullaniciSecti,
  sonucOraniniBul,
  sonucSekmeleri,
  type SekmeSecimi,
  type SonucAlaniSekmesi,
  type SonucSekmesiAnahtari,
} from '../../core/sonuc-alani';
import { Bolucu } from '../ortak/Bolucu';
import { isProd, type Connection } from '../../core/baglanti';
import { calisacakAralik, editorSatiri, type AralikYeri } from '../../core/calisacak-aralik';
import { analyzeScript, forceTransaction, type RunMode, type ScriptAnalysis } from '../../core/calistirma-modu';
import { positionOf, splitStatements, type Statement } from '../../core/ifade-bolme';
import { formatRemaining, startDecision, type DecisionTimer } from '../../core/karar-suresi';
import { scriptShortcut, shortcutKey, type ScriptShortcut } from '../../core/kisayollar';
import { kisayol } from '../ortak/pencere';
import { useScriptCommand } from './komut';
import { Degisiklikler, DenemeProdUyarisi } from './Degisiklikler';
import { BekletmeGostergesi } from './BekletmeGostergesi';
import { KararKarti, resultText, useCountdown } from './KararKarti';
import {
  ROW_LIMIT_MESSAGE,
  applyEvent,
  canFetchMore,
  requestMore,
  startRunView,
  targetLock,
  type RunView,
  type StatementStatus,
  type StatementView,
} from '../../core/script-calistirma';
import { CONNECTION_LOST, useApi, type ScriptRunHandle } from '../api/client';
import type { ServerEvent } from '../../core/script-calistirma';
import type { SessionTab } from '../../core/konsol-sekmeleri';
import type { Target } from '../../core/veritabani-secimi';
import { runBlockReasons, writeLockState } from '../../core/yazma-kilidi';
import { ChevronDown, ChevronUp, FlaskConical, Play, RefreshCw, Square, TriangleAlert } from 'lucide-react';
import { STATUS_LABELS, type AnalysisMark } from './durum';
import { DurumIkonu } from './ikonlar';
import { KilitDugmesi } from './KilitDugmesi';
import { Dugme } from '../ortak/Dugme';
import { OrtamRozeti, Rozet, type RozetTuru } from '../ortak/Rozet';
import { ScriptEditoru, type EditorMarks, type EditorSecimi, type ScriptEditoruHandle } from './ScriptEditoru';
import { resultSummary, resultTotal } from '../../core/grid/ozet';
import { SonucGovdesi } from '../grid/SonucGovdesi';
import { Yukleniyor } from '../ortak/Yukleniyor';
import { catalogUse, type CatalogEntry, type CatalogReason } from '../katalog/kataloglar';

interface Props {
  /** Hedefin bağlantısı ve veritabanı; hedef seçilmediyse `null`. */
  target: { connection: Connection; database: string } | null;
  /** "hedefi değiştir": hızlı geçiş paletini açar. */
  onChangeTarget: () => void;
  /** Hedef kilidinin nedeni değişti (`null`: hedef değiştirilebilir); ekran kapanınca `null`. */
  onTargetLockChange?: (reason: string | null) => void;
  /** Editördeki script; sekme kalıcılığı için sahibi konsoldur. */
  script: string;
  onScriptChange: (script: string) => void;
  /** Bu sekmenin Yazma kilidi açık mı (sekme ve hedef başına; sahibi konsoldur). */
  writeMode: boolean;
  /** Kilit düğmesi: sekmenin yazma modunu tek tıkla açar ya da kapatır. */
  onToggleWriteMode: () => void;
  /** Aynı hedefte açık oturumu olan diğer sekmeler; `havuzDolu` mesajı bunlarla kurulur. */
  sessionTabs?: readonly SessionTab[];
  /** `havuzDolu` mesajındaki sekme adına tıklandı. */
  onGoToTab?: (id: string) => void;
  /** Hedefin Katalog önbelleği (yoksa istenmemiş); tamamlama ve INSERT tip adları bundan. */
  catalog?: CatalogEntry;
  /** Katalog istendi: ilk çalıştırmada (yoksa), ↻'de ve sunucu DDL sonrası tazeleyince. */
  onCatalog?: (reason: CatalogReason) => void;
  /**
   * Ekran gizli (ör. bağlantı formu açık). Kapanmaz: script, log ve açık transaction korunur;
   * kapanmak transaction'ı geri aldırırdı (ADR-0002).
   */
  hidden?: boolean;
  /** Arayüz tercihlerinden: Sonuç alanının yüksekliğe oranı ve daraltılmışlığı. */
  sonucOrani: number;
  sonucDaraltilmis: boolean;
  /** Oran (sürükleme bitince) ya da daraltılmışlık değişti; tercihe yazılır. */
  onSonucAlani: (change: Partial<Pick<ArayuzTercihleri, 'sonucOrani' | 'sonucDaraltilmis'>>) => void;
}

/** Aynı satırda başlayan birden çok ifadede satır işareti en önemli durumu gösterir. */
const PRIORITY: Record<StatementStatus, number> = { hatali: 4, calisiyor: 3, calistirilmadi: 2, basarili: 1, sirada: 0 };

const NO_MARKS: EditorMarks = { lines: new Map(), error: null };

const AUTOCOMMIT_CONNECTION_LOST: ServerEvent = {
  type: 'bitti',
  sonuc: 'hata',
  mesaj: 'Tezgah sunucusuyla bağlantı koptu; çalışan ifade iptal edildi, uygulanmış ifadeler kalıcıdır.',
};

/** Ctrl/Cmd+Enter'ın imlecinde ve öncesinde ifade yok. */
const NO_RANGE_MESSAGE = 'İmleçte çalışacak ifade yok';

/** Yazarken analiz bu kadar duraklamadan sonra yenilenir. */
const ANALYSIS_DELAY_MS = 200;

const MODE_LABELS: Record<RunMode, string> = { transaction: 'Transaction', autocommit: 'Autocommit', okuma: 'Okuma', karisik: 'Karışık' };
const MODE_ROZETLERI: Record<RunMode, RozetTuru> = { transaction: 'notr', autocommit: 'dikkat', okuma: 'basari', karisik: 'tehlike' };


function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Analizin editör süsleri: reddedilen ifadeler her zaman, transaction dışılar yalnızca Karışık'ta. */
function analysisMarks(script: string, statements: Statement[], analysis: ScriptAnalysis): EditorMarks {
  const marked: { i: number; tur: AnalysisMark }[] = analysis.reddedilenler.map(({ i }) => ({ i, tur: 'reddedilen' }));
  if (analysis.mod === 'karisik') marked.push(...analysis.transactionDisi.map((i) => ({ i, tur: 'transactionDisi' as const })));
  if (marked.length === 0) return NO_MARKS;
  const lines = new Map<number, AnalysisMark>();
  const ranges = marked.map(({ i, tur }) => {
    const s = statements[i]!;
    lines.set(positionOf(script, s.start).satir, tur);
    return { bas: s.start, bit: s.end, tur };
  });
  return { lines, error: null, analysis: ranges };
}

/**
 * Script ekranı (ticket 23 varyant B): üstte büyük hedef başlığı, solda editör ve çalıştırma çubuğu,
 * sağda karar kartı ve ifade kartları. prod hedefte başlık kırmızımsıdır, yazma açıkken dolu kırmızı; uygulamanın kırmızı
 * çerçevesi kökte verilir.
 */
export function ScriptEkrani({
  target,
  onChangeTarget,
  onTargetLockChange,
  script,
  onScriptChange,
  writeMode,
  onToggleWriteMode,
  sessionTabs = [],
  onGoToTab,
  catalog,
  onCatalog,
  hidden = false,
  sonucOrani,
  sonucDaraltilmis,
  onSonucAlani,
}: Props) {
  const api = useApi();
  const prod = target !== null && isProd(target.connection.envTag);
  const [run, setRun] = useState<RunView | null>(null);
  /** Son çalıştırma prod hedefte başladı; hedef sonradan değişse de şerit o çalıştırmaya göre kalır. */
  const [runOnProd, setRunOnProd] = useState(false);
  const handle = useRef<ScriptRunHandle | null>(null);
  /** Yanıtı beklenen "daha fazla" istekleri, ifade indeksiyle. */
  const moreAsked = useRef(new Set<number>());
  /** Sunucunun son bildirdiği kalan süreden kurulan yerel geri sayım; yetkili sayaç sunucudadır. */
  const [deadline, setDeadline] = useState<DecisionTimer | null>(null);
  /** `havuzDolu` geldiğinde aynı hedefte açık oturumu olan sekmeler; mesaj o anki duruma göre kalır. */
  const [poolFullTabs, setPoolFullTabs] = useState<readonly SessionTab[]>([]);
  // Olay geri çağrısı çalıştırma başında kurulur; o anki değil, `bitti` anındaki liste gerekir.
  const sessionTabsRef = useRef(sessionTabs);
  sessionTabsRef.current = sessionTabs;
  // `bitti` hedef değişmeden önce başlayan çalıştırmanın geri çağrısında gelir.
  const onCatalogRef = useRef(onCatalog);
  onCatalogRef.current = onCatalog;
  const connection = target?.connection;
  const database = target?.database;
  const { completion, tipAdlari } = useMemo(
    () => (connection && database !== undefined ? catalogUse(catalog, connection, database) : { completion: null, tipAdlari: undefined }),
    [catalog, connection, database],
  );
  const editor = useRef<ScriptEditoruHandle>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const targetRef: Target | null = target && { connectionId: target.connection.id, database: target.database };
  const lock = target ? writeLockState(target.connection.envTag, writeMode) : null;

  function openHistoryFolder() {
    setFolderError(null);
    api.openRunHistoryFolder().catch((err: unknown) => setFolderError(`Kayıt klasörü açılamadı: ${(err as Error).message}`));
  }

  // Ekran kapanırsa açık transaction sunucuda geri alınır (ADR-0002).
  useEffect(() => () => handle.current?.close(), []);

  const targetLockReason = targetLock(run);
  useEffect(() => {
    onTargetLockChange?.(targetLockReason);
  }, [targetLockReason, onTargetLockChange]);
  useEffect(() => () => onTargetLockChange?.(null), [onTargetLockChange]);

  const running = run?.evre === 'calisiyor';
  /** Okuma transaction'ı açıkken de script düzenlenir ve yeniden çalıştırılır; eskisi geri alınır. */
  const busy = run?.evre === 'calisiyor' || run?.evre === 'karar';
  const hasStatements = useMemo(() => splitStatements(script).length > 0, [script]);
  /** Analiz edilen metin; yazarken `script`'in gerisinde kalır. */
  const analyzed = useDebounced(script, ANALYSIS_DELAY_MS);
  const statements = useMemo(() => splitStatements(analyzed), [analyzed]);
  const analysis = useMemo(() => analyzeScript(statements), [statements]);
  /** Reddedilen ifadeler, Karışık script ve salt okunur prod'da Autocommit. */
  const reasons = useMemo(() => runBlockReasons(analyzed, statements, lock, { analysis }), [analyzed, statements, lock, analysis]);
  /**
   * Deneme modunun engelleri: ek olarak transaction dışı her ifade. Editörün altında listelenmez
   * (Autocommit script'i Çalıştır ile çalışır); Dene düğmesinin açıklamasında durur.
   */
  const tryReasons = useMemo(
    () => runBlockReasons(analyzed, statements, lock, { analysis, deneme: true }),
    [analyzed, statements, lock, analysis],
  );
  const blocked = reasons.length > 0;
  const tryBlocked = tryReasons.length > 0;
  /** Editörün seçimi; Çalışacak aralık bundan çıkar. */
  const [secim, setSecim] = useState<EditorSecimi>({ from: 0, to: 0, imlec: 0 });
  const aralik = useMemo(() => {
    const a = calisacakAralik(script, secim, secim.imlec);
    return a && { bas: a.bas, metin: script.slice(a.bas, a.bit) };
  }, [script, secim]);
  /**
   * Çalışacak aralığın engelleri; yalnızca o aralığın içeriğine bakılır (Çalıştırma modu da ondan
   * çıkar). Satırlar editörün satırlarıdır.
   */
  const rangeReasons = useCallback(
    (deneme: boolean) => {
      if (!aralik) return [];
      const yer = { bas: aralik.bas, editorMetni: script };
      return runBlockReasons(aralik.metin, splitStatements(aralik.metin), lock, { deneme }).map((r) => ({
        ...r,
        satir: r.satir === null ? null : editorSatiri(yer, r.satir),
      }));
    },
    [aralik, script, lock],
  );
  const rangeRunReasons = useMemo(() => rangeReasons(false), [rangeReasons]);
  const rangeTryReasons = useMemo(() => rangeReasons(true), [rangeReasons]);
  /** Kısayolun kısa geri bildirimi (ör. imleçte ifade yok); seçim ya da metin değişince kalkar. */
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => setNotice(null), [script, secim]);
  /** Sonuç alanının seçili sekmesi; çalıştırma başında ve bitişinde açılış kuralıyla seçilir. */
  const [sekmeSecimi, setSekmeSecimi] = useState<SekmeSecimi | null>(null);
  /** Çalıştırma sayacı: yeni çalıştırmanın grid'leri eskilerin durumunu (seçim, genişlik) devralmaz. */
  const [runNo, setRunNo] = useState(0);
  /** Görünümün bir önceki hâli: bitiş ve kendiliğinden açılma geçişten anlaşılır. */
  const previousRun = useRef<RunView | null>(null);
  const sonucDaraltilmisRef = useRef(sonucDaraltilmis);
  sonucDaraltilmisRef.current = sonucDaraltilmis;
  useEffect(() => {
    const onceki = previousRun.current;
    previousRun.current = run;
    if (!run || onceki === run) return;
    setSekmeSecimi((s) => (s ? calismaIlerledi(s, onceki, run) : s));
    if (sonucDaraltilmisRef.current && kendiligindenAcilir(onceki, run)) onSonucAlani({ sonucDaraltilmis: false });
  }, [run, onSonucAlani]);

  /**
   * `metin` sunucuya bir script olarak gider (ADR-0003, ADR-0006); `yer` onun editördeki yeridir
   * (tüm script: ofset 0). `zorlaTransaction`: Okuma deseni yanıldı (25006); hata alan aralık (editör
   * sonradan değişmiş olabilir) karar kartıyla Transaction modunda çalışır. Sunucu yine kendi
   * analizini yapar.
   */
  function start(
    deneme: boolean,
    { metin, yer, zorlaTransaction = false }: { metin: string; yer: AralikYeri; zorlaTransaction?: boolean },
  ) {
    if (!targetRef || busy) return;
    // Analiz yazmanın gerisinde kalabilir; çalıştırmadan önce güncel metinle yeniden bakılır.
    const currentStatements = splitStatements(metin);
    const current = forceTransaction(analyzeScript(currentStatements), zorlaTransaction);
    if (runBlockReasons(metin, currentStatements, lock, { analysis: current, deneme }).length > 0) return;
    // Açık Okuma transaction'ı da bu soketle birlikte geri alınır.
    handle.current?.close();
    setNotice(null);
    const view = startRunView(metin, { deneme, aralik: yer });
    setRun(view);
    setRunOnProd(prod);
    setSekmeSecimi(baslangicSecimi(view));
    setRunNo((n) => n + 1);
    setDeadline(null);
    setPoolFullTabs([]);
    moreAsked.current.clear();
    // Sekmenin ilk çalıştırması (bu hedefin katalogu yoksa) katalogu ister.
    onCatalog?.('calistir');
    const runRequest = { target: targetRef, script: metin, yazmaModu: writeMode, deneme, ...(zorlaTransaction && { zorlaTransaction }) };
    handle.current = api.runScript(runRequest, (received) => {
      // Autocommit'te geri alınacak transaction yok; sunucu çalışan ifadeyi iptal eder.
      const event = received === CONNECTION_LOST && current.mod === 'autocommit' ? AUTOCOMMIT_CONNECTION_LOST : received;
      setRun((current) => (current ? applyEvent(current, event) : current));
      if (event.type === 'satirlar' || (event.type === 'uyari' && event.tur === 'dahaFazla')) moreAsked.current.delete(event.i);
      if (event.type === 'kararBekleniyor' || event.type === 'uzatildi' || event.type === 'okumaAcik') setDeadline(startDecision(event.kalanMs, Date.now()));
      if (event.type === 'bitti' && event.kod === 'havuzDolu') setPoolFullTabs(sessionTabsRef.current);
      if (event.type === 'bitti' && event.katalogYenilendi) onCatalogRef.current?.('tazelendi');
    });
  }

  /** Tüm script: ofset 0'lı Çalışacak aralık. */
  const runAll = (deneme: boolean) => start(deneme, { metin: script, yer: { bas: 0, editorMetni: script } });
  const runRange = (deneme: boolean) => {
    if (!aralik) {
      setNotice(NO_RANGE_MESSAGE);
      return;
    }
    start(deneme, { metin: aralik.metin, yer: { bas: aralik.bas, editorMetni: script } });
  };

  /**
   * Editörde Ctrl/Cmd+Enter Çalışacak aralığı çalıştırır, +Shift dener; +Alt tüm script için aynısı.
   * Düğmesi kapalıysa hiçbir şey yapmaz. Yakalama evresinde: CodeMirror'ın Mod-Enter'ı (boş satır
   * ekle) çalışmasın.
   */
  function onEditorShortcut(e: KeyboardEvent<HTMLElement>) {
    const eylem = scriptShortcut(shortcutKey(e.nativeEvent));
    if (!eylem) return;
    e.preventDefault();
    e.stopPropagation();
    runShortcut(eylem);
  }

  /** Kısayolun ya da paletteki aynı adlı komutun işi; düğmesi kapalıysa hiçbir şey yapmaz. */
  function runShortcut(eylem: ScriptShortcut) {
    if (!target || busy) return;
    switch (eylem) {
      case 'calistir':
      case 'dene': {
        const deneme = eylem === 'dene';
        if ((deneme ? rangeTryReasons : rangeRunReasons).length > 0) return;
        runRange(deneme);
        return;
      }
      case 'tumunuCalistir':
      case 'tumunuDene': {
        const deneme = eylem === 'tumunuDene';
        if (!hasStatements || (deneme ? tryBlocked : blocked)) return;
        runAll(deneme);
      }
    }
  }
  useScriptCommand(!hidden, runShortcut);

  /**
   * Grid sona yaklaştı: transaction açıksa ve sonucun devamı varsa bir sayfa daha istenir. Yanıt
   * gelene kadar aynı sonuç için ikinci istek gitmez (görünüm güncellenmeden gelen kaydırmalar dahil).
   */
  function fetchMore(i: number) {
    if (!run || !canFetchMore(run, i) || moreAsked.current.has(i)) return;
    moreAsked.current.add(i);
    handle.current?.send({ type: 'dahaFazla', i });
    setRun((current) => (current ? requestMore(current, i) : current));
  }

  function request(type: 'commit' | 'rollback' | 'uzat' | 'iptal') {
    handle.current?.send({ type });
    setRun((current) => (current ? { ...current, bekleyenIstek: type, uyari: undefined } : current));
  }

  // Satır işaretleri yalnızca editördeki metin çalıştırılanla aynıyken anlamlı.
  const marks = useMemo((): EditorMarks => {
    if (!run || run.editorMetni !== script) return analyzed === script ? analysisMarks(script, statements, analysis) : NO_MARKS;
    const lines = new Map<number, StatementStatus>();
    for (const s of run.ifadeler) {
      const existing = lines.get(s.satir);
      if (existing === undefined || PRIORITY[s.durum] > PRIORITY[existing]) lines.set(s.satir, s.durum);
    }
    const failed = run.ifadeler.find((s) => s.hata);
    return { lines, error: failed?.hata ? { bas: failed.hata.bas, bit: failed.hata.bit } : null };
  }, [run, script, analyzed, statements, analysis]);

  const goToLine = useCallback((line: number) => editor.current?.goToLine(line), []);
  /** Okuma'da karar kartı yok; yerinde ince bir durum satırı durur (ADR-0004). */
  const reading = run?.evre === 'okuma' || run?.sonuc === 'okuma';

  /** Editör + Sonuç alanının yüksekliği; ölçülemezse (jsdom) pencere yüksekliği. */
  const govde = useRef<HTMLDivElement>(null);
  const [toplam, setToplam] = useState(() => window.innerHeight);
  useLayoutEffect(() => {
    const el = govde.current;
    if (!el) return;
    const measure = () => setToplam(el.clientHeight || window.innerHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  /** Sürüklenirken oran; bırakınca tercihe yazılır. */
  const [surukleme, setSurukleme] = useState<number | null>(null);
  const oran = surukleme ?? sonucOrani;
  /** Kullanıcı şeritte (ya da Log'daki bildirim sayacıyla) sekme seçti; daraltılmış alan açılır. */
  const selectTab = (anahtar: SonucSekmesiAnahtari) => {
    setSekmeSecimi((s) => kullaniciSecti(s ?? { secili: 'log', elle: false }, anahtar));
    if (sonucDaraltilmis) onSonucAlani({ sonucDaraltilmis: false });
  };
  const bildirimSayaclari = bildirimSayilari(run);

  return (
    <div className="script-ekrani" hidden={hidden}>
      <section aria-label="Hedef" className={`hedef-basligi${prod ? ' prod' : ''}${lock === 'yazma-acik' ? ' yazma-acik' : ''}`}>
        {target ? (
          <>
            <span
              className="hedef-noktasi"
              data-testid="hedef-noktasi"
              style={{ backgroundColor: target.connection.color ?? 'transparent' }}
              aria-hidden="true"
            />
            <h2 className="hedef-adi">
              {target.connection.name} <span className="soluk">/</span> {target.database}
            </h2>
            {target.connection.envTag && <OrtamRozeti etiket={target.connection.envTag} renk={target.connection.color} />}
            <KilitDugmesi lock={lock} onToggle={onToggleWriteMode} disabled={busy} />
          </>
        ) : (
          <>
            <h2 className="hedef-adi soluk">Hedef seçilmedi</h2>
            <span className="soluk kucuk">Soldaki gezginden bir veritabanı seçin.</span>
          </>
        )}
        {target && <KatalogDugmesi catalog={catalog} onRefresh={() => onCatalog?.('yenile')} />}
        <Dugme tur="sade" boyut="kucuk" className="hedef-degistir" onClick={onChangeTarget}>
          hedefi değiştir <ChevronDown aria-hidden="true" />
        </Dugme>
        <Dugme tur="sade" boyut="kucuk" className="kayit-klasoru" onClick={openHistoryFolder}>
          Çalıştırma kayıtları klasörünü aç
        </Dugme>
        {folderError && (
          <span role="alert" className="uyari kucuk">
            {folderError}
          </span>
        )}
      </section>
      {analysis.mod === 'autocommit' && (
        <div role="note" aria-label="Autocommit uyarısı" className="uyari-seridi autocommit">
          <TriangleAlert aria-hidden="true" /> {analysis.transactionDisi.length} ifade anında kalıcı uygulanır, geri alınamaz
        </div>
      )}
      {runOnProd && run?.deneme && <DenemeProdUyarisi />}
          <div className="script-cubugu">
            <Rozet tur={MODE_ROZETLERI[analysis.mod]} title="Çalıştırma modu" className={`mod-rozeti ${analysis.mod}`}>
              {MODE_LABELS[analysis.mod]}
            </Rozet>
            {running ? (
              <Dugme tur="tehlikeli" onClick={() => request('iptal')} disabled={run.bekleyenIstek === 'iptal'}>
                <Square aria-hidden="true" /> İptal
              </Dugme>
            ) : (
              <>
                {notice && (
                  <span role="status" aria-label="Çalıştırma bildirimi" className="soluk kucuk">
                    {notice}
                  </span>
                )}
                <Dugme
                  title={
                    tryBlocked ? tryReasons.map(formatReason).join('\n') : `Tüm script'i çalıştır ve her zaman geri al (${kisayol('tumunuDene')})`
                  }
                  aria-keyshortcuts="Control+Alt+Shift+Enter Meta+Alt+Shift+Enter"
                  onClick={() => runAll(true)}
                  disabled={!target || busy || !hasStatements || tryBlocked}
                >
                  Tümünü dene
                </Dugme>
                <Dugme
                  title={
                    !aralik
                      ? NO_RANGE_MESSAGE
                      : rangeTryReasons.length > 0
                        ? rangeTryReasons.map(formatReason).join('\n')
                        : `Seçimi ya da imleçteki ifadeyi çalıştır ve her zaman geri al (${kisayol('dene')})`
                  }
                  aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter"
                  onClick={() => runRange(true)}
                  disabled={!target || busy || !aralik || rangeTryReasons.length > 0}
                >
                  <FlaskConical aria-hidden="true" /> Dene
                </Dugme>
                <Dugme
                  title={blocked ? reasons.map(formatReason).join('\n') : `Tüm script'i çalıştır (${kisayol('tumunuCalistir')})`}
                  aria-keyshortcuts="Control+Alt+Enter Meta+Alt+Enter"
                  onClick={() => runAll(false)}
                  disabled={!target || busy || !hasStatements || blocked}
                >
                  Tümünü çalıştır
                </Dugme>
                <Dugme
                  tur="birincil"
                  title={
                    !aralik
                      ? NO_RANGE_MESSAGE
                      : rangeRunReasons.length > 0
                        ? rangeRunReasons.map(formatReason).join('\n')
                        : `Seçimi ya da imleçteki ifadeyi çalıştır (${kisayol('calistir')})`
                  }
                  aria-keyshortcuts="Control+Enter Meta+Enter"
                  onClick={() => runRange(false)}
                  disabled={!target || busy || !aralik || rangeRunReasons.length > 0}
                >
                  <Play aria-hidden="true" /> Çalıştır
                </Dugme>
              </>
            )}
          </div>
      {!busy && blocked && <BlockReasons reasons={reasons} />}
      <div className="script-govde" ref={govde}>
        <section aria-label="Script editörü" className="editor-alani" onKeyDownCapture={onEditorShortcut}>
          <ScriptEditoru ref={editor} value={script} onChange={onScriptChange} readOnly={busy} marks={marks} completion={completion} onSelectionChange={setSecim} />
        </section>
        {!sonucDaraltilmis && (
          <Bolucu
            yon="yatay"
            {...editorBoyu(oran, toplam)}
            adim={16}
            varsayilan={editorBoyu(ARAYUZ_TERCIHLERI_VARSAYILAN.sonucOrani, toplam).deger}
            onDegis={(v) => setSurukleme(sonucOraniniBul(v, toplam))}
            onBitir={(v) => {
              setSurukleme(null);
              onSonucAlani({ sonucOrani: sonucOraniniBul(v, toplam) });
            }}
            aria-label="Editör ile Sonuç alanı arası"
          />
        )}
        <div className={`sonuc-bolumu${sonucDaraltilmis ? ' daraltilmis' : ''}`} style={sonucDaraltilmis ? undefined : { flexBasis: `${oran * 100}%` }}>
          {run && (
            // Karar şeridi: hangi sekme açık olursa olsun görünür.
            <div className="karar-seridi">
              {reading ? (
                <OkumaDurumu run={run} deadline={run.evre === 'okuma' ? deadline : null} />
              ) : (
                <KararKarti
                  run={run}
                  deadline={run.evre === 'karar' ? deadline : null}
                  onRequest={request}
                  poolFullTabs={poolFullTabs}
                  onGoToTab={onGoToTab}
                />
              )}
            </div>
          )}
          <SonucAlani
            run={run}
            runNo={runNo}
            shown={gosterilenSekme(sekmeSecimi, run)}
            onSelect={selectTab}
            daraltilmis={sonucDaraltilmis}
            onToggle={() => onSonucAlani({ sonucDaraltilmis: !sonucDaraltilmis })}
            onMore={fetchMore}
            tipAdlari={tipAdlari}
            log={
              run ? (
                <ol className="ifade-kartlari">
                  {run.ifadeler.map((s) => (
                    <IfadeKarti
                      key={s.i}
                      statement={s}
                      onGoTo={goToLine}
                      bildirimSayisi={bildirimSayaclari.get(s.i)}
                      onBildirimler={() => selectTab('bildirimler')}
                      onForceTransaction={
                        busy ? undefined : () => start(false, { zorlaTransaction: true, metin: run.script, yer: { bas: run.bas, editorMetni: run.editorMetni } })
                      }
                    />
                  ))}
                </ol>
              ) : (
                <p className="soluk kucuk">Script çalıştırılınca ifadeler ve SELECT sonuçları burada açılır.</p>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

/** Yenile ikonu: hedefin katalogunu yeniden okutur; durum düğmenin açıklamasında. */
function KatalogDugmesi({ catalog, onRefresh }: { catalog: CatalogEntry | undefined; onRefresh: () => void }) {
  const loading = catalog?.durum === 'yukleniyor';
  const title = !catalog
    ? 'Katalog okunmadı; tamamlama için yenileyin'
    : loading
      ? 'Katalog okunuyor…'
      : catalog.durum === 'hata'
        ? `Katalog okunamadı: ${catalog.hata}`
        : `Katalog: ${catalog.katalog.iliskiler.length} ilişki · yenile`;
  return (
    <Dugme
      tur="sade"
      ikon
      className={`katalog-yenile${catalog?.durum === 'hata' ? ' hata' : ''}`}
      aria-label="Katalogu yenile"
      title={title}
      disabled={loading}
      onClick={onRefresh}
    >
      <RefreshCw aria-hidden="true" />
    </Dugme>
  );
}

/** Script neden çalıştırılamıyor: reddedilen ifadeler ve Karışık script. */
function BlockReasons({ reasons }: { reasons: ReturnType<typeof runBlockReasons> }) {
  return (
    <ul className="analiz-sorunlari kucuk">
      {reasons.map(({ satir, mesaj }) => (
        <li key={`${satir}:${mesaj}`}>{formatReason({ satir, mesaj })}</li>
      ))}
    </ul>
  );
}

function formatReason({ satir, mesaj }: { satir: number | null; mesaj: string }): string {
  return satir === null ? mesaj : `Satır ${satir}: ${mesaj}`;
}

/**
 * Okuma modunun durum satırı: karar sorulmaz; transaction yalnızca daha fazla satır için açıktır ve
 * Karar süresi dolunca, yeniden çalıştırınca ya da sekme kapanınca geri alınır.
 */
function OkumaDurumu({ run, deadline }: { run: RunView; deadline: DecisionTimer | null }) {
  const remaining = useCountdown(deadline);
  return (
    <section role="status" aria-label="Okuma durumu" className="okuma-durumu kucuk">
      {run.evre === 'okuma' ? (
        <span>
          Okuma · transaction açık
          {remaining && (
            <>
              {' '}
              · kalan{' '}
              <span role="timer" aria-label="Kalan süre">
                {formatRemaining(remaining.kalanMs)}
              </span>
            </>
          )}
        </span>
      ) : (
        <span>{resultText(run)}</span>
      )}
      <BekletmeGostergesi oturumlar={run.bekletilenler} />
      {run.uyari && <span className="uyari">{run.uyari}</span>}
      {run.kayitUyarisi && (
        <span className="uyari">
          <TriangleAlert aria-hidden="true" /> {run.kayitUyarisi}
        </span>
      )}
    </section>
  );
}


function IfadeKarti({
  statement: s,
  onGoTo,
  onForceTransaction,
  bildirimSayisi = 0,
  onBildirimler,
}: {
  statement: StatementView;
  onGoTo: (line: number) => void;
  /** 25006 sonrası "Transaction modunda çalıştır"; çalıştırma sürerken yok. */
  onForceTransaction?: () => void;
  /** Bu ifade çalışırken gelen Sunucu bildirimi sayısı; sayaç Bildirimler sekmesine götürür. */
  bildirimSayisi?: number;
  onBildirimler: () => void;
}) {
  return (
    <li className={`ifade-karti ${s.durum}`}>
      <div className="ifade-karti-satiri">
        <button type="button" className="ifade-karti-basligi" onClick={() => onGoTo(s.satir)}>
          <span className={`ifade-isareti ${s.durum}`} aria-hidden="true">
            <DurumIkonu durum={s.durum} />
          </span>
          <span className="komut-etiketi">{s.komut}</span>
          <span className="soluk">satır {s.satir}</span>
          {s.ms !== undefined && <span className="soluk sure">{s.ms} ms</span>}
        </button>
        {bildirimSayisi > 0 && (
          <Dugme tur="sade" boyut="kucuk" className="bildirim-sayaci" onClick={onBildirimler}>
            {bildirimSayisi} bildirim
          </Dugme>
        )}
      </div>
      <StatementDetail statement={s} onForceTransaction={onForceTransaction} />
    </li>
  );
}

/**
 * Bildirimler sekmesi: Sunucu bildirimleri geldikleri sırayla; satır, seviye, mesaj ve varsa
 * DETAIL/HINT. Düz metindir, seçilip kopyalanabilir.
 */
function Bildirimler({ run }: { run: RunView }) {
  return (
    <>
      <ol aria-label="Sunucu bildirimleri" className="bildirim-listesi kucuk">
        {run.bildirimler.map((b, n) => (
          <li key={n} className={`bildirim ${b.seviye.toLowerCase()}`}>
            <Rozet tur={b.seviye === 'WARNING' ? 'dikkat' : 'notr'}>{b.seviye}</Rozet>
            {b.satir !== null && <span className="soluk">satır {b.satir}</span>}
            <span className="bildirim-mesaji">{b.mesaj}</span>
            {b.detay && <p className="bildirim-eki">DETAIL: {b.detay}</p>}
            {b.ipucu && <p className="bildirim-eki">HINT: {b.ipucu}</p>}
          </li>
        ))}
      </ol>
      {run.bildirimFazlasi !== undefined && run.bildirimFazlasi > 0 && (
        <p className="soluk kucuk">+{run.bildirimFazlasi} bildirim daha gösterilmedi</p>
      )}
    </>
  );
}

function StatementDetail({ statement: s, onForceTransaction }: { statement: StatementView; onForceTransaction?: () => void }) {
  switch (s.durum) {
    case 'sirada':
    case 'calisiyor':
    case 'calistirilmadi':
      return <p className="soluk kucuk">{STATUS_LABELS[s.durum]}</p>;
    case 'hatali':
      return (
        <>
          <p className="ifade-hatasi kucuk">
            {s.hata?.sqlstate && <code>{s.hata.sqlstate}</code>} {s.hata?.mesaj}
          </p>
          {s.hata?.ipucu && <p className="ifade-ipucu kucuk">{s.hata.ipucu}</p>}
          {s.hata?.transactionOnerisi && (
            <p className="ifade-ipucu kucuk">
              Okuma sanılan ifade yazmaya çalıştı.{' '}
              <Dugme boyut="kucuk" onClick={onForceTransaction} disabled={!onForceTransaction}>
                Transaction modunda çalıştır
              </Dugme>
            </p>
          )}
        </>
      );
    case 'basarili':
      // Satırlar editörün altındaki sonuç sekmesinde; kartta yalnızca sayı.
      // Devamı olan sonucun toplamı bilinmez: yüklenenler "+" ile.
      if (s.onizleme) return <p className="kucuk">{s.rowCount ?? `${s.onizleme.satirlar.length}${s.onizleme.dahaVar ? '+' : ''}`} satır</p>;
      return s.rowCount === null || s.rowCount === undefined ? null : <p className="kucuk">{s.rowCount} satır etkilendi</p>;
  }
}

/**
 * Sonuç alanı: Sonuç sekmeleri (satır döndüren her ifadeye bir), Log ve (Deneme'de) Değişiklikler
 * tek şeritte. Yeni çalıştırmanın görünümünde önizleme yoktur; eski Sonuç sekmeleri kendiliğinden
 * silinir. Gizli sekmelerin grid'leri (seçim, kolon genişliği) yerinde kalır. Şerit tek sekme
 * durağıdır: oklar ve Home/End sekme seçer. Daraltılınca yalnızca şerit kalır.
 */
function SonucAlani({
  run,
  runNo,
  shown,
  onSelect,
  daraltilmis,
  onToggle,
  onMore,
  tipAdlari,
  log,
}: {
  run: RunView | null;
  runNo: number;
  shown: SonucSekmesiAnahtari;
  onSelect: (anahtar: SonucSekmesiAnahtari) => void;
  daraltilmis: boolean;
  onToggle: () => void;
  /** `i`. sonucun grid'i yüklü satırların sonuna yaklaştı. */
  onMore: (i: number) => void;
  /** Katalogdan OID → tip adı ("INSERT olarak kopyala"). */
  tipAdlari?: ReadonlyMap<number, string>;
  /** Log sekmesinin içeriği. */
  log: ReactNode;
}) {
  const id = useId();
  const tabs = sonucSekmeleri(run);
  const tabId = (t: SonucAlaniSekmesi) => `${id}-sekme-${runNo}-${t.anahtar}`;
  const panelId = (t: SonucAlaniSekmesi) => `${id}-panel-${runNo}-${t.anahtar}`;

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const at = tabs.findIndex((t) => t.anahtar === shown);
    const last = tabs.length - 1;
    const to = { ArrowRight: at === last ? 0 : at + 1, ArrowLeft: at === 0 ? last : at - 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = tabs[to]!;
    onSelect(next.anahtar);
    document.getElementById(tabId(next))?.focus();
  }

  function panel(t: SonucAlaniSekmesi) {
    if (t.i !== undefined) {
      const s = run!.ifadeler[t.i]!;
      return (
        <>
          <p className="kucuk soluk sonuc-ozeti">
            {resultSummary(s.onizleme!, s.rowCount)}
            {s.yukleniyor && (
              <span>
                {' · '}
                <Yukleniyor>Satırlar yükleniyor…</Yukleniyor>
              </span>
            )}
            {s.sinir && <span className="sonuc-notu"> · {ROW_LIMIT_MESSAGE}</span>}
            {s.devamKapandi && <span className="sonuc-notu"> · {s.devamKapandi}</span>}
          </p>
          <SonucGovdesi
            etiket={`${t.etiket} sonucu`}
            kolonlar={s.onizleme!.kolonlar}
            tipler={s.onizleme!.tipler}
            tipAdlari={tipAdlari}
            satirlar={s.onizleme!.satirlar}
            toplamSatir={resultTotal(s.onizleme!, s.rowCount)}
            onSonaYaklasti={() => onMore(s.i)}
          />
        </>
      );
    }
    if (t.anahtar === 'degisiklikler') return run && <Degisiklikler run={run} />;
    if (t.anahtar === 'bildirimler') return run && <Bildirimler run={run} />;
    return log;
  }

  return (
    <section aria-label="Sonuç alanı" className={`sonuc-alani${daraltilmis ? ' daraltilmis' : ''}`}>
      <div className="sonuc-seridi">
        <div role="tablist" aria-label="Sonuç alanı sekmeleri" className="sekmeler" onKeyDown={onTabKeyDown}>
          {tabs.map((t) => (
            <button
              key={t.anahtar}
              id={tabId(t)}
              type="button"
              role="tab"
              aria-selected={t.anahtar === shown}
              aria-controls={panelId(t)}
              tabIndex={t.anahtar === shown ? 0 : -1}
              className={`sekme${t.anahtar === shown ? ' secili' : ''}`}
              onClick={() => onSelect(t.anahtar)}
            >
              {t.etiket}
            </button>
          ))}
        </div>
        <Dugme
          tur="sade"
          boyut="kucuk"
          ikon
          className="sonuc-alani-dugmesi"
          aria-expanded={!daraltilmis}
          aria-label={daraltilmis ? 'Sonuç alanını aç' : 'Sonuç alanını daralt'}
          title={daraltilmis ? 'Sonuç alanını aç' : 'Sonuç alanını daralt'}
          onClick={onToggle}
        >
          {daraltilmis ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </Dugme>
      </div>
      {tabs.map((t) => (
        <div
          key={`${runNo}:${t.anahtar}`}
          id={panelId(t)}
          role="tabpanel"
          aria-labelledby={tabId(t)}
          className={t.i === undefined ? 'ifade-listesi' : 'sonuc-paneli'}
          hidden={daraltilmis || t.anahtar !== shown}
        >
          {panel(t)}
        </div>
      ))}
    </section>
  );
}
