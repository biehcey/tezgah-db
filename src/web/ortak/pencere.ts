import { useEffect, useState } from 'react';
import { ariaKeyShortcuts, shortcutText, type Platform, type ShortcutId } from '../../core/kisayollar';

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

export const PLATFORM: Platform = APPLE ? 'mac' : 'diger';

/** Katalogdaki kısayolun bu platformdaki metni (tooltip, menü, palet, kısayol sayfası). */
export function kisayol(id: ShortcutId): string {
  return shortcutText(id, PLATFORM);
}

/** Katalogdaki kısayolun bu platformdaki `aria-keyshortcuts` değeri. */
export function ariaKisayol(id: ShortcutId): string {
  return ariaKeyShortcuts(id, PLATFORM);
}

const NON_TEXT_INPUTS = ['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file'];

/** Odak yazı yazılan bir yerde mi: metin alanı, editör (contenteditable) ya da grid hücre düzenleyicisi. */
export function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.includes(target.type);
}
