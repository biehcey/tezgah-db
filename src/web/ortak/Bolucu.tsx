import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { bolucuDegeri } from '../../core/bolucu';

export interface BolucuProps {
  /** `dikey`: yan yana iki alanı ayıran dikey çizgi (yatay sürüklenir); `yatay`: üst üste iki alanı ayırır. */
  yon: 'dikey' | 'yatay';
  deger: number;
  min: number;
  max: number;
  /** Ok tuşlarının bir basışta oynattığı miktar. */
  adim: number;
  /** Çift tıklamanın döndürdüğü değer. */
  varsayilan: number;
  /** Sürüklerken her değişiklikte. */
  onDegis: (deger: number) => void;
  /** Sürükleme bitince, ok tuşunda ve çift tıkta: kalıcı yazma burada yapılır. */
  onBitir: (deger: number) => void;
  'aria-label': string;
}

interface Drag {
  pointerId: number;
  start: number;
  from: number;
  last: number;
}

/**
 * Sürüklenebilir ayırıcı (`role="separator"`). Değer işaretçi ekseninde artar: `dikey`de sağa,
 * `yatay`da aşağı sürüklemek ve →/↓ değeri büyütür; ←/↑ küçültür.
 */
export function Bolucu({ yon, deger, min, max, adim, varsayilan, onDegis, onBitir, 'aria-label': label }: BolucuProps) {
  const drag = useRef<Drag | null>(null);
  const axis = (e: PointerEvent) => (yon === 'dikey' ? e.clientX : e.clientY);

  function commit(next: number) {
    const value = bolucuDegeri(next, min, max);
    onDegis(value);
    onBitir(value);
  }

  function pointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { pointerId: e.pointerId, start: axis(e), from: deger, last: deger };
  }

  function pointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const value = bolucuDegeri(d.from + axis(e) - d.start, min, max);
    if (value === d.last) return;
    d.last = value;
    onDegis(value);
  }

  function pointerEnd(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    // Yerinde tıklama (ör. çift tıklamanın parçaları) yazmaz.
    if (d.last !== d.from) onBitir(d.last);
  }

  function keyDown(e: KeyboardEvent<HTMLDivElement>) {
    const [less, more] = yon === 'dikey' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    if (e.key !== less && e.key !== more) return;
    e.preventDefault();
    commit(deger + (e.key === more ? adim : -adim));
  }

  return (
    <div
      role="separator"
      className={`bolucu bolucu-${yon}`}
      aria-label={label}
      aria-orientation={yon === 'dikey' ? 'vertical' : 'horizontal'}
      aria-valuenow={deger}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={pointerEnd}
      onKeyDown={keyDown}
      onDoubleClick={() => commit(varsayilan)}
    />
  );
}
