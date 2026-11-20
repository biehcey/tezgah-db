import type { ReactNode } from 'react';

/** Ortak yükleniyor göstergesi: dönen işaret görsel, metin ekran okuyucu için de kalır. */
export function Yukleniyor({ children = 'Yükleniyor…' }: { children?: ReactNode }) {
  return (
    <span className="yukleniyor">
      <span className="yukleniyor-isareti" aria-hidden="true" />
      {children}
    </span>
  );
}
