import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ARAYUZ_TERCIHLERI_VARSAYILAN, type ArayuzTercihleri } from '../../core/arayuz-tercihleri';
import { ApiProvider } from '../api/client';
import { createFakeApi } from '../test/sahte-api';
import { usePreferences } from './tercihler';

const SAVED: ArayuzTercihleri = { ...structuredClone(ARAYUZ_TERCIHLERI_VARSAYILAN), tema: 'koyu', gezgin: { acik: false, genislik: 300 } };

function setup({ read = Promise.resolve(structuredClone(SAVED)) }: { read?: Promise<ArayuzTercihleri> } = {}) {
  const writePreferences = vi.fn(async (p: ArayuzTercihleri) => p);
  const api = createFakeApi({ readPreferences: () => read, writePreferences });
  const wrapper = ({ children }: { children: ReactNode }) => <ApiProvider client={api}>{children}</ApiProvider>;
  const hook = renderHook(() => usePreferences(), { wrapper });
  return { hook, writePreferences };
}

/** Okuma sözünün çözülmesini bekler. */
const settle = () => act(async () => {});

describe('usePreferences', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('art arda değişiklikler en fazla saniyede bir yazılır; sonuncusu kaybolmaz', async () => {
    const { hook, writePreferences } = setup();
    await settle();
    act(() => hook.result.current.update({ sonucOrani: 0.5 }));
    act(() => hook.result.current.update({ sonucOrani: 0.55 }));
    act(() => hook.result.current.update({ sonucOrani: 0.6 }));
    expect(writePreferences).toHaveBeenCalledTimes(1);
    expect(writePreferences.mock.calls[0]![0].sonucOrani).toBe(0.5);
    act(() => vi.advanceTimersByTime(999));
    expect(writePreferences).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1));
    expect(writePreferences).toHaveBeenCalledTimes(2);
    expect(writePreferences.mock.calls[1]![0].sonucOrani).toBe(0.6);
    act(() => vi.advanceTimersByTime(5000));
    expect(writePreferences).toHaveBeenCalledTimes(2);
  });

  it('bekleyen yazma kapanırken hemen yapılır', async () => {
    const { hook, writePreferences } = setup();
    await settle();
    act(() => hook.result.current.update({ sonucOrani: 0.5 }));
    act(() => hook.result.current.update({ sonucOrani: 0.6 }));
    hook.unmount();
    expect(writePreferences).toHaveBeenCalledTimes(2);
    expect(writePreferences.mock.calls[1]![0].sonucOrani).toBe(0.6);
  });

  it('okuma bitmeden yapılan değişiklik kayıtlı tercihin üstüne uygulanır, onu ezmez', async () => {
    let resolve!: (p: ArayuzTercihleri) => void;
    const { hook, writePreferences } = setup({ read: new Promise((r) => (resolve = r)) });
    act(() => hook.result.current.update({ sonucDaraltilmis: true }));
    act(() => hook.result.current.update((p) => ({ sonucOrani: p.sonucOrani + 0.1 })));
    expect(writePreferences).not.toHaveBeenCalled();
    await act(async () => resolve({ ...structuredClone(SAVED), sonucOrani: 0.5 }));
    expect(hook.result.current.preferences).toMatchObject({ tema: 'koyu', gezgin: { acik: false, genislik: 300 }, sonucDaraltilmis: true, sonucOrani: 0.6 });
    act(() => vi.runOnlyPendingTimers());
    expect(writePreferences).toHaveBeenLastCalledWith(expect.objectContaining({ tema: 'koyu', gezgin: { acik: false, genislik: 300 }, sonucDaraltilmis: true }));
  });

  it('okuma başarısızsa değişiklik varsayılanların üstüne yazılır', async () => {
    const { hook, writePreferences } = setup({ read: Promise.reject(new Error('yok')) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => hook.result.current.update({ tema: 'acik' }));
    await settle();
    act(() => vi.runOnlyPendingTimers());
    expect(writePreferences).toHaveBeenLastCalledWith(expect.objectContaining({ tema: 'acik' }));
  });
});
