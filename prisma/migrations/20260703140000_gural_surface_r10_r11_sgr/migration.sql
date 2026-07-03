-- Güral yüzey kodları: SUG → SGR, R10 ve R11 eklendi (SQLite enum = TEXT)
UPDATE "ProductVariant" SET "surface" = 'SGR' WHERE "surface" = 'SUG';
