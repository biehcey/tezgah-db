# 05: Tip ve DDL yuvaları

Spec: [Tipler ve DDL](../spec.md#tipler-ve-ddl), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** Tip beklenen yerlerde (`::` sonrası, `CAST(x AS `, `CREATE TABLE`/`ADD COLUMN` kolon tanımı) tipler önerilir: yaygın tipler ve katalogdaki kullanıcı tipleri. Sınırlı bir DDL kümesinde ilişki ve kolon yuvaları tanınır; bunların dışındaki DDL'de yalnızca anahtar kelimeler önerilir.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Tip yuvası: `::`, `CAST(… AS`, `CREATE TABLE … (` ve `ADD COLUMN ad ` sonrası kolon tipi yeri. Yaygın tip listesi "+ Kolon" formuyla aynı kaynaktan; kullanıcı tipleri `kullaniciTipleri`'nden. Katalog `null` iken yalnızca yaygın tipler.
- [ ] Kolon yuvaları: `ALTER TABLE t ALTER COLUMN `, `DROP COLUMN `, `RENAME COLUMN `; `CREATE [UNIQUE] INDEX [CONCURRENTLY] [ad] ON t (`.
- [ ] İlişki yuvaları: `ALTER TABLE `, `DROP TABLE `, `DROP VIEW `, `TRUNCATE `, `COMMENT ON TABLE `.
- [ ] Diğer DDL'de yalnızca anahtar kelimeler (ilişki/kolon/fonksiyon önerilmez).
- [ ] Testler (core `tamamla`): her tip yuvası, kullanıcı tipi, katalog `null`; her DDL kolon ve ilişki yuvası; listelenmeyen bir DDL'de (ör. `CREATE TRIGGER`) yalnızca anahtar kelime.
