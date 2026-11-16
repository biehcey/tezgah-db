/**
 * Bekleyen değişiklikler listesi (SQL sırasıyla); son uygulamada hata alan değişiklik işaretli.
 * Çekmecede ve satır görünümünün "Değişiklikler" sekmesinde aynısı.
 */
export function BekleyenListesi({
  items,
  failed,
}: {
  items: readonly { anahtar: string; metin: string }[];
  failed: { satir: string; mesaj: string } | null;
}) {
  return (
    <ul aria-label="Bekleyen değişiklikler" className="bekleyen-listesi kucuk">
      {items.map((item) => (
        <li key={item.anahtar} className={failed?.satir === item.anahtar ? 'hatali' : undefined}>
          {item.metin}
          {failed?.satir === item.anahtar && <span className="ifade-hatasi"> — {failed.mesaj}</span>}
        </li>
      ))}
    </ul>
  );
}
