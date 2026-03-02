# son

Bu proje artık görsel bir web uygulaması olarak çalışır: reklam alanı al/sat pazaryeri + MetaMask ile giriş ve MATIC ödeme akışı.

## Özellikler

- MetaMask ile giriş
- Polygon (MATIC) ağı kontrolü
- Yeni alan oluşturma
- Sahip olunan alanı istenen fiyattan satışa koyma
- Satın alınan alanı tekrar istenen fiyattan satışa koyma
- Her satışta sabit `%10` platform komisyonu
- Alan kartları ve işlem geçmişi ile görsel arayüz

## Web uygulamasını çalıştırma

Kök dizinde:

```bash
python -m http.server 8000
```

Sonra tarayıcıda:

- `http://localhost:8000/web/`

## Önemli notlar

- Ödemeler MetaMask `eth_sendTransaction` ile yapılır.
- Alım sırasında 2 ayrı transfer açılır:
  1) Platform cüzdanına `%10` komisyon
  2) Satıcı cüzdanına kalan ödeme
- Platform cüzdan adresini `web/app.js` içindeki `PLATFORM_WALLET` alanından güncelleyin.
- Pazar verileri şu an demo amaçlı tarayıcı `localStorage` içinde tutulur.

## Test

```bash
python -m pytest
```
