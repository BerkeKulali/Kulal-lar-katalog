# Kulalılar Seramik Katalog

Tablet odaklı seramik katalog uygulaması (PWA).

## Kurulum

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Tarayıcıda: http://localhost:3000

## İlk kullanım

1. `/kurulum` — pazarlamacı seçip tableti kaydedin
2. Ana sayfa → marka → ölçü → ürün listesi
3. Sağ alttaki palet ikonu → sipariş listesi

## Görseller (Cloudinary)

Ürün görselleri **Cloudinary CDN** üzerinde saklanır (local dosya değil).

1. `.env.example` dosyasını `.env` olarak kopyalayın
2. Cloudinary bilgilerini girin (banner-studio ile aynı hesap olabilir)
3. Admin → **Görsel yönetimi** → yükle ve ürüne ata

Klasör yapısı: `kulalilar-katalog/{marka}/{urun-ailesi}/`

Atama seçenekleri:
- **Liste görseli** — katalog kartında görünür
- **Ölçü bazlı** — o ölçünün tüm varyantları
- **Tek variant** — belirli yüzey/kalite

## Admin

- URL: `/admin/login`
- Süper admin: `admin@kulalilar.com` / `admin123`
- QUA sorumlusu: `qua@kulalilar.com` / `qua123`

## Vercel ön gösterim

SQLite dosyası Vercel sunucusunda **çalışmaz** (kalıcı disk yok). Ön gösterim için [Turso](https://turso.tech) (ücretsiz) kullanın.

### 1. Turso veritabanı

```bash
# Turso CLI: brew install tursodatabase/tap/turso && turso auth login
turso db create kulalilar-preview
turso db show kulalilar-preview --url
turso db tokens create kulalilar-preview
```

### 2. Şemayı ve demo veriyi yükle

`.env` dosyasında geçici olarak Turso URL + token ayarlayın, sonra:

```bash
npx prisma migrate deploy
npm run db:seed
```

### 3. Vercel’e deploy

1. Projeyi GitHub’a push edin
2. [vercel.com/new](https://vercel.com/new) → repo seçin
3. **Environment Variables** ekleyin:

| Değişken | Değer |
|----------|--------|
| `DATABASE_URL` | `libsql://....turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso token |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary |
| `CLOUDINARY_API_KEY` | Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary |

4. Deploy — build komutu otomatik: `prisma generate && prisma migrate deploy && next build`

Alternatif (CLI): `npx vercel` (ilk seferde env’leri sorar)

### 4. İlk kullanım (canlı)

1. `https://your-app.vercel.app/kurulum` — tableti kaydedin
2. Katalog gezin; admin: `/admin/login?key=ADMIN_ACCESS_KEY` (ofis bilgisayarı, tablet değil)

## Admin erişimi

- Katalog menüsünde admin linki yok.
- Kayıtlı tabletler (`/kurulum`) admin panele erişemez.
- Canlıda `ADMIN_ACCESS_KEY` tanımlayın; giriş: `/admin/login?key=...` (bir kez, sonra cookie saklanır).

## Excel fiyat import

Admin → Excel import/export → şablonu indir, düzenle, yükle.

Sütunlar: `marka_slug`, `aile`, `olcu`, `yuzey`, `kalite`, `fiyat`, `kod`
