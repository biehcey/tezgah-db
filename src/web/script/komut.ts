import { useEffect, useRef } from 'react';
import type { RunActionState } from '../../core/calistirma-eylemleri';
import type { ScriptShortcut } from '../../core/kisayollar';

const EVENT = 'tezgah:script-komutu';
const QUERY = 'tezgah:script-eylemleri';

type RunActions = Record<ScriptShortcut, RunActionState>;

/** Paletten çalıştırma komutu: etkin (görünür) Script ekranı kısayoluyla aynı işi yapar. */
export function sendScriptCommand(command: ScriptShortcut) {
  window.dispatchEvent(new CustomEvent<ScriptShortcut>(EVENT, { detail: command }));
}

/**
 * Etkin Script ekranının çalıştırma eylemlerinin durumu (palet bunlarla pasif gösterir); etkin
 * Script ekranı yoksa `null`. Olay eşzamanlıdır: dinleyen ekran cevabı hemen yazar.
 */
export function queryScriptActions(): RunActions | null {
  const detail: { eylemler: RunActions | null } = { eylemler: null };
  window.dispatchEvent(new CustomEvent(QUERY, { detail }));
  return detail.eylemler;
}

/**
 * `active` iken paletten gelen komutu `handler`'a verir ve eylem durumunu soran palete `eylemler`i
 * söyler; arkadaki sekmeler dinlemez.
 */
export function useScriptCommand(active: boolean, handler: (command: ScriptShortcut) => void, eylemler: RunActions) {
  const latest = useRef({ handler, eylemler });
  latest.current = { handler, eylemler };
  useEffect(() => {
    if (!active) return;
    const listener = (e: Event) => latest.current.handler((e as CustomEvent<ScriptShortcut>).detail);
    const answer = (e: Event) => {
      (e as CustomEvent<{ eylemler: RunActions | null }>).detail.eylemler = latest.current.eylemler;
    };
    window.addEventListener(EVENT, listener);
    window.addEventListener(QUERY, answer);
    return () => {
      window.removeEventListener(EVENT, listener);
      window.removeEventListener(QUERY, answer);
    };
  }, [active]);
}
