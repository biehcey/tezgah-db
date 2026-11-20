import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Bolucu } from './Bolucu';

function Kurulum({ yon, onBitir }: { yon: 'dikey' | 'yatay'; onBitir: (v: number) => void }) {
  const [deger, setDeger] = useState(300);
  return (
    <Bolucu
      yon={yon}
      deger={deger}
      min={200}
      max={400}
      adim={16}
      varsayilan={280}
      onDegis={setDeger}
      onBitir={(v) => {
        setDeger(v);
        onBitir(v);
      }}
      aria-label="Bölücü"
    />
  );
}

const separator = () => screen.getByRole('separator', { name: 'Bölücü' });

describe('Bölücü', () => {
  it('ARIA: yön, değer ve sınırlar; Tab ile odaklanır', async () => {
    render(<Kurulum yon="yatay" onBitir={() => {}} />);
    expect(separator()).toHaveAttribute('aria-orientation', 'horizontal');
    expect(separator()).toHaveAttribute('aria-valuenow', '300');
    expect(separator()).toHaveAttribute('aria-valuemin', '200');
    expect(separator()).toHaveAttribute('aria-valuemax', '400');
    await userEvent.setup().tab();
    expect(separator()).toHaveFocus();
  });

  it('ok tuşları adım kadar oynatır, sınırda durur ve her basışta bitirir', async () => {
    const onBitir = vi.fn();
    const user = userEvent.setup();
    render(<Kurulum yon="dikey" onBitir={onBitir} />);
    expect(separator()).toHaveAttribute('aria-orientation', 'vertical');
    separator().focus();
    await user.keyboard('{ArrowRight}');
    expect(onBitir).toHaveBeenLastCalledWith(316);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(onBitir).toHaveBeenLastCalledWith(284);
    await user.keyboard('{ArrowUp}');
    expect(onBitir).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 10; i++) await user.keyboard('{ArrowRight}');
    expect(separator()).toHaveAttribute('aria-valuenow', '400');
  });

  it('sürüklerken değişir, bırakınca bir kez bitirir', () => {
    const onBitir = vi.fn();
    render(<Kurulum yon="yatay" onBitir={onBitir} />);
    fireEvent.pointerDown(separator(), { clientY: 500, button: 0 });
    fireEvent.pointerMove(window, { clientY: 450 });
    expect(separator()).toHaveAttribute('aria-valuenow', '250');
    fireEvent.pointerMove(window, { clientY: 300 });
    expect(separator()).toHaveAttribute('aria-valuenow', '200');
    expect(onBitir).not.toHaveBeenCalled();
    fireEvent.pointerUp(window, { clientY: 300 });
    expect(onBitir).toHaveBeenCalledTimes(1);
    expect(onBitir).toHaveBeenCalledWith(200);
    fireEvent.pointerMove(window, { clientY: 600 });
    expect(separator()).toHaveAttribute('aria-valuenow', '200');
  });

  it('çift tık varsayılana döner', async () => {
    const onBitir = vi.fn();
    render(<Kurulum yon="dikey" onBitir={onBitir} />);
    await userEvent.setup().dblClick(separator());
    expect(onBitir).toHaveBeenLastCalledWith(280);
    expect(separator()).toHaveAttribute('aria-valuenow', '280');
  });
});
