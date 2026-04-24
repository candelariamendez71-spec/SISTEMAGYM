-- Crear tabla de historial completo de usuarios
CREATE TABLE IF NOT EXISTS user_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_historial_user_id ON user_historial(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_gym_id ON user_historial(gym_id);
CREATE INDEX IF NOT EXISTS idx_historial_tipo_evento ON user_historial(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON user_historial(fecha DESC);
