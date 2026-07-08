# Veritabani yedekleri

Bu klasore `npm run db:backup` ile otomatik kopyalar yazilir.
Git'e eklenmez.

Dosya turleri:
- `local-*.db` — yerel SQLite kopyasi
- `local-*.json` / `turso-*.json` — tablo bazli JSON export

Son 30 yedek tutulur; eskiler silinir.
