import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ArayuzTercihleri } from '../../core/arayuz-tercihleri';
import { App } from '../App';
import { connection, createFakeConnections, renderWithApi } from '../test/sahte-api';

// jsdom penceresi 1024 px genişliğindedir: gezgin 200..512 px.
const divider = () => screen.getByRole('separator', { name: 'Gezgin genişliği' });

async function setup(saved?: Partial<ArayuzTercihleri>) {
  const user = userEvent.setup();
  const fake = createFakeConnections([connection()]);
  fake.preferences = { ...fake.preferences, ...saved };
  renderWithApi(<App />, fake.api);
  // Tercih okunana kadar varsayılan genişlik görünür.
  if (saved?.gezgin?.acik !== false) await waitFor(() => expect(divider()).toHaveAttribute('aria-valuenow', String(saved?.gezgin?.genislik ?? 280)));
  return { user, fake };
}

describe('Gezgin genişliği', () => {
  it('bölücü sınırlarını taşır; ok tuşları 16 px oynatır ve her adım tercihe yazılır', async () => {
    const { user, fake } = await setup();
    expect(divider()).toHaveAttribute('aria-orientation', 'vertical');
    expect(divider()).toHaveAttribute('aria-valuemin', '200');
    expect(divider()).toHaveAttribute('aria-valuemax', '512');
    expect(divider()).toHaveAttribute('tabindex', '0');
    divider().focus();
    await user.keyboard('{ArrowRight}');
    expect(divider()).toHaveAttribute('aria-valuenow', '296');
    await waitFor(() => expect(fake.preferenceWrites.at(-1)?.gezgin).toEqual({ acik: true, genislik: 296 }));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(divider()).toHaveAttribute('aria-valuenow', '264');
    await waitFor(() => expect(fake.preferences.gezgin.genislik).toBe(264));
  });

  it('ok tuşları sınırlarda durur', async () => {
    const { user } = await setup({ gezgin: { acik: true, genislik: 504 } });
    divider().focus();
    await user.keyboard('{ArrowRight}');
    expect(divider()).toHaveAttribute('aria-valuenow', '512');
    await user.keyboard('{ArrowRight}');
    expect(divider()).toHaveAttribute('aria-valuenow', '512');
    for (let i = 0; i < 25; i++) await user.keyboard('{ArrowLeft}');
    expect(divider()).toHaveAttribute('aria-valuenow', '200');
  });

  it('çift tık varsayılan 280 px’e döndürür ve yazar', async () => {
    const { user, fake } = await setup({ gezgin: { acik: true, genislik: 400 } });
    await user.dblClick(divider());
    expect(divider()).toHaveAttribute('aria-valuenow', '280');
    await waitFor(() => expect(fake.preferences.gezgin.genislik).toBe(280));
  });

  it('sürükleme sırasında genişlik değişir ama yazılmaz; bırakınca bir kez yazılır', async () => {
    const { fake } = await setup();
    const writes = fake.preferenceWrites.length;
    fireEvent.pointerDown(divider(), { clientX: 280, button: 0, pointerId: 1 });
    fireEvent.pointerMove(divider(), { clientX: 330, pointerId: 1 });
    fireEvent.pointerMove(divider(), { clientX: 380, pointerId: 1 });
    expect(divider()).toHaveAttribute('aria-valuenow', '380');
    expect(fake.preferenceWrites.length).toBe(writes);
    fireEvent.pointerUp(divider(), { clientX: 380, pointerId: 1 });
    await waitFor(() => expect(fake.preferenceWrites.length).toBe(writes + 1));
    expect(fake.preferences.gezgin.genislik).toBe(380);
  });

  it('pencere daralınca kayıtlı genişlik sığacak şekilde sınırlanır', async () => {
    await setup({ gezgin: { acik: true, genislik: 500 } });
    const original = window.innerWidth;
    try {
      window.innerWidth = 700;
      fireEvent(window, new Event('resize'));
      await waitFor(() => expect(divider()).toHaveAttribute('aria-valuenow', '350'));
      expect(divider()).toHaveAttribute('aria-valuemax', '350');
    } finally {
      window.innerWidth = original;
      fireEvent(window, new Event('resize'));
    }
  });
});

describe('Gezgin görünürlüğü', () => {
  it('tercihte gizli gezgin açılışta gizli gelir', async () => {
    await setup({ gezgin: { acik: false, genislik: 300 } });
    expect(await screen.findByRole('button', { name: 'Gezgini aç' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Bağlantılar' })).not.toBeInTheDocument();
  });

  it('Ctrl/Cmd+B gizli durumu tercihe yazar, genişlik korunur', async () => {
    const { user, fake } = await setup({ gezgin: { acik: true, genislik: 320 } });
    await user.keyboard('{Control>}b{/Control}');
    await waitFor(() => expect(fake.preferences.gezgin).toEqual({ acik: false, genislik: 320 }));
    await user.click(screen.getByRole('button', { name: 'Gezgini aç' }));
    await waitFor(() => expect(fake.preferences.gezgin).toEqual({ acik: true, genislik: 320 }));
  });
});
