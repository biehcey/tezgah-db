import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Diyalog } from './Diyalog';

function Deneme() {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAcik(true)}>
        Aç
      </button>
      {acik && (
        <Diyalog
          baslik="Klasör adı"
          onClose={() => setAcik(false)}
          dugmeler={
            <>
              <button type="button" onClick={() => setAcik(false)}>
                Vazgeç
              </button>
              <button type="button">Kaydet</button>
            </>
          }
        >
          <label>
            Ad <input data-autofocus />
          </label>
        </Diyalog>
      )}
    </>
  );
}

async function ac() {
  const user = userEvent.setup();
  render(<Deneme />);
  await user.click(screen.getByRole('button', { name: 'Aç' }));
  return user;
}

describe('Diyalog', () => {
  it('başlıkla adlandırılan modal bir pencere açar; odak işaretli alanda başlar', async () => {
    await ac();
    const diyalog = screen.getByRole('dialog', { name: 'Klasör adı' });
    expect(diyalog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('textbox', { name: 'Ad' })).toHaveFocus();
  });

  it('Tab son öğeden ilk öğeye, Shift+Tab ilk öğeden son öğeye döner', async () => {
    const user = await ac();
    screen.getByRole('button', { name: 'Kaydet' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Pencereyi kapat' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Kaydet' })).toHaveFocus();
  });

  it('Esc kapatır ve odak açan düğmeye döner', async () => {
    const user = await ac();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aç' })).toHaveFocus();
  });

  it('kapatma düğmesi kapatır', async () => {
    const user = await ac();
    await user.click(screen.getByRole('button', { name: 'Pencereyi kapat' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aç' })).toHaveFocus();
  });
});
