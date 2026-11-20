import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import type { ShortcutId } from '../../core/kisayollar';
import { ariaKisayol, kisayol } from './pencere';

export interface MenuItem {
  label: string;
  /** Etiketin solundaki ikon (dekoratif). */
  icon?: ReactNode;
  /** Katalogdaki kısayolu: metni öğenin sağında yazar. */
  shortcut?: ShortcutId;
  onSelect?: () => void;
  /** Seçilince menü bu öğelerle yer değiştirir (ör. "Klasöre taşı ▸"). */
  submenu?: MenuEntry[];
  disabled?: boolean;
  danger?: boolean;
}

/** Öğe grupları arasındaki çizgi. */
export const MENU_SEPARATOR = { ayirici: true } as const;

export type MenuEntry = MenuItem | typeof MENU_SEPARATOR;

export interface MenuPosition {
  x: number;
  y: number;
}

/** ⋯ düğmesinin hemen altı. */
export function menuBelow(e: ReactMouseEvent<HTMLElement>): MenuPosition {
  const rect = e.currentTarget.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
}

interface Props extends MenuPosition {
  items: MenuEntry[];
  label: string;
  onClose: () => void;
}

const WIDTH = 240;

/** Sağ tık / ⋯ menüsü. Escape ve dışarı tıklama kapatır; ok tuşları öğeler arasında gezer. */
export function Menu({ x, y, items: initial, label, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Açılıştaki öğeler; alt menü seçilince yer değiştirir. Yeni menü için bileşen yeniden kurulur (key).
  const [items, setItems] = useState(initial);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [items]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const enabled = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? index + 1 : index - 1;
    enabled[(next + enabled.length) % enabled.length]?.focus();
  }

  function choose(item: MenuItem) {
    if (item.submenu) return setItems(item.submenu);
    onClose();
    item.onSelect?.();
  }

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className="menu"
      style={{ left: Math.max(0, Math.min(x, window.innerWidth - WIDTH)), top: y }}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        'ayirici' in item ? (
          <div key={`ayirici-${i}`} role="separator" className="menu-ayirici" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={item.danger ? 'tehlikeli' : undefined}
            disabled={item.disabled}
            aria-keyshortcuts={item.shortcut && ariaKisayol(item.shortcut)}
            onClick={() => choose(item)}
          >
            {item.icon && (
              <span className="menu-ikonu" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="menu-etiketi">{item.label}</span>
            {item.shortcut && (
              <kbd className="kisayol-ipucu" aria-hidden="true">
                {kisayol(item.shortcut)}
              </kbd>
            )}
          </button>
        ),
      )}
    </div>
  );
}
