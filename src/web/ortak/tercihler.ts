import { useCallback, useEffect, useRef, useState } from 'react';
import { ARAYUZ_TERCIHLERI_VARSAYILAN, normalizeArayuzTercihleri, type ArayuzTercihleri, type Tema } from '../../core/arayuz-tercihleri';
import { useApi } from '../api/client';

const currentWindow = () => ({ genislik: window.innerWidth });

type PreferenceChange = Partial<Omit<ArayuzTercihleri, 'surum'>>;

/**
 * Arayüz tercihleri: açılışta bir kez okunur (gelene kadar varsayılanlar, yani sistem teması),
 * pencereye göre normalleştirilir. `update` durumu hemen değiştirir ve dosyaya yazar; sürüklemede
 * çağıranlar yalnızca sürükleme bitince çağırır.
 */
export function usePreferences() {
  const api = useApi();
  const [preferences, setPreferences] = useState<ArayuzTercihleri>(() => structuredClone(ARAYUZ_TERCIHLERI_VARSAYILAN));
  const latest = useRef(preferences);
  // Okuma bitmeden yapılan değişiklik, gelen tercihle ezilmez.
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.readPreferences().then(
      (raw) => {
        if (cancelled || touched.current) return;
        latest.current = normalizeArayuzTercihleri(raw, currentWindow());
        setPreferences(latest.current);
      },
      (err: unknown) => console.error('Arayüz tercihleri okunamadı', err),
    );
    return () => {
      cancelled = true;
    };
  }, [api]);

  /** Değişiklik ya da güncel tercihten değişikliği üreten fonksiyon (art arda kısayollar eski durumu görmesin). */
  const update = useCallback(
    (change: PreferenceChange | ((current: ArayuzTercihleri) => PreferenceChange)) => {
      touched.current = true;
      const delta = typeof change === 'function' ? change(latest.current) : change;
      latest.current = normalizeArayuzTercihleri({ ...latest.current, ...delta }, currentWindow());
      setPreferences(latest.current);
      api.writePreferences(latest.current).catch((err: unknown) => console.error('Arayüz tercihleri yazılamadı', err));
    },
    [api],
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
