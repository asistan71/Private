# BIST canlı tarama veri sözleşmesi (Android)

Durum: **Canlı BIST sağlayıcısı bağlı değil.** Uygulamadaki THYAO/ASELS/TUPRS/BIMAS skorları demodur; yatırım sinyali değildir.

## Sağlayıcı gereksinimleri

- BIST hisse evreni: **631 hedef sembol**. Bu sayı, sağlayıcıdan doğrulanan aktif sembol sayısı olarak sunulmamalı.
- Yetkili/lisanslı veri sağlayıcısı ve kullanım koşulları belirlenmeli. BIST verilerinin yeniden dağıtım hakkı ayrıca kontrol edilmeli.
- API anahtarları Android uygulamasının `www/` dosyalarına konulmamalı; kimlik doğrulama sunucu tarafında yapılmalı.
- Önerilen uç nokta: `GET /api/bist/snapshot` (uygulama sunucusunda; henüz kurulmadı).
- Örnek yanıt şeması:

```json
{
  "source": "licensed-provider-name",
  "asOf": "2026-11-23T10:00:00+03:00",
  "delayedMinutes": 15,
  "symbols": [
    {"symbol":"THYAO", "last": 0, "changePercent": 0, "volume": 0, "currency":"TRY"}
  ]
}
```

Örnek sayısal değerler gerçek piyasa verisi değildir. `last` pozitif, `volume` sıfır veya pozitif, zaman damgası geçerli olmalıdır. Bilinmeyen semboller, tekrarlar, eksik fiyatlar ve geçersiz sayılar ayıklanmalıdır. Ekranda veri kaynağı, son güncelleme ve gecikme açıkça gösterilmelidir. Ağ hatasında eski veri **canlı** olarak etiketlenmemelidir.

## Analiz ayrımı

- Fiyat snapshot'ı tek başına MTF 100, erken kalkış, RVOL veya giriş/stop/TP üretmek için yeterli değildir.
- Bunlar için 5m/15m/1h kapanmış OHLCV mumları, kurumsal aksiyon düzeltmeleri ve masaüstü terminalinin doğrulanmış puanlama kuralları gerekir.
- Masaüstündeki mevcut 100 puanlık ağırlıklar ve işlem planları kaynak koddan karşılaştırılmadan yeniden yazılmamalıdır.

## Kabul testleri

1. API yokken BIST ekranı DEMO / VERİ YOK olarak kalır.
2. Yanıt hatasında sahte fiyat veya skor oluşturulmaz.
3. Eksik/tekrarlı semboller doğru ele alınır; alınan ve hedef evren sayıları ayrılır.
4. 5m/15m/1h analizleri yalnızca kapanmış mum kullanır.
5. APK derlemesi ve fiziksel Android cihaz testi ayrı ayrı doğrulanır.

## Ücretsiz veriyle ilerleme kararı (23 Kasım 2026)

Kullanıcı lisanslı veri aboneliğini yenilemeden ilerlemeyi seçti. Yalnızca kullanım koşulları otomatik erişime izin veren ücretsiz/açık uç noktalar değerlendirilecek. Kaynak bulunana kadar BIST demo modunda kalacak; gerçek zamanlılık, 631 hissenin kapsandığı veya MTF skoru üretildiği iddia edilmeyecek. Her kaynak için kullanım koşulları, hız limiti, veri gecikmesi, OHLCV geçmişi, sembol kapsamı ve Android erişimi doğrulanmadan entegrasyon etkinleştirilmeyecek. Binance halka açık piyasa verileri ayrı tutulacak.
