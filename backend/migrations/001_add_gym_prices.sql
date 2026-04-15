-- Add configurable plan prices per gym (safe migration)
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS precio_libre NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS precio_12_pases NUMERIC NOT NULL DEFAULT 0;

UPDATE gyms
SET
  precio_libre = COALESCE(precio_libre, 0),
  precio_12_pases = COALESCE(precio_12_pases, 0);
