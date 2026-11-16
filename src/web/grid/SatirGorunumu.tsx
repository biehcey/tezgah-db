import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';import type { RowField, RowView } from '../../core/grid/satir-gorunumu';
import { NULL_LABEL } from '../../core/grid/gosterim';

/** Alan kutusunun en fazla satır yüksekliği; uzun değer kutuda kayar. */
const FIELD_MAX_LINES = 8;

type Sekme = 'satir' | 'degisiklikler';

/** Gösterilen satırın bekleyen değişiklik eylemleri. */
export interface RowEdits {
  /** Yazılabilir alanın yeni değeri ya da NULL. */
  duzenle: (kolon: number, deger: string | null) => void;
  sil: () => void;
  geriAl: () => void;
}

interface Props {
  /** Gösterilen satır; seçili satır yoksa `null`. */
  satir: RowView | null;
  /** Verilirse yazılabilir alanlar düzenlenir ve "Sil" / "↶ Geri al" görünür. */
  duzenleme?: RowEdits;
  /** Verilirse "Değişiklikler (n)" sekmesi: çekmecedeki bekleyen listesinin aynısı. */
  degisiklikler?: { sayi: number; icerik: ReactNode };
  onKapat: () => void;
  panelRef?: Ref<HTMLElement>;
}

/**
 * Satır görünümü: grid'in sağında, seçili satırın dikey formu (IntelliJ'nin Record view'ı). Her
 * kolonun adı, tipi, PK işareti ve kırpılmamış değeri; NULL/DEFAULT yer tutucu, bekleyen değer
 * grid'deki renkle. Alanı değiştirip Enter'a basmak ya da alandan çıkmak `onDuzenle`'yi çağırır;
 * Shift+Enter alanda yeni satırdır, Esc yazılanı atar. Düzenleme kapalıysa nedeni üstte yazar.
 */
export function SatirGorunumu({ satir, duzenleme, degisiklikler, onKapat, panelRef }: Props) {
  const [sekme, setSekme] = useState<Sekme>('satir');
  const shown = degisiklikler ? sekme : 'satir';
  const reasonId = useId();
  const neden = satir?.neden ?? null;

  return (
    <aside aria-label="Satır görünümü" className="satir-gorunumu" ref={panelRef}>
      <div className="satir-gorunumu-sekmeleri">
        <div role="tablist" aria-label="Satır görünümü sekmeleri" className="sekmeler">
          <button type="button" role="tab" aria-selected={shown === 'satir'} className={`sekme${shown === 'satir' ? ' secili' : ''}`} onClick={() => setSekme('satir')}>
            Satır
          </button>
          {degisiklikler && (
            <button
              type="button"
              role="tab"
              aria-selected={shown === 'degisiklikler'}
              className={`sekme${shown === 'degisiklikler' ? ' secili' : ''}`}
              onClick={() => setSekme('degisiklikler')}
            >
              Değişiklikler ({degisiklikler.sayi})
            </button>
          )}
        </div>
        <button type="button" className="ikon-dugme" aria-label="Satır görünümünü kapat" title="Kapat (grid’de Shift+Enter / Esc)" onClick={onKapat}>
          ×
        </button>
      </div>
      <div role="tabpanel" className="satir-gorunumu-govde">
        {shown === 'degisiklikler' ? (
          degisiklikler!.sayi > 0 ? (
            degisiklikler!.icerik
          ) : (
            <p className="soluk kucuk">Bekleyen değişiklik yok.</p>
          )
        ) : !satir ? (
          <p className="soluk kucuk">Satır seçilmedi.</p>
        ) : (
          <>
            <div className="satir-gorunumu-basligi">
              <b>{satir.baslik}</b>
              {satir.silinecek && <span className="uyari-metni kucuk">silinecek</span>}
              <span className="bosluk" />
              {duzenleme &&
                (satir.silinecek ? (
                  <button type="button" onClick={duzenleme.geriAl}>
                    ↶ Geri al
                  </button>
                ) : (
                  <button type="button" className="tehlikeli" onClick={duzenleme.sil}>
                    Sil
                  </button>
                ))}
            </div>
            {neden && (
              <p id={reasonId} role="note" className="soluk kucuk">
                {neden}
              </p>
            )}
            {satir.alanlar.map((alan, c) => (
              <Alan
                key={`${satir.anahtar}:${c}`}
                alan={alan}
                aciklama={neden ? reasonId : undefined}
                onDuzenle={duzenleme && alan.yazilabilir ? (deger) => duzenleme.duzenle(c, deger) : undefined}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * Tek alan. Yazılan taslak (`null`: dokunulmadı) Enter'da ya da alandan çıkınca kaydedilir;
 * dokunulmayan alan kaydedilmez (NULL boş metne dönmez). Alan, taslağı kaydedilmeden kaldırılırsa
 * (grid'de başka satıra geçmek) da kaydedilir.
 */
function Alan({ alan, aciklama, onDuzenle }: { alan: RowField; aciklama?: string; onDuzenle?: (deger: string | null) => void }) {
  const [draft, setDraftState] = useState<string | null>(null);
  const reasonId = useId();
  /** Eşzamanlı kopya: blur ve kaldırılma aynı taslağı iki kez kaydetmesin. */
  const draftRef = useRef<string | null>(null);
  const setDraft = (next: string | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const onDuzenleRef = useRef(onDuzenle);
  onDuzenleRef.current = onDuzenle;
  const save = () => {
    const value = draftRef.current;
    if (value === null) return;
    draftRef.current = null;
    setDraftState(null);
    onDuzenleRef.current?.(value);
  };
  useEffect(
    () => () => {
      const value = draftRef.current;
      draftRef.current = null;
      if (value !== null) onDuzenleRef.current?.(value);
    },
    [],
  );

  const metin = draft ?? alan.deger ?? '';
  const describedBy = alan.saltOkunur ? reasonId : aciklama;

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(null);
    }
  }

  return (
    <div className={`satir-alani${alan.degisti ? ' degisti' : ''}`}>
      <div className="satir-alani-etiketi kucuk">
        <b>{alan.ad}</b>
        {alan.pk && (
          <span className="rozet pk-rozeti" title="Birincil anahtar">
            PK
          </span>
        )}
        {alan.tip && <span className="soluk">{alan.tip}</span>}
        <span className="bosluk" />
        {onDuzenle && !(alan.yerTutucu === NULL_LABEL && draft === null) && (
          <button
            type="button"
            className="baglanti-dugme"
            aria-label={`${alan.ad}: NULL yap`}
            onClick={() => {
              setDraft(null);
              onDuzenle(null);
            }}
          >
            NULL yap
          </button>
        )}
      </div>
      <textarea
        aria-label={alan.ad}
        aria-describedby={describedBy}
        className={`satir-alani-degeri${alan.yerTutucu && draft === null ? ' yer-tutucu' : ''}`}
        readOnly={!onDuzenle}
        value={metin}
        placeholder={draft === null ? (alan.yerTutucu ?? undefined) : undefined}
        rows={Math.min(Math.max(metin.split('\n').length, 1), FIELD_MAX_LINES)}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={save}
      />
      {alan.saltOkunur && (
        <p id={reasonId} className="soluk kucuk satir-alani-notu">
          {alan.saltOkunur}
        </p>
      )}
    </div>
  );
}
