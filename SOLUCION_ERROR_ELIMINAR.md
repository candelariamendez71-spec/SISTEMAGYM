# 🔧 Solución: Error al Eliminar Movimientos

Si al intentar eliminar movimientos aparece un error, probablemente sea por **Row Level Security (RLS)**.

## ✅ Solución Rápida

### Opción 1: Deshabilitar RLS (Recomendado para desarrollo)

1. Ir a **Supabase SQL Editor**
2. Ejecutar este comando:

```sql
ALTER TABLE caja_movimientos DISABLE ROW LEVEL SECURITY;
```

3. Refrescar la aplicación e intentar eliminar nuevamente

---

### Opción 2: Habilitar políticas de RLS

Si prefieres mantener RLS activo, ejecuta esto en lugar:

```sql
-- Habilitar RLS
ALTER TABLE caja_movimientos ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones
CREATE POLICY "Permitir todas las operaciones en caja_movimientos"
ON caja_movimientos
FOR ALL
USING (true)
WITH CHECK (true);
```

---

## 🔍 Ver el Error Exacto

1. En la aplicación, abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Intenta eliminar un movimiento
4. Copia el error que aparece y compártelo

Ahora verás logs detallados como:
- "Intentando eliminar movimiento con ID: X"
- "Respuesta del servidor: 200"
- "Error de Supabase al eliminar: ..." (si hay error)

---

## 🧪 Verificar si funciona

Después de ejecutar cualquiera de los comandos SQL:

1. Refrescar la página de Caja
2. Intentar eliminar un movimiento
3. Debe aparecer "Movimiento eliminado" ✅
