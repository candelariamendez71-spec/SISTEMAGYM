-- ============================================
-- MIGRACIONES MANUALES PARA SUPABASE (PostgreSQL)
-- ============================================
-- Ejecuta este SQL en el SQL Editor de Supabase
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================

-- MIGRACIÓN 003: Agregar columnas para huellas y roles
-- ============================================

-- Agregar columna finger_id a usuarios (único por gimnasio, opcional)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS finger_id INTEGER;

-- Crear índice único para finger_id por gimnasio (evita duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_finger_gym 
ON usuarios(finger_id, gym_id) 
WHERE finger_id IS NOT NULL;

-- Agregar columna admin_pin a gyms para control de roles
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS admin_pin TEXT;

-- Actualizar gyms existentes con un PIN por defecto (el usuario debe cambiarlo después)
UPDATE gyms SET admin_pin = '0000' WHERE admin_pin IS NULL;


-- MIGRACIÓN 004: Crear tabla de historial de usuarios
-- ============================================

-- Crear tabla de historial completo de usuarios (adaptado para PostgreSQL)
CREATE TABLE IF NOT EXISTS user_historial (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  gym_id INTEGER NOT NULL,
  tipo_evento TEXT NOT NULL CHECK(tipo_evento IN (
    'alta',
    'ingreso',
    'vencimiento',
    'renovacion',
    'inactividad',
    'reactivacion',
    'modificacion',
    'asignacion_huella'
  )),
  descripcion TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_historial_user_id ON user_historial(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_gym_id ON user_historial(gym_id);
CREATE INDEX IF NOT EXISTS idx_historial_tipo_evento ON user_historial(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON user_historial(fecha DESC);


-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas queries para verificar que todo se creó correctamente:

-- Verificar columnas nuevas en usuarios
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' AND column_name = 'finger_id';

-- Verificar columnas nuevas en gyms
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gyms' AND column_name = 'admin_pin';

-- Verificar tabla user_historial
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_historial';

-- Ver el admin_pin actual del gym
SELECT id, nombre, usuario, admin_pin FROM gyms;
