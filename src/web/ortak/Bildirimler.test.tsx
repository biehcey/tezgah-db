import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BildirimSaglayici, useBildirimler } from './Bildirimler';

function Deneme() {
  const bildir = useBildirimler();
  return (
    <>
      <button type="button" onClick={() => bildir.hata('Silinemedi: izin yok')}>
        Hata
      </button>
      <button type="button" onClick={() => bildir.basari('URL kopyalandı')}>
        Başarı
      </button>
    </>
  );
}

const kur = () =>
  render(
    <BildirimSaglayici>
      <Deneme />
    </BildirimSaglayici>,
  );

afterEach(() => {
  vi.useRealTimers();
});

describe('Bildirimler', () => {
  it('hata toast\'ı kendiliğinden kalkmaz, kapat düğmesiyle kalkar', async () => {
    const user = userEvent.setup();
    kur();
    await user.click(screen.getByRole('button', { name: 'Hata' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Silinemedi: izin yok');
    await user.click(screen.getByRole('button', { name: 'Bildirimi kapat' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('başarı toast\'ı birkaç saniye sonra kendiliğinden kalkar', () => {
    vi.useFakeTimers();
    kur();
    act(() => screen.getByRole('button', { name: 'Başarı' }).click());
    expect(screen.getByRole('status')).toHaveTextContent('URL kopyalandı');
    act(() => vi.advanceTimersByTime(2_900));
    expect(screen.getByRole('status')).toHaveTextContent('URL kopyalandı');
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hata zamanla kaybolmaz; aynı hata ikinci kez yığılmaz', () => {
    vi.useFakeTimers();
    kur();
    act(() => screen.getByRole('button', { name: 'Hata' }).click());
    act(() => screen.getByRole('button', { name: 'Başarı' }).click());
    act(() => screen.getByRole('button', { name: 'Hata' }).click());
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
