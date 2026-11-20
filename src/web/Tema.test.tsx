import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { ArayuzTercihleri } from '../core/arayuz-tercihleri';
import { App } from './App';
import { createFakeConnections, renderWithApi } from './test/sahte-api';

const theme = () => document.documentElement.getAttribute('data-theme');

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

async function setup(saved?: Partial<ArayuzTercihleri>) {
  const user = userEvent.setup();
  const fake = createFakeConnections();
  fake.preferences = { ...fake.preferences, ...saved };
  renderWithApi(<App />, fake.api);
  const palette = async () => {
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('Tema');
  };
  return { user, fake, palette };
}

describe('App: tema seçimi', () => {
  it('açılışta okunan tema <html data-theme> ile uygulanır', async () => {
    await setup({ tema: 'koyu' });
    await waitFor(() => expect(theme()).toBe('koyu'));
  });

  it('tercih gelene kadar ve "sistem" iken data-theme verilmez (CSS işletim sistemini izler)', async () => {
    const { fake } = await setup({ tema: 'sistem' });
    expect(theme()).toBeNull();
    await waitFor(() => expect(fake.preferenceWrites).toEqual([]));
    expect(theme()).toBeNull();
  });

  it('palette "Tema: Koyu" temayı değiştirir ve tercihi yazar; diğer tercihler korunur', async () => {
    const { user, fake, palette } = await setup({ gezgin: { acik: false, genislik: 320 } });
    await palette();
    await user.click(screen.getByRole('option', { name: /^Tema: Koyu/ }));
    expect(theme()).toBe('koyu');
    await waitFor(() => expect(fake.preferenceWrites.at(-1)?.tema).toBe('koyu'));
    expect(fake.preferenceWrites.at(-1)?.gezgin).toEqual({ acik: false, genislik: 320 });
  });

  it('"Tema: Sistem" data-theme\'i kaldırır', async () => {
    const { user, fake, palette } = await setup({ tema: 'acik' });
    await waitFor(() => expect(theme()).toBe('acik'));
    await palette();
    await user.click(screen.getByRole('option', { name: /^Tema: Sistem/ }));
    expect(theme()).toBeNull();
    await waitFor(() => expect(fake.preferenceWrites.at(-1)?.tema).toBe('sistem'));
  });

  it('palette etkin tema işaretlidir', async () => {
    const { palette } = await setup({ tema: 'acik' });
    await waitFor(() => expect(theme()).toBe('acik'));
    await palette();
    expect(screen.getByRole('option', { name: /^Tema: Açık/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('option', { name: /^Tema: Koyu/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('option', { name: /^Tema: Sistem/ })).toHaveAttribute('aria-checked', 'false');
  });
});
