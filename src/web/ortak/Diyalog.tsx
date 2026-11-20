import { useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';

interface Props {
  /** Başlık (`h2`); `etiket` verilmezse pencerenin erişilebilir adı da budur. */
  baslik: ReactNode;
  /** Başlık metni pencereyi adlandırmaya yetmiyorsa erişilebilir ad. */
  etiket?: string;
  /** `alertdialog`: geri alınamayan işlem onayı. */
  rol?: 'dialog' | 'alertdialog';
  /** Pencereyi açıklayan öğenin id'si (`aria-describedby`). */
  aciklamaId?: string;
  className?: string;
  /** Esc, kapatma düğmesi. */
  onClose: () => void;
  /** Verilirse gövde ve düğmeler bir `<form>` içindedir; Enter gönderir. */
  onSubmit?: (event: FormEvent) => void;
  /** Alt düğme alanı (ör. Vazgeç / birincil eylem). */
  dugmeler?: ReactNode;
  children: ReactNode;
}

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ortak pencere: yerel `<dialog>` + `showModal()`. Açılınca odak `data-autofocus` işaretli öğeye
 * (yoksa kapatma düğmesinden sonraki ilk odaklanabilir öğeye) gider; Tab pencere içinde döner,
 * Esc kapatır, kapanınca odak pencereyi açan öğeye döner.
 */
export function Diyalog({ baslik, etiket, rol = 'dialog', aciklamaId, className, onClose, onSubmit, dugmeler, children }: Props) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  // Render sırasında yakalanır: çocukların odak değiştirmesinden önce.
  const [acan] = useState(() => document.activeElement);

  useLayoutEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    const odaklar = odaklanabilirler(dialog);
    const hedef = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? odaklar.find((e) => !e.dataset.kapat) ?? odaklar[0];
    hedef?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (acan instanceof HTMLElement && acan.isConnected) acan.focus();
    };
  }, [acan]);

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const odaklar = odaklanabilirler(event.currentTarget);
    const ilk = odaklar[0];
    const son = odaklar.at(-1);
    if (!ilk || !son) return;
    const aktif = document.activeElement;
    if (event.shiftKey && (aktif === ilk || !odaklar.includes(aktif as HTMLElement))) {
      event.preventDefault();
      son.focus();
    } else if (!event.shiftKey && (aktif === son || !odaklar.includes(aktif as HTMLElement))) {
      event.preventDefault();
      ilk.focus();
    }
  }

  const icerik = (
    <>
      <header className="diyalog-basligi">
        <h2 id={`${id}-baslik`}>{baslik}</h2>
        <button type="button" className="ikon-dugme diyalog-kapat" aria-label="Pencereyi kapat" title="Kapat (Esc)" data-kapat="1" onClick={onClose}>
          ×
        </button>
      </header>
      {children}
      {dugmeler && <footer className="form-alt">{dugmeler}</footer>}
    </>
  );

  return (
    <dialog
      ref={ref}
      role={rol === 'alertdialog' ? 'alertdialog' : undefined}
      aria-modal="true"
      aria-labelledby={etiket ? undefined : `${id}-baslik`}
      aria-label={etiket}
      aria-describedby={aciklamaId}
      className={className ? `diyalog ${className}` : 'diyalog'}
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} noValidate>
          {icerik}
        </form>
      ) : (
        icerik
      )}
    </dialog>
  );
}

function odaklanabilirler(kok: HTMLElement): HTMLElement[] {
  return [...kok.querySelectorAll<HTMLElement>(ODAKLANABILIR)];
}
