import type { InputHTMLAttributes, ReactNode } from 'react';

type GirdiProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & { children: ReactNode };

/** Uygulamanın stiliyle çizilen radyo düğmesi; etiketi `children`. */
export function Radyo({ children, className, ...props }: GirdiProps) {
  return (
    <label className={`secim${className ? ` ${className}` : ''}`}>
      <input {...props} type="radio" className="secim-girdisi" />
      {children}
    </label>
  );
}

/** Uygulamanın stiliyle çizilen onay kutusu; etiketi `children`. */
export function OnayKutusu({ children, className, ...props }: GirdiProps) {
  return (
    <label className={`secim${className ? ` ${className}` : ''}`}>
      <input {...props} type="checkbox" className="secim-girdisi" />
      {children}
    </label>
  );
}

/** Token'lı çerçeveli tarih alanı (`YYYY-MM-DD`); erişilebilir adı `aria-label` verir. */
export function TarihAlani({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <input {...props} type="date" className={`tarih-alani${className ? ` ${className}` : ''}`} />;
}
