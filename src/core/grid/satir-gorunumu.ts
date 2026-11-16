/**
 * Satır görünümü (IntelliJ'nin Record view'ı): seçili satır dikey bir form olarak. Her kolon için
 * ad, tip, PK işareti, tam değer, NULL/DEFAULT yer tutucusu, bekleyen değer işareti ve alanın
 * yazılıp yazılamadığı. Grid'le aynı kurallar: silinecek satır ve salt okunur kolon yazılmaz; ayrıca
 * yüklü satırın PK'sı formda düzenlenmez (eklenen satırınki düzenlenir).
 */
import { DELETED_REASON, isDefaultCell, readOnlyReason, type EditableTable, type GridRow } from './bekleyen';
import { DEFAULT_LABEL, NULL_LABEL } from './gosterim';

export const PK_REASON = 'Birincil anahtar (PK) yüklü satırda düzenlenmez';

type Row = readonly (string | null)[];

export interface RowViewInput {
  kolonlar: readonly string[];
  /** Görünen tip adları; çözülemeyen `null`. */
  tipler: readonly (string | null)[];
  /** PK kolon adları (bilinmiyorsa boş). */
  pk: readonly string[];
  /** Satırın grid'deki sırası (0 tabanlı). */
  sira: number;
  /** Bekleyenleriyle grid satırı (düzenlenebilir tablo) ya da ham satır (konsol sonucu, PK'sız tablo). */
  satir: GridRow | Row;
  /** Düzenlenebilir tablo ya da düzenlemenin kapalı nedeni (konsol sonucu, PK'sız tablo). */
  duzenleme: EditableTable | { kapali: string };
  /** Uygula/Dene sürüyorsa nedeni: satır o bitene kadar yazılmaz. */
  mesgul?: string | null;
}

export interface RowField {
  ad: string;
  tip: string | null;
  pk: boolean;
  /** Tam değer (kırpılmaz); NULL ya da dokunulmamış DEFAULT `null`. */
  deger: string | null;
  yerTutucu: typeof NULL_LABEL | typeof DEFAULT_LABEL | null;
  /** Bekleyen değeri var (eklenen satırda dokunuldu). */
  degisti: boolean;
  /** Bu kolon neden yazılamıyor; satırın tamamı yazılamıyorsa `RowView.neden`'de. */
  saltOkunur: string | null;
  /** Alan düzenlenir: satır da kolon da yazılabilir. */
  yazilabilir: boolean;
}

export interface RowView {
  /** Satırın kimliği: değişince formun yazılmamış taslakları sıfırlanır. */
  anahtar: string;
  baslik: string;
  silinecek: boolean;
  /** Satırın hiçbir alanı yazılamıyorsa nedeni. */
  neden: string | null;
  alanlar: RowField[];
}

export function rowView({ kolonlar, tipler, pk, sira, satir, duzenleme, mesgul = null }: RowViewInput): RowView {
  const grid: Pick<GridRow, 'degerler' | 'durum' | 'degisen'> & { anahtar: string } =
    'degerler' in satir ? satir : { anahtar: String(sira), degerler: satir, durum: null, degisen: [] };
  const table = 'kapali' in duzenleme ? null : duzenleme;
  const neden = !table ? (duzenleme as { kapali: string }).kapali : (mesgul ?? (grid.durum === 'silinecek' ? DELETED_REASON : null));
  const alanlar = kolonlar.map((ad, c): RowField => {
    const isPk = pk.includes(ad);
    const deger = grid.degerler[c] ?? null;
    const saltOkunur = table ? (readOnlyReason(table, c) ?? (isPk && grid.durum !== 'eklendi' ? PK_REASON : null)) : null;
    return {
      ad,
      tip: tipler[c] ?? null,
      pk: isPk,
      deger,
      yerTutucu: isDefaultCell(grid, c) ? DEFAULT_LABEL : deger === null ? NULL_LABEL : null,
      degisti: grid.degisen.includes(c),
      saltOkunur,
      yazilabilir: neden === null && saltOkunur === null,
    };
  });
  return {
    anahtar: grid.anahtar,
    baslik: grid.durum === 'eklendi' ? 'Yeni satır' : `Satır ${sira + 1}`,
    silinecek: grid.durum === 'silinecek',
    neden,
    alanlar,
  };
}
