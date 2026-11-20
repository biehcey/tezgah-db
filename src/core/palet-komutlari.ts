/**
 * Cmd/Ctrl+K paletinin komut listesi: o anki durumdan komutlar, uygulanamayanlar pasif ve kısa bir
 * notla. Komutun eylemi arayüzde kimliğe göre bağlanır.
 */
import { TEMALAR, type Tema } from './arayuz-tercihleri';
import type { ShortcutId } from './kisayollar';

export interface PaletteState {
  /** Etkin sekmenin türü; sekme yoksa `null`. */
  sekme: 'konsol' | 'tablo' | null;
  /** Etkin sekmenin hedefi var. */
  hedef: boolean;
  /** Hedef prod etiketli. */
  prod: boolean;
  /** Etkin sekmenin yazma modu açık. */
  yazmaModu: boolean;
  /** Etkin sekmede çalışma sürüyor ya da karar bekleniyor: nedeni (hedef kilidi); yoksa `null`. */
  calisma: string | null;
  tema: Tema;
  gezginAcik: boolean;
  /** Konsol sekmelerinin Sonuç alanı daraltılmış (Arayüz tercihi). */
  sonucDaraltilmis: boolean;
  /** Konsol gizli (bağlantı formu açık). */
  konsolGizli: boolean;
}

export type PaletteCommandId =
  | 'calistir'
  | 'tumunuCalistir'
  | 'dene'
  | 'tumunuDene'
  | 'yazmaModu'
  | 'yeniKonsol'
  | 'gecmis'
  | 'gezgin'
  | 'sonucAlani'
  | `tema:${Tema}`
  | 'kisayollar'
  | 'yeniBaglanti'
  | 'yeniKlasor'
  | 'iceAktar'
  | 'kayitKlasoru';

export interface PaletteCommandItem {
  id: PaletteCommandId;
  etiket: string;
  /** Pasifse kısa nedeni; etkinse yok. */
  pasif?: string;
  /** Katalogdaki kısayolu. */
  kisayol?: ShortcutId;
  /** Seçeneklerden biri olan komutta (tema) etkin olan. */
  secili?: boolean;
}

const THEME_LABELS: Record<Tema, string> = { sistem: 'Sistem', acik: 'Açık', koyu: 'Koyu' };

/** Script çalıştırma komutlarının engeli: sekme, hedef, çalışma sırasıyla. */
function runBlock(s: PaletteState): string | undefined {
  if (s.konsolGizli) return 'bağlantı formu açık';
  if (s.sekme === null) return 'açık sekme yok';
  if (s.sekme !== 'konsol') return 'konsol sekmesi değil';
  if (!s.hedef) return 'hedef seçilmedi';
  return s.calisma ?? undefined;
}

function writeModeBlock(s: PaletteState): string | undefined {
  if (s.konsolGizli) return 'bağlantı formu açık';
  if (s.sekme === null) return 'açık sekme yok';
  if (!s.hedef) return 'hedef seçilmedi';
  if (!s.prod) return 'yalnızca prod hedefte';
  return s.calisma ?? undefined;
}

/** Sonuç alanı yalnızca konsol sekmesinde var; çalışma sürerken de daraltılıp açılır. */
function resultAreaBlock(s: PaletteState): string | undefined {
  if (s.konsolGizli) return 'bağlantı formu açık';
  if (s.sekme === null) return 'açık sekme yok';
  if (s.sekme !== 'konsol') return 'konsol sekmesi değil';
  return undefined;
}

/** Paletin komutları, sırasıyla: konsol komutları, görünüm ve tema, kısayollar, bağlantı yönetimi. */
export function paletteCommands(s: PaletteState): PaletteCommandItem[] {
  const run = runBlock(s);
  const item = (id: PaletteCommandId, etiket: string, extra: Omit<PaletteCommandItem, 'id' | 'etiket'> = {}): PaletteCommandItem => ({
    id,
    etiket,
    ...extra,
  });
  return [
    item('calistir', 'Çalıştır', { kisayol: 'calistir', pasif: run }),
    item('tumunuCalistir', 'Tümünü çalıştır', { kisayol: 'tumunuCalistir', pasif: run }),
    item('dene', 'Dene', { kisayol: 'dene', pasif: run }),
    item('tumunuDene', 'Tümünü dene', { kisayol: 'tumunuDene', pasif: run }),
    item('yazmaModu', s.yazmaModu ? 'Yazma modunu kapat' : 'Yazma modunu aç', { pasif: writeModeBlock(s) }),
    item('yeniKonsol', 'Yeni konsol'),
    item('gecmis', 'Sorgu geçmişi', { kisayol: 'gecmis', pasif: s.konsolGizli ? 'bağlantı formu açık' : undefined }),
    item('gezgin', s.gezginAcik ? 'Gezgini gizle' : 'Gezgini göster', { kisayol: 'gezgin' }),
    item('sonucAlani', s.sonucDaraltilmis ? 'Sonuç alanını aç' : 'Sonuç alanını daralt', { pasif: resultAreaBlock(s) }),
    ...TEMALAR.map((tema) => item(`tema:${tema}`, `Tema: ${THEME_LABELS[tema]}`, { secili: tema === s.tema })),
    item('kisayollar', 'Kısayollar', { kisayol: 'kisayollar' }),
    item('yeniBaglanti', 'Yeni bağlantı'),
    item('yeniKlasor', 'Yeni klasör'),
    item('iceAktar', 'İçe aktar'),
    item('kayitKlasoru', 'Çalıştırma kayıtları klasörünü aç'),
  ];
}
