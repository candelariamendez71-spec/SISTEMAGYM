# 🚀 INICIO RÁPIDO - Extensiones del Sistema

## ⚡ 3 Pasos para Activar las Nuevas Funcionalidades

### 1️⃣ Ejecutar Migraciones

**Si usas Node.js/SQLite local:**
```bash
cd backend
node run-extension-migrations.js
```

**Si usas Supabase:**
- Ve al **SQL Editor** en Supabase
- Copia y pega el contenido de:
  - `backend/migrations/003_add_fingerprint_and_roles.sql`
  - `backend/migrations/004_create_user_historial.sql`
- Ejecuta cada migración

### 2️⃣ Reiniciar Servidor

```bash
cd backend
npm start
```

Deberías ver:
```
🚀 Inicializando extensiones del sistema...
✅ Endpoint de acceso por huella creado
✅ Sistema de roles habilitado
```

### 3️⃣ Probar el Sistema

#### Probar Login con Roles:

1. **Login como Staff (sin PIN):**
   - Usuario: `cyber`
   - Contraseña: `1234`
   - PIN: _(dejar vacío)_
   - Resultado: Verás "👤 Staff"

2. **Login como Owner (con PIN):**
   - Usuario: `cyber`
   - Contraseña: `1234`
   - PIN: `0000`
   - Resultado: Verás "👑 Dueño"

#### Verificar Caja:

**Como Staff:**
- ❌ No ves tarjetas de resumen
- ❌ No ves botón "Reporte Mensual"
- ❌ No ves botones de eliminar

**Como Owner:**
- ✅ Ves todo el resumen
- ✅ Puedes descargar PDF
- ✅ Puedes eliminar movimientos

---

## 🔐 Cambiar PIN por Defecto

**IMPORTANTE:** El PIN inicial es `0000`, cámbialo inmediatamente:

```bash
PUT http://localhost:3002/api/gym/1/pin
Headers: { "role": "owner" }
Body:
{
  "current_pin": "0000",
  "new_pin": "TU_NUEVO_PIN"
}
```

O usa Postman/Insomnia/Thunder Client.

---

## 📋 Verificar que Todo Funciona

### Checklist ✅

- [ ] Migraciones ejecutadas correctamente
- [ ] Servidor reiniciado sin errores
- [ ] Login como Staff funciona (sin tarjetas de resumen)
- [ ] Login como Owner funciona (con tarjetas de resumen)
- [ ] Crear movimiento de caja funciona
- [ ] Owner puede eliminar movimientos
- [ ] Staff NO puede eliminar movimientos
- [ ] Owner puede descargar PDF

---

## 🐛 Solución de Problemas

### "Column finger_id does not exist"
→ Las migraciones no se ejecutaron. Ejecutarlas manualmente en Supabase.

### "PIN incorrecto"
→ Verificar que el PIN sea `0000` por defecto o el que configuraste.

### "No veo el botón de Reporte"
→ Verificar que hayas hecho login con PIN (como Owner).

### Servidor no inicia
→ Verificar que `server-extensions.js` exista en `/backend`

---

## 📚 Documentación Completa

Ver: `EXTENSIONES_SISTEMA_README.md`

---

## 🎉 ¡Listo!

Tu sistema ahora tiene:
- ✅ Sistema de roles completo
- ✅ Historial de usuarios automático
- ✅ Seguridad en caja
- ✅ Acceso por huella (backend listo)
- ✅ Generación de PDF

**Todo sin romper nada existente** 🚀
