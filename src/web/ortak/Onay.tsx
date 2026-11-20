import { useId, useState } from 'react';
import { Diyalog } from './Diyalog';

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
  const [busy, setBusy] = useState(false);

  return (
    <Diyalog
      baslik={title}
      rol="alertdialog"
      aciklamaId={`${id}-aciklama`}
      onClose={onCancel}
      dugmeler={
        <>
          <span className="bosluk" />
          <button type="button" data-autofocus onClick={onCancel}>
            Vazgeç
          </button>
          <button
            type="button"
            className="tehlikeli"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p id={`${id}-aciklama`}>{description}</p>
    </Diyalog>
  );
}
