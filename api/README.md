# Bulut sunucusuz BIST API kurulumu (Windows + Android)

1. GitHub deposunu Windows bilgisayarınıza indirin ve **orijinal** `Piyasa_Terminali_v23_4.py` dosyasını depo ana klasörüne koyun.
2. `api/BIST_API_BASLAT.bat` dosyasını çift tıklayın. Python sanal ortamını kurar, gerekli paketleri yükler, erişim anahtarını sorar ve BIST motorunu yalnızca bilgisayarın yerel adresinde (`127.0.0.1:8765`) başlatır.
3. Bilgisayara ve Android telefona **Tailscale** kurun, aynı hesabın özel ağına bağlayın. Windows üzerinde Tailscale'in **Serve** özelliğiyle `http://127.0.0.1:8765` servisini özel ağınıza HTTPS olarak sunun. Serve'in gösterdiği `https://...ts.net` adresini kullanın. **Funnel** (herkese açık yayın) açmayın.
4. Android uygulamasında **BIST → Python API HTTPS adresi** alanına Tailscale Serve HTTPS adresini, **Erişim anahtarı** alanına başlatırken verdiğiniz anahtarı yazın; **Bağlantıyı kaydet** ile sağlık kontrolü yapın.
5. **Tek Tara** için örneğin `THYAO` yazın. Gerçek sonuç dönerse BIST motoru çalışıyor demektir.

Bilgisayar açık, Python API penceresi çalışıyor ve her iki cihaz Tailscale ağına bağlı olmalıdır. **Bulut sunucusu kiralanmaz**, ancak Tailscale bağlantı hizmeti kullanılır. Tailscale kurmak istemezseniz yerel ağda güvenilir bir HTTPS sertifikası/ters vekil yapılandırması gerekir; Android uygulaması güvenlik nedeniyle düz HTTP'yi kabul etmez.

> Not: Bütün BIST evreni ilk taramada 180 saniyeyi aşabilir; önce Tek Tara ile test edin. Bu sürümde tam tarama için arka plan işi/sonuç önbelleği henüz yoktur. Kurulumun gerçek cihazda tamamlandığı henüz doğrulanmadı.

---

# BIST Python API — kurulum

Bu servis **orijinal** `Piyasa_Terminali_v23_4.py` dosyasının BIST analiz fonksiyonlarını kullanır. Android'in içinde Python çalıştırmaz; Windows PC veya sürekli açık sunucuda çalışır.

## Windows PowerShell

```powershell
py -m pip install fastapi "uvicorn[standard]" borsapy pandas
$env:PT_ENGINE_FILE="C:\\PiyasaTerminali\\Piyasa_Terminali_v23_4.py"
$env:PT_API_TOKEN="BURAYA_UZUN_RASTGELE_GIZLI_ANAHTAR"
py -m uvicorn api.bist_api:app --host 127.0.0.1 --port 8765
```

Komutları GitHub deposunun kök klasöründe çalıştırın. Orijinal Python dosyasını `PT_ENGINE_FILE` yoluna koyun. `PT_API_TOKEN` için benzersiz uzun bir değer seçin; GitHub'a koymayın.

## HTTPS

Android uygulaması yalnızca HTTPS API adresi kabul eder. Uvicorn'un yerel `http://127.0.0.1:8765` adresi telefondan doğrudan erişilemez. HTTPS sertifikalı bir ters vekil (reverse proxy) veya güvenli bir HTTPS tüneli kurup servisi ona bağlayın. Yalnızca kendi cihazlarınızın erişebildiği ağ/tünel tercih edin. Telefon uygulamasındaki BIST sekmesinde **Python API HTTPS adresi** alanına HTTPS kök adresini, **Erişim anahtarı** alanına `PT_API_TOKEN` değerini girin.

### API

- `GET /api/health` — motor ve hisse evreni kontrolü (Bearer token gerekir).
- `GET /api/bist/scan?symbol=THYAO` — tek hisse.
- `GET /api/bist/scan` — orijinal kodun tüm BIST hisse evreni.

Örnek test:

```powershell
$headers=@{Authorization="Bearer $env:PT_API_TOKEN"}
Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/health" -Headers $headers
Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/bist/scan?symbol=THYAO" -Headers $headers
```

**Önemli:** Tam evren taraması veri sağlayıcısının hızı ve istek sınırlarına bağlıdır; 180 saniyelik Android zaman aşımını aşabilir. Bu durumda sunucuda arka plan işi + sonuç sorgulama sistemi gerekir. Orijinal dosyadaki sembol listesi dinamik olarak 631'e tamamlanmaz; API gerçek `universe` sayısını döndürür. `borsapy` bağlantısı veya HTTPS sunucusu doğrulanmadan canlı BIST entegrasyonu tamamlandı denemez.
