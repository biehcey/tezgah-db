import { useEffect, useState } from 'react';

/** Tarayıcı penceresinin genişliği; yeniden boyutlanınca güncellenir. */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

/**
 * Açık bir pencere (`aria-modal` diyalog: onay, şifre, klasör, hızlı geçiş, içe aktarma) var mı.
 * Uygulama geneli kısayollar pencere açıkken çalışmaz.
 */
export function modalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** Apple platformu: kısayol ipuçlarında Ctrl yerine ⌘ / Cmd yazılır. */
export const APPLE = /Mac|iPhone|iPad/.test(navigator.platform);
