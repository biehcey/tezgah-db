import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type DugmeTuru = 'birincil' | 'ikincil' | 'tehlikeli' | 'sade';
export type DugmeBoyutu = 'normal' | 'kucuk';

interface DugmeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tur?: DugmeTuru;
  boyut?: DugmeBoyutu;
  /** Yalnızca ikon taşıyan kare düğme; erişilebilir adı `aria-label`/`title` verir. */
  ikon?: boolean;
}

/** Uygulamanın tek düğme görünümü: dört tür, iki boyut. `type` varsayılanı `button`. */
export const Dugme = forwardRef<HTMLButtonElement, DugmeProps>(function Dugme(
  { tur = 'ikincil', boyut = 'normal', ikon = false, type = 'button', className, ...props },
  ref,
) {
  const siniflar = ['dugme', `dugme-${tur}`, boyut === 'kucuk' && 'dugme-kucuk', ikon && 'dugme-ikon', className];
  return <button ref={ref} type={type} {...props} className={siniflar.filter(Boolean).join(' ')} />;
});
