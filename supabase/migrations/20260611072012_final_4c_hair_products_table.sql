DROP TABLE IF EXISTS "4c_hair_products";

CREATE TABLE "4c_hair_products" (
  id           SERIAL PRIMARY KEY,
  hair_type    TEXT,
  product_name TEXT,
  brand        TEXT,
  source_url   TEXT,
  scraped_from TEXT,
  query        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);