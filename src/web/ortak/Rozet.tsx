import type { HTMLAttributes } from 'react';
import { DEFAULT_ENV_COLORS, type EnvTag } from '../../core/baglanti';
import { rozetYaziRengi } from '../../core/rozet-rengi';

/** Rozetin anlamı: nötr çerçeveli, dolu vurgu/uyarı ya da semantik renkli çerçeveli. */
export type RozetTuru = 'notr' | 'vurgu' | 'basari' | 'dikkat' | 'tehlike' | 'sayi';

interface RozetProps extends HTMLAttributes<HTMLSpanElement> {
  tur?: RozetTuru;
}

/** Tüm çip/rozetlerin ortak görünümü (`.rozet` + türü). */
export function Rozet({ tur = 'notr', className, ...props }: RozetProps) {
  return <span {...props} className={`rozet rozet-${tur}${className ? ` ${className}` : ''}`} />;
}

interface OrtamRozetiProps extends HTMLAttributes<HTMLSpanElement> {
  etiket: EnvTag;
  /** Bağlantının rengi; yoksa etiketin varsayılan rengi. */
  renk?: string | null;
}

/** Ortam etiketi rozeti: zemin bağlantı rengi, yazı zemine göre kontrastlı siyah ya da beyaz. */
export function OrtamRozeti({ etiket, renk, className, style, ...props }: OrtamRozetiProps) {
  const zemin = renk ?? DEFAULT_ENV_COLORS[etiket];
  return (
    <span
      {...props}
      className={`rozet rozet-ortam${className ? ` ${className}` : ''}`}
      style={{ ...style, backgroundColor: zemin, borderColor: zemin, color: rozetYaziRengi(zemin) }}
    >
      {etiket}
    </span>
  );
}
