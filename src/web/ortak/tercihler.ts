import { useCallback, useEffect, useRef, useState } from 'react';
import { ARAYUZ_TERCIHLERI_VARSAYILAN, normalizeArayuzTercihleri, type ArayuzTercihleri, type Tema } from '../../core/arayuz-tercihleri';
import { useApi } from '../api/client';

const currentWindow = () => ({ genislik: window.innerWidth });

type PreferenceChange = Partial<Omit<ArayuzTercihleri, 'surum'>>;
type Change = PreferenceChange | ((current: ArayuzTercihleri) => PreferenceChange);

/** Dosyaya en fazla bu aralıkla yazılır (bölücünün ok tuşu tekrarı, art arda tema). */
export const PREFERENCE_WRITE_INTERVAL_MS = 1000;

const apply = (current: ArayuzTercihleri, change: Change) =>
  normalizeArayuzTercihleri({ ...current, ...(typeof change === 'function' ? change(current) : change) }, currentWindow());

/**
 * Arayüz tercihleri: açılışta bir kez okunur (gelene kadar varsayılanlar, yani sistem teması),
 * pencereye göre normalleştirilir. `update` durumu hemen değiştirir; dosyaya en fazla saniyede bir
 * yazılır (ilk değişiklik hemen, aradakiler aralık dolunca sonuncusuyla; kapanırken bekleyen hemen).
 * Okuma bitmeden yapılan değişiklikler okunan tercihin üstüne yeniden uygulanır, ondan önce yazılmaz.
 */
export function usePreferences() {
  const api = useApi();
  const [preferences, setPreferences] = useState<ArayuzTercihleri>(() => structuredClone(ARAYUZ_TERCIHLERI_VARSAYILAN));
  const latest = useRef(preferences);
  /** Okuma bitene kadar yapılan değişiklikler; okuma bitince `null`. */
  const beforeLoad = useRef<Change[] | null>([]);
  const lastWrite = useRef(-Infinity);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const write = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    dirty.current = false;
    lastWrite.current = Date.now();
    api.writePreferences(latest.current).catch((err: unknown) => console.error('Arayüz tercihleri yazılamadı', err));
  }, [api]);

  const scheduleWrite = useCallback(() => {
    dirty.current = true;
    if (beforeLoad.current !== null || timer.current !== null) return;
    const wait = lastWrite.current + PREFERENCE_WRITE_INTERVAL_MS - Date.now();
    if (wait <= 0) write();
    else timer.current = setTimeout(write, wait);
  }, [write]);

  useEffect(() => {
    let cancelled = false;
    const loaded = (raw: unknown) => {
      if (cancelled) return;
      const pending = beforeLoad.current ?? [];
      beforeLoad.current = null;
      latest.current = pending.reduce(apply, normalizeArayuzTercihleri(raw, currentWindow()));
      setPreferences(latest.current);
      if (pending.length > 0) scheduleWrite();
    };
    api.readPreferences().then(loaded, (err: unknown) => {
      console.error('Arayüz tercihleri okunamadı', err);
      loaded(undefined);
    });
    const flush = () => {
      if (dirty.current && beforeLoad.current === null) write();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [api, scheduleWrite, write]);

  /** Değişiklik ya da güncel tercihten değişikliği üreten fonksiyon (art arda kısayollar eski durumu görmesin). */
  const update = useCallback(
    (change: Change) => {
      beforeLoad.current?.push(change);
      latest.current = apply(latest.current, change);
      setPreferences(latest.current);
      scheduleWrite();
    },
    [scheduleWrite],
  );

  return { preferences, update };
}

/** Temayı `<html data-theme>` ile uygular; `sistem` iken öznitelik yoktur ve CSS `prefers-color-scheme`'i izler. */
export function useTheme(tema: Tema) {
  useEffect(() => {
    const root = document.documentElement;
    if (tema === 'sistem') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', tema);
  }, [tema]);
}
