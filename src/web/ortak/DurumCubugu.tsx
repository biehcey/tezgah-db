import { CircleQuestionMark } from 'lucide-react';
import type { Connection } from '../../core/baglanti';
import { secimMetni, sonCalistirma, sonCalistirmaMetni, tabloMetni, transactionDurumu } from '../../core/durum-cubugu';
import type { SecimOzeti } from '../../core/grid/secim-ozeti';
import type { DecisionTimer } from '../../core/karar-suresi';
import type { RunView } from '../../core/script-calistirma';
import { useCountdown } from '../script/KararKarti';
import { Dugme } from './Dugme';
import { OrtamRozeti } from './Rozet';

/** Bir sekmenin Durum çubuğuna bildirdiği durum; konsol ve Tablo sekmesi kendi alanlarını doldurur. */
export interface SekmeDurumu {
  run?: RunView | null;
  /** Karar ya da Okuma süresinin yerel geri sayımı. */
  deadline?: DecisionTimer | null;
  /** Görünen grid'in seçimi. */
  secim?: SecimOzeti | null;
  /** Kısa geri bildirim (ör. imleçte ifade yok). */
  bildirim?: string | null;
  tablo?: { tahmin: number | null; bekleyen: number };
}

interface Props {
  /** Etkin sekmenin hedefi; yoksa `null`. */
  hedef: { connection: Connection; database: string } | null;
  durum: SekmeDurumu | null;
  surum: string | null;
  /** `?`: kısayol sayfası; verilmezse düğme pasif. */
  onKisayollar?: () => void;
}

/**
 * Durum çubuğu: uygulamanın en altındaki tek satır. Salt görüntüdür (Yazma kilidi içermez);
 * değerler etkin sekmenin durumundan türetilir.
 */
export function DurumCubugu({ hedef, durum, surum, onKisayollar }: Props) {
  const run = durum?.run ?? null;
  const kalan = useCountdown(run?.evre === 'karar' || run?.evre === 'okuma' ? (durum?.deadline ?? null) : null);
  const transaction = transactionDurumu(run, { bagli: hedef !== null, kalanMs: kalan?.kalanMs ?? null });
  const son = sonCalistirma(run);
  const secim = durum?.secim ? secimMetni(durum.secim) : null;
  const tablo = durum?.tablo ? tabloMetni(durum.tablo) : null;
  return (
    <footer aria-label="Durum çubuğu" className="durum-cubugu">
      {hedef && (
        <span className="durum-hedefi">
          {hedef.connection.envTag && <OrtamRozeti etiket={hedef.connection.envTag} renk={hedef.connection.color} />}
          <span>
            {hedef.connection.name} / {hedef.database}
          </span>
        </span>
      )}
      <span role="status" aria-label="Transaction durumu" className={`durum-transaction ${transaction.tur}`}>
        {transaction.metin}
      </span>
      {son && <span>{sonCalistirmaMetni(son)}</span>}
      {tablo && <span>{tablo}</span>}
      {secim && <span aria-label="Seçim özeti">{secim}</span>}
      {durum?.bildirim && (
        <span role="status" aria-label="Çalıştırma bildirimi" className="durum-bildirimi">
          {durum.bildirim}
        </span>
      )}
      <span className="bosluk" />
      <Dugme
        tur="sade"
        boyut="kucuk"
        ikon
        aria-label="Kısayollar"
        title={onKisayollar ? 'Kısayollar' : 'Kısayol sayfası henüz yok'}
        disabled={!onKisayollar}
        onClick={onKisayollar}
      >
        <CircleQuestionMark aria-hidden="true" />
      </Dugme>
      {surum && <span className="durum-surumu">v{surum}</span>}
    </footer>
  );
}
