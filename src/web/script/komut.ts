import { useEffect, useRef } from 'react';
import type { ScriptShortcut } from '../../core/kisayollar';

const EVENT = 'tezgah:script-komutu';

/** Paletten çalıştırma komutu: etkin (görünür) Script ekranı kısayoluyla aynı işi yapar. */
export function sendScriptCommand(command: ScriptShortcut) {
  window.dispatchEvent(new CustomEvent<ScriptShortcut>(EVENT, { detail: command }));
}

/** `active` iken paletten gelen komutu `handler`'a verir; arkadaki sekmeler dinlemez. */
export function useScriptCommand(active: boolean, handler: (command: ScriptShortcut) => void) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!active) return;
    const listener = (e: Event) => latest.current((e as CustomEvent<ScriptShortcut>).detail);
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [active]);
}
