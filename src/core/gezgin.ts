/**
 * Kenar çubuğundaki gezgin ağacı (klasör › bağlantı › veritabanı › şema › tablo): tek arama
 * kutusunun neyi gösterip neyi açtığı ve tablo satırındaki tahmini satır sayısı.
 */

/** Aramaya giren düğüm: yalnızca bilinen (yüklenmiş) çocuklarıyla. Arama hiçbir şey yüklemez. */
export interface SearchNode {
  key: string;
  /** Sorgunun aranacağı metinler (ör. tabloda ad ve `şema.ad`). */
  metinler: readonly string[];
  cocuklar: readonly SearchNode[];
}

export interface TreeSearch {
  /** Görünen düğümler. */
  gorunen: ReadonlySet<string>;
  /** Altında eşleşme olduğu için açılan düğümler. */
  acik: ReadonlySet<string>;
}

/**
 * Büyük/küçük harf duyarsız alt dize araması; boş sorguda `null` (süzme yok). Eşleşen düğüm
 * atalarıyla görünür, atalar açılır. Altında eşleşme olmayan eşleşen düğüm kapalı kalır, altı
 * süzülmeden görünür (açılınca tamamı); altında eşleşme varsa yalnızca eşleşen yollar görünür.
 */
export function searchTree(nodes: readonly SearchNode[], query: string): TreeSearch | null {
  const q = query.trim().toLowerCase();
  if (q === '') return null;
  const gorunen = new Set<string>();
  const acik = new Set<string>();
  const showAll = (n: SearchNode) => {
    gorunen.add(n.key);
    n.cocuklar.forEach(showAll);
  };
  const visit = (n: SearchNode): boolean => {
    let below = false;
    for (const c of n.cocuklar) below = visit(c) || below;
    if (below) {
      gorunen.add(n.key);
      acik.add(n.key);
      return true;
    }
    if (n.metinler.some((m) => m.toLowerCase().includes(q))) {
      showAll(n);
      return true;
    }
    return false;
  };
  nodes.forEach(visit);
  return { gorunen, acik };
}

const ONDALIK = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

/** `pg_class.reltuples` kısa biçimde (`≈484`, `≈12k`, `≈2,3M`); hiç analiz edilmediyse (`-1`) boş. */
export function compactRowCount(reltuples: number): string {
  if (reltuples < 0) return '';
  const n = Math.round(reltuples);
  if (n < 1000) return `≈${n}`;
  const [deger, birim] = n < 999_500 ? [n / 1000, 'k'] : [n / 1_000_000, 'M'];
  return `≈${deger < 10 ? ONDALIK.format(deger) : Math.round(deger)}${birim}`;
}
