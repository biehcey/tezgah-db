# 06: Bağlama göre anahtar kelimeler ve harf durumu

Spec: [Anahtar kelimeler](../spec.md#anahtar-kelimeler), [Tablo sekmesi kutuları](../spec.md#tablo-sekmesi-kutuları) (67), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf)

**What to build:** 01'deki düz anahtar kelime listesi, yuvaya ve önceki anahtar kelimeye göre değişen önerilerle değiştirilir: ifade başında `SELECT`/`INSERT`/`WITH`…, FROM'dan sonra `WHERE`/`JOIN`/`ORDER BY`…, ifade içinde `AND`/`IS NOT NULL`… Çok kelimeli gruplar tek öneridir. Harf durumu yazılan öneke uyar. `ORDER BY` kutusunda `ASC`/`DESC`/`NULLS FIRST|LAST` önerilir.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Yuva ve önceki anahtar kelimeye göre küçük sabit tablolar: ifade başı, SELECT listesi sonrası, FROM/JOIN sonrası, WHERE/ON/HAVING ifadesi içi, ORDER BY / GROUP BY sonrası, JOIN türleri, DDL başlangıçları.
- [ ] Çok kelimeli gruplar (`ORDER BY`, `GROUP BY`, `LEFT JOIN`, `IS NOT NULL`, `NULLS FIRST` …) tek öneri.
- [ ] Harf durumu: önek tamamen küçük harfse küçük; en az bir büyük harf içeriyorsa BÜYÜK; önek boşsa BÜYÜK.
- [ ] `ORDER BY` kutusunda (`örtükTablo` + kutu türü) kolonlar, `ASC`/`DESC`/`NULLS FIRST|LAST`; `WHERE` kutusunda ifade anahtar kelimeleri.
- [ ] Anahtar kelimeler kendi bandında (fonksiyonların altında, diğer şemalardaki adların üstünde).
- [ ] Testler (core `tamamla`): her tablonun en az bir temsilci durumu, çok kelimeli gruplar, üç harf durumu, iki kutu türü.
