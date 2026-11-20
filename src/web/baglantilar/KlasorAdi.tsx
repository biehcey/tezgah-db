import { useId, useState, type FormEvent } from 'react';
import { Diyalog } from '../ortak/Diyalog';

interface Props {
  title: string;
  initial: string;
  submitLabel: string;
  /** Hata mesajı döndürürse pencere açık kalır ve mesaj gösterilir. */
  onSubmit: (name: string) => Promise<string | null>;
  onCancel: () => void;
}

/** Klasör oluşturma ve yeniden adlandırma penceresi. */
export function KlasorAdi({ title, initial, submitLabel, onSubmit, onCancel }: Props) {
  const id = useId();
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === '') return setError('Klasör adı gerekli');
    setBusy(true);
    const failure = await onSubmit(name.trim());
    setBusy(false);
    setError(failure);
  }

  return (
    <Diyalog
      baslik={title}
      onClose={onCancel}
      onSubmit={submit}
      dugmeler={
        <>
          <span className="bosluk" />
          <button type="button" onClick={onCancel}>
            Vazgeç
          </button>
          <button type="submit" className="birincil" disabled={busy}>
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="alan">
        <label htmlFor={`${id}-ad`}>Klasör adı</label>
        <input
          id={`${id}-ad`}
          data-autofocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hata` : undefined}
        />
        {error && (
          <span id={`${id}-hata`} className="alan-hatasi">
            {error}
          </span>
        )}
      </div>
    </Diyalog>
  );
}
