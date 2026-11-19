# 06: Bağlama göre anahtar kelimeler ve harf durumu

Spec: [Anahtar kelimeler](../spec.md#anahtar-kelimeler), [Tablo sekmesi kutuları](../spec.md#tablo-sekmesi-kutuları) (67), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** 01'deki düz anahtar kelime listesi, yuvaya ve önceki anahtar kelimeye göre değişen önerilerle değiştirilir: ifade başında `SELECT`/`INSERT`/`WITH`…, FROM'dan sonra `WHERE`/`JOIN`/`ORDER BY`…, ifade içinde `AND`/`IS NOT NULL`… Çok kelimeli gruplar tek öneridir. Harf durumu yazılan öneke uyar. `ORDER BY` kutusunda `ASC`/`DESC`/`NULLS FIRST|LAST` önerilir.

**Blocked by:** 01

**Status:** done (c746b87)

- [x] Yuva ve önceki anahtar kelimeye göre küçük sabit tablolar: ifade başı, SELECT listesi sonrası, FROM/JOIN sonrası, WHERE/ON/HAVING ifadesi içi, ORDER BY / GROUP BY sonrası, JOIN türleri, DDL başlangıçları.
- [x] Çok kelimeli gruplar (`ORDER BY`, `GROUP BY`, `LEFT JOIN`, `IS NOT NULL`, `NULLS FIRST` …) tek öneri.
- [x] Harf durumu: önek tamamen küçük harfse küçük; en az bir büyük harf içeriyorsa BÜYÜK; önek boşsa BÜYÜK.
- [x] `ORDER BY` kutusunda (`örtükTablo` + kutu türü) kolonlar, `ASC`/`DESC`/`NULLS FIRST|LAST`; `WHERE` kutusunda ifade anahtar kelimeleri.
- [x] Anahtar kelimeler kendi bandında (fonksiyonların altında, diğer şemalardaki adların üstünde).
- [x] Testler (core `tamamla`): her tablonun en az bir temsilci durumu, çok kelimeli gruplar, üç harf durumu, iki kutu türü.

## Comments

- Tablolar `src/core/tamamlama/ureticiler/anahtar-tablolari.ts`'de, seçim `anahtar-kelimeler.ts`'de: imlecin düzeyindeki son yan cümle kelimesi (sorgu dışı grupta dış düzey), terim mi bekleniyor yoksa terim bitti mi (`WHERE |` → `NOT`/`EXISTS`…, `WHERE a |` → `AND`/`IS NOT NULL`…/sonraki yan cümleler), son kelimeye göre doğrudan devamlar (`ORDER |` → `BY`, `IS |`, `LEFT |` → `JOIN`, `CREATE |`/`ALTER |`/`DROP |` → nesne türleri). Bağlam çıkarılamazsa geniş liste (`GENIS`).
- Kutularda sonraki yan cümleler (`LIMIT` vb.) önerilmez; ORDER BY kutusunda terim beklenen yerde (`|`, `a, |`) anahtar kelime yok, kolondan sonra `ASC`/`DESC`/`NULLS FIRST|LAST`.
