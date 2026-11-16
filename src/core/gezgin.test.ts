import { describe, expect, it } from 'vitest';
import { compactRowCount, searchTree, type SearchNode } from './gezgin';

const node = (key: string, cocuklar: SearchNode[] = [], metinler = [key]): SearchNode => ({ key, metinler, cocuklar });

// klasör › bağlantı › veritabanı › şema › tablo
const TREE: SearchNode[] = [
  node('Altos', [
    node('odeme', [node('odeme-db', [node('public', [node('jira_ticket', [], ['jira_ticket', 'public.jira_ticket']), node('fatura')])])]),
    node('portal', []),
  ]),
  node('yerel', [node('postgres')]),
];

const sorted = (s: ReadonlySet<string>) => [...s].sort();

describe('searchTree: gezgin araması', () => {
  it('boş sorgu filtrelemez', () => {
    expect(searchTree(TREE, '  ')).toBeNull();
  });

  it('eşleşen tablo atalarıyla görünür ve ataları açılır; kardeşleri gizlenir', () => {
    const r = searchTree(TREE, 'JIRA')!;
    expect(sorted(r.gorunen)).toEqual(['Altos', 'jira_ticket', 'odeme', 'odeme-db', 'public']);
    expect(sorted(r.acik)).toEqual(['Altos', 'odeme', 'odeme-db', 'public']);
  });

  it('“şema.tablo” biçimi de eşleşir', () => {
    expect(searchTree(TREE, 'public.jira')!.gorunen.has('jira_ticket')).toBe(true);
  });

  it('adı eşleşen ve altında eşleşme olmayan düğüm kapalı kalır, altı süzülmeden görünür', () => {
    const r = searchTree(TREE, 'yer')!;
    expect(sorted(r.gorunen)).toEqual(['postgres', 'yerel']);
    expect(sorted(r.acik)).toEqual([]);
  });

  it('eşleşme yoksa hiçbir şey görünmez', () => {
    expect(sorted(searchTree(TREE, 'yok')!.gorunen)).toEqual([]);
  });
});

describe('compactRowCount: ağaçtaki tahmini satır sayısı', () => {
  it.each([
    [-1, ''],
    [0, '≈0'],
    [484.4, '≈484'],
    [999, '≈999'],
    [1500, '≈1,5k'],
    [12_345, '≈12k'],
    [999_499, '≈999k'],
    [2_340_000, '≈2,3M'],
    [45_000_000, '≈45M'],
  ])('%d → %s', (reltuples, expected) => {
    expect(compactRowCount(reltuples)).toBe(expected);
  });
});
