-- Create caja_movimientos table for cash flow management (PostgreSQL/Supabase)
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id BIGSERIAL PRIMARY KEY,
  gym_id BIGINT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
  categoria TEXT NOT NULL CHECK(categoria IN ('mensualidad', 'clase_prueba', 'producto', 'gasto')),
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL CHECK(monto > 0),
  metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('efectivo', 'transferencia', 'otro')),
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by gym and date
CREATE INDEX IF NOT EXISTS idx_caja_gym_fecha ON caja_movimientos(gym_id, fecha);
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON caja_movimientos(tipo);

-- Disable RLS for full access
ALTER TABLE caja_movimientos DISABLE ROW LEVEL SECURITY;
