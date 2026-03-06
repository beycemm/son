# son

Bu proje modern bir **pixel reklam pazaryeri** olarak çalışır.
Kullanıcılar boş pikselleri görür, tuvalden blok seçer, sahiplenir, satışa koyar ve MetaMask ile MATIC üzerinden satın alma yapar.

## Neler var?

- MetaMask ile giriş
- Polygon (MATIC) ağı doğrulama
- 100x60 pixel tuval (boş/satışta/sahipli renkli görünüm)
- Seç-sürükle ile dikdörtgen blok belirleme
- Blok sahiplenirken **link** ve **resim URL** ekleme
- Sahip olunan bloğun link/resim içeriğini sonradan güncelleme
- Her satışta sabit `%10` komisyon
- Alımda iki transfer:
  1. Platform komisyonu
  2. Satıcı ödemesi

## Çalıştırma

```bash
python -m http.server 8000
```

Tarayıcı:

- `http://localhost:8000/web/`

## Konfigürasyon

- Platform cüzdanını `web/app.js` dosyasındaki `PLATFORM_WALLET` ile değiştir.
- Veriler demo için `localStorage` içinde tutulur (`son_pixel_market_v2`).

## Sorun giderme

- **Kare seçimi çalışmıyor**: Tuval üzerinde tıklayıp sürükleyin; tek tıklama mevcut blokları seçer.
- **MetaMask bağlantı hatası**: Tarayıcıda MetaMask eklentisinin açık olduğundan emin olun.
- **Ağ hatası**: Uygulama Polygon Mainnet'e otomatik geçmeyi dener; reddederseniz işlem durur.

## Test

```bash
python -m pytest
```
