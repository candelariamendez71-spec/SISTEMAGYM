# ⚠️ ACCIÓN REQUERIDA: Crear Tabla en Supabase

La tabla `caja_movimientos` necesita ser creada manualmente en Supabase.

## 📋 Pasos para Crear la Tabla

### 1. Acceder a Supabase

1. Ir a https://supabase.com
2. Iniciar sesión
3. Seleccionar tu proyecto

### 2. Abrir el SQL Editor

1. En el menú lateral, hacer click en **"SQL Editor"**
2. Hacer click en **"New Query"** (o "+ Nueva consulta")

### 3. Copiar y Pegar este SQL

```sql
-- Crear tabla caja_movimientos
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

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_caja_gym_fecha ON caja_movimientos(gym_id, fecha);
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON caja_movimientos(tipo);

-- Deshabilitar RLS (Row Level Security) para permitir acceso completo
ALTER TABLE caja_movimientos DISABLE ROW LEVEL SECURITY;
```

### 4. Ejecutar el SQL

1. Hacer click en **"Run"** (o presionar Ctrl+Enter / Cmd+Enter)
2. Verificar que aparezca el mensaje: **"Success. No rows returned"**

### 5. Verificar que la Tabla se Creó

1. En el menú lateral, ir a **"Table Editor"**
2. Deberías ver la tabla **"caja_movimientos"** en la lista
3. La tabla debe tener todas las columnas:
   - id
   - gym_id
   - tipo
   - categoria
   - descripcion
   - monto
   - metodo_pago
   - fecha
   - created_at

### 6. ¡Listo!

Ahora puedes regresar a tu aplicación y probar guardar movimientos.

---

## 🔄 Si ya ejecutaste el SQL y sigue sin funcionar

1. Verificar que no haya errores en la consola del navegador (F12 → Console)
2. Verificar que el servidor esté corriendo (`pnpm start`)
3. Refrescar la página del módulo Caja
4. Intentar guardar un movimiento nuevamente

---

## 🐛 Troubleshooting

### Error: "relation caja_movimientos does not exist"
→ La tabla no se creó. Ejecutar el SQL nuevamente en Supabase.

### Error: "column gym_id does not exist"
→ Asegurarse de copiar TODO el SQL, incluyendo todos los campos.

### Error: "permission denied"
→ Verificar que tu API key tenga permisos de escritura.

---

**Una vez completados estos pasos, el módulo de Caja funcionará correctamente.**
