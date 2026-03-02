# son

Bu depo için çalışır bir başlangıç projesi hazırlandı: görev (todo) CLI'si + reklam alanı pazaryeri.

## Özellikler

- Görev ekleme/listeleme/tamamlama
- Reklam alanı oluşturma (yeni alan)
- Satın alınmış alanı istenen fiyatla tekrar satışa koyma
- Yeni alanı istenen fiyatla satışa koyma
- Her satışta platforma sabit `%10` komisyon

## Kurulum

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Kullanım

### Görev CLI

```bash
python -m son.app add "Dokümantasyonu güncelle"
python -m son.app list
python -m son.app done 1
```

### Alan pazaryeri

```bash
# yeni alan oluştur
python -m son.app area-create alice billboard-1

# sahibi istediği fiyattan satışa koysun
python -m son.app area-sell alice billboard-1 250

# pazarı görüntüle
python -m son.app area-market

# alanı satın al
python -m son.app area-buy bob billboard-1

# yeni sahip yine istediği fiyata tekrar satışa koyabilir
python -m son.app area-sell bob billboard-1 333

# kullanıcının sahip olduğu alanları gör
python -m son.app area-portfolio bob
```

Satış çıktısında komisyon ve satıcıya kalan tutar ayrı gösterilir.

## Test

```bash
python -m pytest
```
