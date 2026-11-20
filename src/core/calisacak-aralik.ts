/**
 * Çalışacak aralık (ADR-0006): Konsol sekmesinde Ctrl/Cmd+Enter'ın çalıştırdığı metin. Seçim
 * varsa seçim, yoksa imlecin bulunduğu (ya da imleçten önceki en yakın) ifade. Aralık sunucuya tek
 * başına bir script olarak gider (ADR-0003); sunucunun ifade offset'leri `editoreTasi` ile editör
 * metnine geri taşınır.
 */
import { lex, positionOf, splitStatements } from './ifade-bolme';

/** Editör metnindeki aralık (`bit` hariç). */
export interface Aralik {
  bas: number;
  bit: number;
}

const isSpace = (c: string | undefined) => c !== undefined && /\s/.test(c);

/**
 * `secim` boş değilse kırpılmış seçim (yalnızca boşluk/yorumsa `null`); boşsa imlecin ifadesi
 * (sondaki `;` dahil), yoksa imlecin satırında biten ifade, yoksa imleçten önce biten en yakın
 * ifade; hiçbiri yoksa `null`.
 */
export function calisacakAralik(metin: string, secim: { from: number; to: number }, imlec: number): Aralik | null {
  if (secim.from !== secim.to) {
    let bas = Math.min(secim.from, secim.to);
    let bit = Math.max(secim.from, secim.to);
    while (bas < bit && isSpace(metin[bas])) bas++;
    while (bit > bas && isSpace(metin[bit - 1])) bit--;
    return splitStatements(metin.slice(bas, bit)).length > 0 ? { bas, bit } : null;
  }
  const ifadeler = ifadeAraliklari(metin);
  const icinde = ifadeler.find((a) => a.bas <= imlec && imlec <= a.bit);
  if (icinde) return icinde;
  const satir = positionOf(metin, imlec).satir;
  const oncekiler = ifadeler.filter((a) => a.bit <= imlec);
  const onceki = oncekiler[oncekiler.length - 1];
  if (onceki && positionOf(metin, onceki.bit).satir === satir) return onceki;
  const satirda = ifadeler.find((a) => positionOf(metin, a.bit).satir === satir);
  return satirda ?? onceki ?? null;
}

/** Çalışan aralığın editördeki yeri: başlangıç ofseti ve çalışma anındaki editör metni. */
export interface AralikYeri {
  bas: number;
  editorMetni: string;
}

/** Sunucu olayındaki konum: aralığa göre offset'ler ve 1 tabanlı satır/sütun. */
export type Konum = Aralik & { satir: number; sutun: number };

/**
 * Sunucunun aralığa göre verdiği konumu editör metnine taşır: offset'ler aralık başlangıcı kadar,
 * satır aralığın editördeki satırı kadar kayar; aralığın ilk satırındaki sütun da aralığın başladığı
 * sütun kadar. Tüm script ofset 0'lı aralıktır (konum değişmez).
 */
export function editoreTasi(konum: Konum, yer: AralikYeri): Konum {
  const baslangic = positionOf(yer.editorMetni, yer.bas);
  return {
    bas: konum.bas + yer.bas,
    bit: konum.bit + yer.bas,
    satir: konum.satir + baslangic.satir - 1,
    sutun: konum.satir === 1 ? konum.sutun + baslangic.sutun - 1 : konum.sutun,
  };
}

/** Aralıktaki 1 tabanlı satırın editördeki satırı (ör. engelleme nedenleri). */
export function editorSatiri(yer: AralikYeri, satir: number): number {
  return editoreTasi({ bas: 0, bit: 0, satir, sutun: 1 }, yer).satir;
}

/** Bölücünün ifadeleri, ardından gelen `;` (araya yalnızca yorum girebilir) dahil. */
function ifadeAraliklari(metin: string): Aralik[] {
  const tokens = lex(metin).filter((t) => t.tur !== 'yorum');
  return splitStatements(metin).map((s) => {
    const sonraki = tokens.find((t) => t.from >= s.end);
    const noktaliVirgul = sonraki?.tur === 'sembol' && sonraki.deger === ';';
    return { bas: s.start, bit: noktaliVirgul ? sonraki.to : s.end };
  });
}
