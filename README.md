# InventoryFlow Frontend

InventoryFlow frontend, şirket içi stok ve talep yönetimi için hazırlanmış Vue 3 tabanlı SPA uygulamasıdır.

## Kullanılan Teknolojiler

- Vite
- Vue 3
- Vue Router
- Pinia
- Axios
- Vuetify
- Tailwind CSS
- Vue I18n

## Ana Özellikler

- Token tabanlı login akışı
- Role göre menü ve route kontrolü
- Admin, idari işler ve birim kullanıcısı ayrımı
- Ürün yönetimi
- Tedarikçi yönetimi
- Mal kabul ekranı
- Talep oluşturma ve talep detay akışı
- Ürün listede yoksa talep açabilme
- Talep kalemini sonradan ürün kartına bağlama
- Stok hareketlerini izleme
- Düşük stok takibi
- Kullanıcı yönetimi
- TR/EN dil desteği
- Aydınlık, karanlık ve sistem teması

## Kurulum

```bash
npm install
```

`.env` dosyası oluştur:

```bash
cp .env.example .env
```

Varsayılan API adresi:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Geliştirme Ortamında Çalıştırma

```bash
npm run dev
```

Uygulama varsayılan olarak şu adreste açılır:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

## Docker ile Çalıştırma

Frontend image oluştur:

```bash
docker build -t inventoryflow-frontend .
```

Container çalıştır:

```bash
docker run --rm -p 8080:80 inventoryflow-frontend
```

Uygulama:

```text
http://localhost:8080
```

Backend farklı adresteyse build sırasında API adresi verilebilir:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:8000/api \
  -t inventoryflow-frontend .
```

## Proje Akışı

1. Birim kullanıcısı talep açar.
2. İdari işler/admin talebi inceler.
3. Stok varsa talep stoktan teslim edilir.
4. Stok yoksa talep tedarik bekliyor durumuna geçer.
5. Mal kabul ile stok girişi yapılır.
6. Gerekirse talep kalemi ürün kartına bağlanır.
7. Talep teslim edilir ve stok hareketi oluşur.

## Git Notu

Bu repo sadece frontend kodlarını içerir. Backend ayrı repo olarak yönetilir.
