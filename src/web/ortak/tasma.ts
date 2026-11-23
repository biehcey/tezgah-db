import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { tasanEylemler } from '../../core/arac-cubugu';

/** "⋯" düğmesi henüz çizilmediyse varsayılan genişliği (px). */
const MENU_GENISLIGI = 32;
/** "⋯" düğmesinin `data-eylem` değeri. */
export const TASMA_MENUSU = 'menu';

/**
 * Araç çubuğunun taşan eylemleri. Çubuğun çocukları `data-eylem` ile işaretlenir; görünenlerin
 * genişliği her çizimde ölçülür, menüye taşınanlar son ölçülen genişlikleriyle hesaba katılır.
 * Genişlik ölçülemezse (jsdom) hiçbiri taşmaz.
 */
export function useTasanEylemler<A extends string>(cubuk: RefObject<HTMLElement | null>, ogeler: readonly { anahtar: A; birincil: boolean }[]): A[] {
  const genislikler = useRef(new Map<string, number>());
  const [tasan, setTasan] = useState<A[]>([]);
  const [, yenidenOlc] = useState(0);

  useEffect(() => {
    const olc = () => yenidenOlc((n) => n + 1);
    window.addEventListener('resize', olc);
    const el = cubuk.current;
    const observer = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(olc) : null;
    if (el) observer?.observe(el);
    return () => {
      window.removeEventListener('resize', olc);
      observer?.disconnect();
    };
  }, [cubuk]);

  // Her çizimden sonra: düğme metinleri ve görünen eylemler değişebilir.
  useLayoutEffect(() => {
    const el = cubuk.current;
    if (!el) return;
    for (const cocuk of el.children) {
      const eylem = (cocuk as HTMLElement).dataset.eylem;
      if (eylem) genislikler.current.set(eylem, (cocuk as HTMLElement).offsetWidth);
    }
    const stil = getComputedStyle(el);
    const px = (deger: string) => parseFloat(deger) || 0;
    const sonraki = tasanEylemler(
      ogeler.map((o) => ({ ...o, genislik: genislikler.current.get(o.anahtar) ?? 0 })),
      {
        genislik: el.clientWidth - px(stil.paddingLeft) - px(stil.paddingRight),
        menu: genislikler.current.get(TASMA_MENUSU) || MENU_GENISLIGI,
        aralik: px(stil.columnGap),
      },
    );
    setTasan((onceki) => (onceki.join(',') === sonraki.join(',') ? onceki : sonraki));
  });
  return tasan;
}
