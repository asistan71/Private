# Piyasa Terminali — BIST öncelikli yol haritası

Bu dosya projenin kalıcı iş sırasıdır. BIST birinci önceliktir; Binance mevcut işlevleri korunarak ikinci plandadır. Android uygulaması bilgisayar veya Python sunucusuna zorunlu bağımlı olmayacaktır.

## Kurallar
- Tek Tara butonu kaldırıldı. Ana işlem: **Tara**.
- 631 hisse hedef evren; canlı toplu tarama doğrulanmadan tamamlandı denmeyecek.
- Gerçek veri, skor ve sinyaller uydurulmayacak; deneysel algoritmalar açıkça etiketlenecek.
- Her madde: kod → otomatik kontrol → APK derlemesi → telefonda doğrulama → tamamlandı.

## Öncelik sırası
1. [ ] Android tuşları, arama, filtreler, favoriler, menü geçişleri: gerçek cihaz testi.
2. [ ] BIST canlı veri bağlantısı: Android HTTP ve güvenilir veri sağlayıcısı, tazelik/erişim kontrolü.
3. [ ] 631 BIST hissesinin toplu taraması: istek sınırı, paralellik, hata/ilerleme göstergesi.
4. [ ] Mevcut Python motoruyla 100 puanlık BIST skorunun eşdeğerlik testleri.
5. [ ] Erken kalkış ve 60/30/10 günlük hacim pencereleri, hacim patlaması.
6. [ ] Haftalık/günlük/saatlik çoklu zaman dilimi teyidi.
7. [ ] Giriş, stop, TP1–TP3, risk/ödül ve %2 risk planı.
8. [ ] En güçlü 5–10 aday, fırsat panelleri, filtreler.
9. [ ] TradingView tarzı mum grafiği, hacim ve çizim araçları.
10. [ ] Sinyal geçmişi, geçmiş başarı testi ve Android bildirimleri.
11. [ ] Mobil pastel/neon arayüz, fiyat yönü renkleri ve favori görünümleri.
12. [ ] Tarama hızı, veri tazeliği, istek sayısı, sinyal kalitesi ve geriye dönük testler.
13. [ ] Kararlı APK, cihazlar arası ve uzun süreli kullanım testleri.

## Son gelişmeler
- Tek Tara butonu ve JavaScript olay dinleyicisi kaldırıldı.
- Uygulamadaki tüm tuşları engelleyen JavaScript sözdizimi hatası giderildi.
- Tara, BIST sembolü girildiğinde doğrudan veri denemesine yönlendirildi.
- Android CapacitorHttp ile veri alma denemesi eklendi; telefonda doğrulama bekliyor.
- 631 hisse için doğrulanmış toplu canlı veri sağlayıcısı henüz yok.

## Sıradaki kabul testi
Yeni APK'da THYAO gir → Tara → durum/mesaj ve sonuç; ardından BIST arama, Favoriler, filtreler ve sekmelerin tepkisini kontrol et. Veri sağlayıcısı hata verirse hata mesajını kaydet ve düzelt.
