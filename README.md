# Kulalılar Seramik Katalog

Tablet odaklı seramik katalog uygulaması (PWA).

## Kurulum

```bash
npm install
cp .env.example .env      # SESSION_SECRET'ı mutlaka doldurun
npm run db:migrate
npm run db:seed
npm run dev
```

Tarayıcıda: http://localhost:3000

### Zorunlu ortam değişkenleri

| Değişken | Neden gerekli |
|----------|---------------|
| `DATABASE_URL` | Veritabanı bağlantısı |
| `SESSION_SECRET` | Admin oturum cookie'sinin HMAC imzası (min. 32 karakter). Yoksa admin girişi 503 döner. |
| `ADMIN_ACCESS_KEY` | Production'da admin paneli kapısı. Yoksa panel tamamen kapalıdır. |
| `CLOUDINARY_*` | Ürün görselleri |

Tam liste ve açıklamalar için `.env.example`.

## Testler

```bash
npm test           # tek seferlik
npm run test:watch # izleme modu
```

Testler `src/**/*.test.ts` altında; öncelik fiyat/ölçü/yüzey ayrıştırma gibi
saf mantıkta (hatası sessiz veri bozulmasına yol açan yerler).

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
- Seed kullanıcı şifreleri `SEED_ADMIN_PASSWORD` / `SEED_QUA_PASSWORD` env değişkenleriyle belirlenir. Canlı ortamda seed şifrelerini asla kullanmayın; panelden değiştirin.

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

Ayrıca `SESSION_SECRET` ve `ADMIN_ACCESS_KEY` eklemeyi unutmayın (yukarıdaki
zorunlu değişkenler tablosuna bakın).

4. Deploy — build komutu otomatik: `prisma generate && tsx scripts/turso-migrate.ts && next build`

> **Migration runner hakkında:** Turso üzerinde `prisma migrate deploy` yerine
> elle yazılmış `scripts/turso-migrate.ts` kullanılıyor. Uygulanan migration'lar
> `_turso_migrations` tablosunda tutulur ve klasör adına göre sırayla çalışır.
> Bu runner **transaction/rollback garantisi vermez** — yarıda kalan bir
> migration veritabanını tutarsız bırakabilir. Şema değiştiren deploy'lardan
> önce `npm run db:migrate:turso` komutunu ayrıca çalıştırıp sonucu doğrulamak
> ve `backups/` altındaki güncel yedeği elde tutmak önerilir.

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
