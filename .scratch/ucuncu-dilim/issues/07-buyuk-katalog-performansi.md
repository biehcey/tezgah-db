# 07: Büyük katalogda performans

Spec: [Performans](../spec.md#performans), [core: Tamamlama motoru](../spec.md#core-tamamlama-motoru-yeni-saf), [Testing Decisions](../spec.md#testing-decisions)

**What to build:** Binlerce tablolu ve binlerce fonksiyonlu bir hedefte tamamlama yazmayı yavaşlatmaz. Katalogdan kurulan arama dizinleri (ilişkiler, ilişki başına kolonlar, iki yönlü FK'ler, ada göre gruplu fonksiyonlar) katalog nesnesi başına bir kez kurulur; her tuşta yeniden kurulmaz.

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [x] Dizinler katalog nesnesine bağlı olarak önbelleğe alınır (aynı katalog → aynı dizin; yenilenen katalog → yeni dizin).
- [x] Büyük fixture (5.000 tablo, ~20 kolon/tablo, 3.000 fonksiyon, 2.000 FK) ile tek `tamamla` çağrısı, dizin kurulduktan sonra 10 ms bütçesinin altında (CI'da makine farkına karşı cömert bir eşik ve tekrar sayısıyla).
- [x] Bütçe aşılırsa darboğaz giderilir (ör. yalnızca önekle eşleşmesi mümkün adayların üretilmesi, büyük listelerin CodeMirror'a bırakılan filtrelemeyle sınırlanması).
- [x] Testler: core'da dizin önbelleğinin yeniden kullanımı (dış davranış: aynı katalogla ikinci çağrı dizin kurmaz, sayaçla ya da zamanla gözlenir) ve süre bütçesi.

## Comments

- Ölçüm (`test/buyuk-katalog.ts`, dizin kurulduktan sonra 30 tekrarın medyanı, geliştirici makinesi): 12 FROM ilişkili ifade 3,7 ms (2.046 öneri), fonksiyon ağırlıklı `WHERE |` 2,0 ms, ilişki yuvası 2,4 ms (5.274 öneri), `JOIN |` 2,4 ms, `ON |` 2,1 ms, `satis.|` 0,6 ms, `a3.|` 0,1 ms; ilk çağrı (dizin kurma dahil) ~24 ms. Bütçe aşılmadığından darboğaz düzeltmesi gerekmedi; dizinler (01–04'te `katalogaBagli` ile kurulmuş) değişmedi. Testte eşik medyan < 30 ms (ısınma 3 çağrı, 15 tekrar). Önbellek testi katalog vekiliyle `iliskiler`/`fonksiyonlar`/`fkler` okumalarını sayar; önbellek kapatılınca kırmızıya döndüğü doğrulandı.
