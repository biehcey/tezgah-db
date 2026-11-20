import { useEffect, useId, useRef, useState } from 'react';
import { Dugme } from './Dugme';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/** Geri alınamayan işlem onayı: odak Vazgeç'te başlar, Escape vazgeçer. */
export function Onay({ title, description, confirmLabel, onConfirm, onCancel }: Props) {
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="perde">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-baslik`}
        aria-describedby={`${id}-aciklama`}
        className="diyalog"
      >
        <h2 id={`${id}-baslik`}>{title}</h2>
        <p id={`${id}-aciklama`}>{description}</p>
        <footer className="form-alt">
          <span className="bosluk" />
          <Dugme ref={cancelRef} onClick={onCancel}>
            Vazgeç
          </Dugme>
          <Dugme
            tur="tehlikeli"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onConfirm();
            }}
          >
            {confirmLabel}
          </Dugme>
        </footer>
      </div>
    </div>
  );
}
