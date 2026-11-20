import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dugme } from './Dugme';

/** Kısa geri bildirim: hata kullanıcı kapatana kadar kalır, başarı birkaç saniyede kaybolur. */
export interface BildirimApi {
  hata: (mesaj: string) => void;
  basari: (mesaj: string) => void;
}

interface Bildirim {
  id: number;
  tur: 'hata' | 'basari';
  mesaj: string;
}

/** Başarı bildirimlerinin ekranda kalma süresi. */
export const BASARI_SURESI_MS = 3_000;

const BildirimBaglami = createContext<BildirimApi | null>(null);

/** Bildirim gönderir; `BildirimSaglayici` içinde çağrılmalı. */
export function useBildirimler(): BildirimApi {
  const api = useContext(BildirimBaglami);
  if (!api) throw new Error('useBildirimler BildirimSaglayici dışında çağrıldı');
  return api;
}

/** Toast yığınını sağ altta gösterir; çocuklar `useBildirimler` ile bildirim gönderir. */
export function BildirimSaglayici({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<Bildirim[]>([]);
  const sayac = useRef(0);

  const kapat = useCallback((id: number) => setListe((l) => l.filter((b) => b.id !== id)), []);
  const ekle = useCallback((tur: Bildirim['tur'], mesaj: string) => {
    const id = ++sayac.current;
    // Aynı metin yeniden gelirse eskisi kalkar: aynı hata üst üste yığılmaz.
    setListe((l) => [...l.filter((b) => !(b.tur === tur && b.mesaj === mesaj)), { id, tur, mesaj }]);
  }, []);
  const api = useMemo<BildirimApi>(
    () => ({ hata: (m) => ekle('hata', m), basari: (m) => ekle('basari', m) }),
    [ekle],
  );

  return (
    <BildirimBaglami.Provider value={api}>
      {children}
      <section aria-label="Bildirimler" className="bildirimler">
        {liste.map((b) => (
          <Toast key={b.id} bildirim={b} onClose={() => kapat(b.id)} />
        ))}
      </section>
    </BildirimBaglami.Provider>
  );
}

function Toast({ bildirim, onClose }: { bildirim: Bildirim; onClose: () => void }) {
  const kapatRef = useRef(onClose);
  kapatRef.current = onClose;
  useEffect(() => {
    if (bildirim.tur !== 'basari') return;
    const t = setTimeout(() => kapatRef.current(), BASARI_SURESI_MS);
    return () => clearTimeout(t);
  }, [bildirim.tur]);

  return (
    <div role={bildirim.tur === 'hata' ? 'alert' : 'status'} className={`toast toast-${bildirim.tur}`}>
      <span className="toast-metni">{bildirim.mesaj}</span>
      {bildirim.tur === 'hata' && (
        <Dugme tur="sade" ikon boyut="kucuk" aria-label="Bildirimi kapat" title="Kapat" onClick={onClose}>
          <X aria-hidden="true" />
        </Dugme>
      )}
    </div>
  );
}
