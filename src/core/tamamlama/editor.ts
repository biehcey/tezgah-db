/**
 * Editörün `tamamla` sonucunu kullanma kuralları (IntelliJ gibi); CodeMirror bağlantısı
 * `src/web/script/tamamlama.ts`'de.
 */

/**
 * Popup açılır mı: elle (Ctrl+Space) her zaman; yazarken yalnızca bir kelime yazılıyorsa
 * (`from` imleçten önce) ya da `.` sonrasında, boşluktan sonra değil.
 */
export function popupAcilir(metin: string, sonuc: { from: number }, imlec: number, elle: boolean): boolean {
  return elle || sonuc.from !== imlec || metin[imlec - 1] === '.';
}

/**
 * Tab'ın değiştirdiği aralık: motorun `from`–`to`'su (imlecin sağındaki kelime kalanı dahil);
 * popup açıldıktan sonra yazılanlar da (imleç `to`'yu geçtiyse imlece kadar).
 */
export function tabAraligi(aralik: { from: number; to: number }, imlec: number): { from: number; to: number } {
  return { from: aralik.from, to: Math.max(aralik.to, imlec) };
}
