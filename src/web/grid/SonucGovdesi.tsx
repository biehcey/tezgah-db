import { useMemo, useState, type ComponentProps } from 'react';
import { CONSOLE_READ_ONLY_REASON } from '../../core/grid/bekleyen';
import { rowView } from '../../core/grid/satir-gorunumu';
import { typeName } from '../../core/grid/tipler';
import { SatirGorunumu } from './SatirGorunumu';
import { SonucGridi } from './SonucGridi';

type Props = Pick<ComponentProps<typeof SonucGridi>, 'etiket' | 'kolonlar' | 'tipler' | 'tipAdlari' | 'satirlar' | 'toplamSatir' | 'onSonaYaklasti'>;

const CLOSED = { kapali: CONSOLE_READ_ONLY_REASON };

/**
 * Konsol sonucu: salt okunur grid ve (grid'de Shift+Enter ile) sağında salt okunur satır görünümü;
 * görünüm yalnızca seçili satırın tam değerlerini gösterir. Açık olması diske yazılmaz.
 */
export function SonucGovdesi(props: Props) {
  const { kolonlar, tipler, tipAdlari, satirlar } = props;
  const [open, setOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(0);
  const tipNames = useMemo(() => kolonlar.map((_, c) => (tipler?.[c] === undefined ? null : typeName(tipler[c], tipAdlari))), [kolonlar, tipler, tipAdlari]);
  const satir = satirlar[activeRow];
  return (
    <div className="sonuc-govdesi">
      <SonucGridi {...props} satirGorunumuAcik={open} onSatirGorunumu={setOpen} onAktifSatir={setActiveRow} />
      {open && (
        <SatirGorunumu
          satir={satir ? rowView({ kolonlar, tipler: tipNames, pk: [], sira: activeRow, satir, duzenleme: CLOSED }) : null}
          onKapat={() => setOpen(false)}
        />
      )}
    </div>
  );
}
