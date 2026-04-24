-- Agregar columna finger_id a usuarios (único por gimnasio, opcional)
ALTER TABLE usuarios ADD COLUMN finger_id INTEGER;

-- Crear índice único para finger_id por gimnasio (evita duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_finger_gym 
ON usuarios(finger_id, gym_id) 
WHERE finger_id IS NOT NULL;

-- Agregar columna admin_pin a gyms para control de roles
ALTER TABLE gyms ADD COLUMN admin_pin TEXT;

-- Actualizar gyms existentes con un PIN por defecto (el usuario debe cambiarlo después)
UPDATE gyms SET admin_pin = '0000' WHERE admin_pin IS NULL;
