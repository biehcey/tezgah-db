/**
 * Açık bir pencere (`aria-modal` diyalog: onay, şifre, klasör, hızlı geçiş, içe aktarma) var mı.
 * Uygulama geneli kısayollar pencere açıkken çalışmaz.
 */
export function modalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** Apple platformu: kısayol ipuçlarında Ctrl yerine ⌘ / Cmd yazılır. */
export const APPLE = /Mac|iPhone|iPad/.test(navigator.platform);
