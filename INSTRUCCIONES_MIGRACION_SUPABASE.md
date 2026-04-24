# 🔧 Instrucciones para Ejecutar Migraciones en Supabase

## ⚠️ IMPORTANTE: Las migraciones NO se aplicaron automáticamente

El servidor está funcionando correctamente, pero las nuevas columnas y tablas **no existen** aún en tu base de datos Supabase. Necesitas ejecutar el SQL manualmente.

## 📝 Pasos para Ejecutar las Migraciones

### 1️⃣ Abrir Supabase SQL Editor

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto de gimnasio
3. En el menú lateral izquierdo, haz clic en **"SQL Editor"**

### 2️⃣ Ejecutar el SQL de Migración

1. Abre el archivo: `backend/migrations/SUPABASE_MANUAL_MIGRATION.sql`
2. **Copia TODO el contenido** del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en el botón **"Run"** (▶️ ) en la esquina inferior derecha
5. Deberías ver mensajes de éxito (sin errores rojos)

### 3️⃣ Verificar que Funcionó

En el mismo SQL Editor de Supabase, ejecuta esta query para verificar:

```sql
-- Verificar que las columnas se crearon
SELECT 
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'usuarios' AND column_name = 'finger_id') as finger_id_existe,
  
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'gyms' AND column_name = 'admin_pin') as admin_pin_existe,
  
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name = 'user_historial') as tabla_historial_existe;
```

**Resultado esperado:** Los tres valores deben ser `1`

### 4️⃣ Probar el Sistema de Roles

Una vez ejecutadas las migraciones, **reinicia el servidor** (ya está corriendo, solo presiona Ctrl+C en la terminal y vuelve a hacer `npm start`), y luego prueba:

**Desde PowerShell:**

```powershell
# Login como STAFF (sin PIN)
$body = @{usuario='cyber'; password='1234'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3002/api/login' -Method POST -Body $body -ContentType 'application/json' | ConvertTo-Json

# Debería retornar: "role": "staff"

# Login como OWNER (con PIN '0000')
$body = @{usuario='cyber'; password='1234'; pin='0000'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3002/api/login' -Method POST -Body $body -ContentType 'application/json' | ConvertTo-Json

# Debería retornar: "role": "owner"
```

### 5️⃣ Probar desde el Frontend

1. Abre la aplicación en tu navegador
2. Ve a la página de login
3. Ingresa con tus credenciales SIN el PIN → Deberías ver el badge "👤 Staff"
4. Cierra sesión
5. Ingresa con tus credenciales CON PIN `0000` → Deberías ver el badge "👑 Dueño"

---

## 🎯 Después de las Migraciones

Una vez verificado que todo funciona:

### ✅ Checklist de Testing Completo

- [ ] Login como Staff (sin PIN) funciona
- [ ] Login como Owner (con PIN) funciona
- [ ] Staff NO ve botones de eliminar en Caja
- [ ] Staff NO ve el resumen de Caja
- [ ] Staff NO ve el botón "Reporte Mensual"
- [ ] Owner SÍ ve todo lo anterior
- [ ] Crear un usuario registra evento "alta" en historial
- [ ] Registrar ingreso por DNI crea evento "ingreso"
- [ ] Renovar plan crea evento "renovacion"
- [ ] GET `/api/user/:id/historial` retorna el historial correctamente

### 🚀 Listo para Deploy

Una vez completado el testing:

1. **Commit a Git:**
   ```bash
   git add .
   git commit -m "feat: Sistema de roles, huellas digitales, historial completo"
   git push origin main
   ```

2. **Deploy a Render:**
   - Render detectará el push automáticamente
   - El servidor se reiniciará con las nuevas extensiones
   - Las migraciones ya estarán aplicadas en Supabase (las ejecutaste manualmente)

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué no se ejecutaron automáticamente las migraciones?**
R: Supabase no permite ejecutar SQL directamente desde código Node.js por seguridad. Debes usar el SQL Editor.

**P: ¿Tengo que ejecutar las migraciones en producción también?**
R: No, Supabase es tu base de datos en la nube. Al ejecutar el SQL en el SQL Editor, se aplica a tu base de datos de producción.

**P: ¿Qué pasa si ya tengo datos en las tablas?**
R: Las migraciones usan `ADD COLUMN IF NOT EXISTS` y `CREATE TABLE IF NOT EXISTS`, así que son seguras. No borran datos existentes.

**P: ¿Cómo cambio el PIN por defecto '0000'?**
R: Una vez funcione el sistema, puedes usar el endpoint `PUT /api/gym/:id/pin` o cambiar el valor directamente en Supabase.
