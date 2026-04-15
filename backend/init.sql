PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  logo TEXT NOT NULL,
  color TEXT NOT NULL,
  precio_libre REAL NOT NULL DEFAULT 0,
  precio_12_pases REAL NOT NULL DEFAULT 0,
  usuario TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  dni TEXT NOT NULL,
  tipo_plan TEXT NOT NULL CHECK(tipo_plan IN ('libre','12_pases')),
  fecha_inicio TEXT NOT NULL,
  fecha_vencimiento TEXT NOT NULL,
  ingresos_disponibles INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL CHECK(estado IN ('activo','inactivo')),
  gym_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(dni, gym_id),
  FOREIGN KEY(gym_id) REFERENCES gyms(id)
);

CREATE TABLE IF NOT EXISTS ingresos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);

INSERT OR IGNORE INTO gyms (id, nombre, logo, color, precio_libre, precio_12_pases, usuario, password) VALUES
  (1, 'Cyber Argento Gym', '/images/logo.png', '#00FFC6', 0, 0, 'cyber', '1234'),
  (2, 'Gimnasio Capital', '/images/logo.png', '#FF6B6B', 0, 0, 'capital', '5678'),
  (3, 'Gimnasio Norte', '/images/logo.png', '#4ECDC4', 0, 0, 'norte', 'abcd'),
  (4, 'Apolo Gym', '/images/logo.png', '#FFD700', 0, 0, 'apologymiseas', 'veronicaapolo873');

INSERT OR IGNORE INTO usuarios (id, nombre, dni, tipo_plan, fecha_inicio, fecha_vencimiento, ingresos_disponibles, estado, gym_id, created_at) VALUES
  (1, 'Juan Pérez', '12345678', 'libre', '2026-03-15', '2026-10-01', 0, 'activo', 1, '2026-03-15'),
  (2, 'María García', '87654321', '12_pases', '2026-03-20', '2026-09-30', 8, 'activo', 1, '2026-03-20'),
  (3, 'Carlos López', '11223344', '12_pases', '2026-01-10', '2026-02-10', 0, 'inactivo', 1, '2026-01-10'),
  (4, 'Ana Martínez', '55667788', 'libre', '2026-04-01', '2026-10-01', 0, 'activo', 2, '2026-04-01'),
  (5, 'Roberto Sánchez', '99887766', '12_pases', '2026-03-01', '2026-06-01', 2, 'activo', 2, '2026-03-01');
