/**
 * `tamamla` testlerinin yardımcıları: metinde imleç `|` ile işaretlenir.
 *
 *   const s = tamamlaIsaretli('SELECT | FROM customers');
 *   etiketler(s, 'property')  // kolon etiketleri
 */
import type { Catalog } from '../../katalog';
import { tamamla, type Oneri, type OneriTuru, type TamamlamaSecenekleri, type TamamlamaSonucu } from '../index';
import { GORUNUR, KATALOG } from './katalog';

export interface IsaretliSecenekler extends Partial<TamamlamaSecenekleri> {
  /** Verilmezse fixture katalog; `null` katalog yok demek. */
  katalog?: Catalog | null;
}

/** `|` imleç işaretini çıkarıp `tamamla`'yı çağırır (varsayılan: fixture katalog, görünür şemalar). */
export function tamamlaIsaretli(isaretli: string, { katalog = KATALOG, ...secenekler }: IsaretliSecenekler = {}): TamamlamaSonucu | null {
  const imlec = isaretli.indexOf('|');
  if (imlec === -1 || isaretli.indexOf('|', imlec + 1) !== -1) throw new Error(`Metinde tam bir "|" olmalı: ${isaretli}`);
  const metin = isaretli.slice(0, imlec) + isaretli.slice(imlec + 1);
  return tamamla(metin, imlec, katalog, { gorunurSemalar: GORUNUR, ...secenekler });
}

/** Sonucun (verilirse yalnızca o türdeki) önerilerinin etiketleri, sırasıyla. */
export function etiketler(sonuc: TamamlamaSonucu | null, tur?: OneriTuru): string[] {
  return (sonuc?.oneriler ?? []).filter((o) => tur === undefined || o.tur === tur).map((o) => o.etiket);
}

/** Etiketi verilen öneri; yoksa hata. Aynı etiketli birden çok öneri varsa `tur` ile ayırın. */
export function oneri(sonuc: TamamlamaSonucu | null, etiket: string, tur?: OneriTuru): Oneri {
  const bulunan = (sonuc?.oneriler ?? []).filter((o) => o.etiket === etiket && (tur === undefined || o.tur === tur));
  if (bulunan.length !== 1) throw new Error(`"${etiket}" için ${bulunan.length} öneri var: ${etiketler(sonuc).join(', ')}`);
  return bulunan[0]!;
}
