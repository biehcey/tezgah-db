import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { bolucuSinirla, bolucuTusu, type BolucuYonu } from '../../core/bolucu';

interface Props {
  /** `dikey`: yan yana bölmeler (gezgin); `yatay`: üst üste bölmeler (editör/Sonuç alanı). */
  yon: BolucuYonu;
  /** Önündeki (solundaki ya da üstündeki) bölmenin piksel boyu. */
  deger: number;
  min: number;
  max: number;
  /** Ok tuşunun oynattığı piksel. */
  adim: number;
  /** Çift tıkın döndüğü değer. */
  varsayilan: number;
  /** Sürüklerken her harekette. */
  onDegis: (v: number) => void;
  /** Sürükleme bitince, ok tuşunda ve çift tıkta: kalıcı yazılacak değer. */
  onBitir: (v: number) => void;
  'aria-label': string;
}

/**
 * Sürüklenebilir bölücü: işaretçiyle sürüklenir, odaktayken ok tuşlarıyla `adim` kadar oynar,
 * çift tıkla varsayılana döner. Değer her zaman `min..max` aralığına sınırlanır.
 */
export function Bolucu({ yon, deger, min, max, adim, varsayilan, onDegis, onBitir, 'aria-label': ariaLabel }: Props) {
  const latest = useRef({ min, max, onDegis, onBitir });
  latest.current = { min, max, onDegis, onBitir };
  /** Süren sürüklemenin temizliği. */
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDrag.current?.(), []);

  const sinirla = (v: number) => bolucuSinirla(v, min, max);
  const eksen = (e: { clientX: number; clientY: number }) => (yon === 'dikey' ? e.clientX : e.clientY);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    stopDrag.current?.();
    const bas = eksen(e);
    const basDeger = deger;
    let son = basDeger;
    const move = (ev: PointerEvent) => {
      son = bolucuSinirla(basDeger + eksen(ev) - bas, latest.current.min, latest.current.max);
      latest.current.onDegis(son);
    };
    const up = () => {
      stop();
      latest.current.onBitir(son);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('bolucu-surukleniyor');
      stopDrag.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.body.classList.add('bolucu-surukleniyor');
    stopDrag.current = stop;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const yonu = bolucuTusu(yon, e.key);
    if (yonu === null) return;
    e.preventDefault();
    onBitir(sinirla(deger + yonu * adim));
  }

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={yon === 'dikey' ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(deger)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      tabIndex={0}
      className={`bolucu ${yon}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onBitir(sinirla(varsayilan))}
    />
  );
}
