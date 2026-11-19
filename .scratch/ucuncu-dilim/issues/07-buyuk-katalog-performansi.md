# 07: Büyük katalogda performans

Spec: [Performans](../spec.md#performans), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf), [Testing Decisions](../spec.md#testing-decisions)

**What to build:** Binlerce tablolu ve binlerce fonksiyonlu bir hedefte tamamlama yazmayı yavaşlatmaz. Katalogdan kurulan arama dizinleri (ilişkiler, ilişki başına kolonlar, iki yönlü FK'ler, ada göre gruplu fonksiyonlar) katalog nesnesi başına bir kez kurulur; her tuşta yeniden kurulmaz.

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [ ] Dizinler katalog nesnesine bağlı olarak önbelleğe alınır (aynı katalog → aynı dizin; yenilenen katalog → yeni dizin).
- [ ] Büyük fixture (5.000 tablo, ~20 kolon/tablo, 3.000 fonksiyon, 2.000 FK) ile tek `tamamla` çağrısı, dizin kurulduktan sonra 10 ms bütçesinin altında (CI'da makine farkına karşı cömert bir eşik ve tekrar sayısıyla).
- [ ] Bütçe aşılırsa darboğaz giderilir (ör. yalnızca önekle eşleşmesi mümkün adayların üretilmesi, büyük listelerin CodeMirror'a bırakılan filtrelemeyle sınırlanması).
- [ ] Testler: core'da dizin önbelleğinin yeniden kullanımı (dış davranış: aynı katalogla ikinci çağrı dizin kurmaz, sayaçla ya da zamanla gözlenir) ve süre bütçesi.
