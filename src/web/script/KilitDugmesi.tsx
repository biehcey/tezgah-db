import type { WriteLockState } from '../../core/yazma-kilidi';
import { Dugme } from '../ortak/Dugme';
import { WRITE_LOCK_LABELS } from './durum';
import { KilitIkonu } from './ikonlar';

interface Props {
  /** prod hedefin kilidi; prod olmayan hedefte (`null`) hiçbir şey çizilmez. */
  lock: WriteLockState;
  /** Sekmenin yazma modunu tek tıkla açar ya da kapatır; onay istenmez (değişmez kural). */
  onToggle: () => void;
  /** Çalıştırma sürerken kapalı: açık transaction'ın kilidi değişmez. */
  disabled?: boolean;
}

/**
 * Yazma kilidinin tek kontrolü: hem durumu gösterir hem değiştirir. Konsolun ve Tablo sekmesinin
 * başlığında durur; yazma açıkken başlık dolu kırmızıdır (`yazma-acik`).
 */
export function KilitDugmesi({ lock, onToggle, disabled = false }: Props) {
  if (!lock) return null;
  const acik = lock === 'yazma-acik';
  return (
    <Dugme
      tur={acik ? 'tehlikeli' : 'ikincil'}
      boyut="kucuk"
      className={`kilit-dugmesi${acik ? ' acik' : ''}`}
      aria-pressed={acik}
      title={WRITE_LOCK_LABELS[lock].eylem}
      onClick={onToggle}
      disabled={disabled}
    >
      <KilitIkonu durum={lock} />
      {WRITE_LOCK_LABELS[lock].etiket}
    </Dugme>
  );
}
