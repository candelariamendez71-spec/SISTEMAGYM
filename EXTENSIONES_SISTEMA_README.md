# 🚀 EXTENSIONES DEL SISTEMA DE GESTIÓN DE GIMNASIO

## 📋 Resumen de Nuevas Funcionalidades

Este sistema ha sido extendido con funcionalidades avanzadas **sin romper la lógica existente**:

✅ **Acceso por Huella Digital** (ESP32 + Sensor AS608)  
✅ **Historial Completo de Usuarios** (Timeline de eventos)  
✅ **Sistema de Roles** (Dueño vs Staff)  
✅ **Seguridad en Caja** (Control por roles)  
✅ **Resumen Mensual en PDF**  

---

## 🗄️ 1. MIGRACIONES DE BASE DE DATOS

### Ejecutar Migraciones

**Opción 1: Automática (con Node.js)**
```bash
cd backend
node run-extension-migrations.js
```

**Opción 2: Manual (en Supabase SQL Editor)**

Si usas Supabase, ejecuta manualmente estos SQL:

#### Migración 003: Huella Digital y PIN de Admin
```sql
-- Agregar columna finger_id a usuarios
ALTER TABLE usuarios ADD COLUMN finger_id INTEGER;

-- Crear índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_finger_gym 
ON usuarios(finger_id, gym_id) 
WHERE finger_id IS NOT NULL;

-- Agregar columna admin_pin a gyms
ALTER TABLE gyms ADD COLUMN admin_pin TEXT;

-- PIN por defecto
UPDATE gyms SET admin_pin = '0000' WHERE admin_pin IS NULL;
```

#### Migración 004: Tabla de Historial
```sql
-- Crear tabla de historial
CREATE TABLE IF NOT EXISTS user_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  gym_id INTEGER NOT NULL,
  tipo_evento TEXT NOT NULL CHECK(tipo_evento IN (
    'alta', 'ingreso', 'vencimiento', 'renovacion',
    'inactividad', 'reactivacion', 'modificacion', 'asignacion_huella'
  )),
  descripcion TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_historial_user_id ON user_historial(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_gym_id ON user_historial(gym_id);
CREATE INDEX IF NOT EXISTS idx_historial_tipo_evento ON user_historial(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON user_historial(fecha DESC);
```

### Verificar Migraciones

Verifica que las columnas existan:
```sql
-- Verificar finger_id en usuarios
SELECT finger_id FROM usuarios LIMIT 1;

-- Verificar admin_pin en gyms
SELECT admin_pin FROM gyms LIMIT 1;

-- Verificar tabla user_historial
SELECT * FROM user_historial LIMIT 1;
```

---

## 🔐 2. SISTEMA DE ROLES (DUEÑO vs STAFF)

### Cómo Funciona

El sistema ahora diferencia entre dos roles:

#### 👑 **OWNER (Dueño)**
- Acceso completo a todas las funcionalidades
- Puede ver resumen de caja
- Puede editar y eliminar movimientos
- Puede generar PDF mensual

#### 👤 **STAFF (Personal)**
- Puede registrar movimientos de caja
- Puede registrar usuarios
- Puede registrar ingresos
- **NO puede** ver resumen total
- **NO puede** editar/eliminar movimientos
- **NO puede** generar reportes PDF

### Login con Roles

**1. Login como Staff (por defecto)**
```json
POST /api/login
{
  "usuario": "cyber",
  "password": "1234"
}
```
Respuesta:
```json
{
  "success": true,
  "role": "staff",
  "gym": {...},
  "users": [...]
}
```

**2. Login como Owner (con PIN)**
```json
POST /api/login
{
  "usuario": "cyber",
  "password": "1234",
  "pin": "0000"
}
```
Respuesta:
```json
{
  "success": true,
  "role": "owner",
  "gym": {...},
  "users": [...]
}
```

### Interfaz de Login

El formulario de login ahora incluye un campo opcional de **PIN**:

- Si ingresas el PIN correcto → accedes como **Owner**
- Si no ingresas PIN o es incorrecto → accedes como **Staff**

```
┌──────────────────────────┐
│ Usuario: cyber           │
│ Contraseña: ****         │
│ PIN Admin: **** (opcional)│
│ [Ingresar]               │
└──────────────────────────┘
```

### Cambiar PIN de Admin

```bash
PUT /api/gym/:id/pin
Headers: { "role": "owner" }
Body:
{
  "current_pin": "0000",
  "new_pin": "1234"
}
```

**IMPORTANTE:** Solo el Owner puede cambiar el PIN.

---

## 👆 3. ACCESO POR HUELLA DIGITAL

### Requisitos de Hardware

- **Microcontrolador:** ESP32
- **Sensor:** AS608 (sensor de huella digital)
- Conexión WiFi

### Asignar Huella a Usuario

```bash
PUT /api/user/:user_id/fingerprint
Body:
{
  "finger_id": 1,
  "gym_id": 1
}
```

Respuesta:
```json
{
  "success": true,
  "message": "Huella digital asignada correctamente",
  "user": {...}
}
```

### Acceso por Huella

Desde el ESP32, enviar:

```bash
POST /api/access/fingerprint
Body:
{
  "finger_id": 1,
  "gym_id": 1
}
```

Respuesta (éxito):
```json
{
  "success": true,
  "message": "Acceso permitido",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "plan": "libre"
  }
}
```

Respuesta (sin pases):
```json
{
  "success": false,
  "message": "Sin pases disponibles"
}
```

### Registro Automático en Historial

Cada acceso por huella se registra automáticamente:
- Tipo: `"ingreso"`
- Descripción: `"Ingreso registrado via Huella Digital"`

---

## 📜 4. HISTORIAL DE USUARIOS

### Obtener Historial

```bash
GET /api/user/:user_id/historial
```

Respuesta:
```json
{
  "success": true,
  "total": 15,
  "historial": [
    {
      "id": 1,
      "user_id": 1,
      "gym_id": 1,
      "tipo_evento": "alta",
      "descripcion": "Usuario Juan Pérez registrado con plan libre",
      "fecha": "2026-04-20",
      "hora": "10:30:00"
    },
    {
      "tipo_evento": "ingreso",
      "descripcion": "Ingreso registrado via DNI",
      "fecha": "2026-04-21",
      "hora": "08:15:00"
    },
    ...
  ]
}
```

### Tipos de Eventos

| Tipo | Descripción |
|------|-------------|
| `alta` | Usuario registrado por primera vez |
| `ingreso` | Acceso al gimnasio (DNI o huella) |
| `vencimiento` | Plan vencido, usuario inactivado |
| `renovacion` | Plan renovado |
| `reactivacion` | Usuario reactivado después de estar inactivo |
| `asignacion_huella` | Huella digital asignada |
| `modificacion` | Datos del usuario modificados |

### Eventos Automáticos

El sistema registra automáticamente:

✅ **Cuando se crea un usuario** → `"alta"`  
✅ **Cada acceso (DNI o huella)** → `"ingreso"`  
✅ **Cuando vence un plan** → `"vencimiento"`  
✅ **Cuando se renueva** → `"renovacion"`  

---

## 💰 5. SEGURIDAD EN CAJA

### Permisos por Rol

#### Staff puede:
✅ Ver lista de movimientos  
✅ Crear nuevos movimientos (ventas, gastos)  

#### Staff NO puede:
❌ Ver resumen total de ingresos/egresos  
❌ Ver balance mensual  
❌ Eliminar movimientos  
❌ Editar movimientos  
❌ Generar PDF mensual  

#### Owner puede TODO:
✅ Ver resumen completo  
✅ Ver balance mensual  
✅ Editar movimientos  
✅ Eliminar movimientos  
✅ Generar PDF mensual  

### Endpoints Protegidos

**Solo Owner:**
```bash
GET /api/caja/:gym_id/resumen
DELETE /api/caja/:id
PUT /api/caja/:id
GET /api/caja/:gym_id/resumen/pdf
GET /api/caja/:gym_id/reporte-mensual
```

**Todos:**
```bash
POST /api/caja
GET /api/caja/:gym_id
```

### Editar Movimiento (Solo Owner)

```bash
PUT /api/caja/:movimiento_id
Headers: { "role": "owner" }
Body:
{
  "descripcion": "Nueva descripción",
  "monto": 5000
}
```

---

## 📄 6. RESUMEN MENSUAL EN PDF

### Generar PDF

**Opción 1: Desde la interfaz**
- Login como Owner
- Ir a "Caja"
- Click en "Reporte Mensual"

**Opción 2: Desde API**
```bash
GET /api/caja/:gym_id/resumen/pdf?mes=4&anio=2026
Headers: { "role": "owner" }
```

Descarga un PDF con:
- Resumen de ingresos, egresos y balance
- Lista detallada de movimientos
- Totales por método de pago
- Fecha de generación

---

## 🎨 7. INTERFAZ DE USUARIO

### Cambios Visuales en Caja

**Owner ve:**
```
┌────────────────────────────────┐
│ Caja              👑 Dueño     │
│ [Reporte Mensual] [+ Nuevo]   │
├────────────────────────────────┤
│ 💰 Ingresos: $50,000          │
│ 💸 Egresos: $10,000           │
│ 📊 Balance: $40,000           │
├────────────────────────────────┤
│ Movimientos                    │
│ [Editar] [Eliminar] cada uno   │
└────────────────────────────────┘
```

**Staff ve:**
```
┌────────────────────────────────┐
│ Caja              👤 Staff     │
│ [+ Nuevo Movimiento]           │
├────────────────────────────────┤
│ Movimientos                    │
│ (sin botones de eliminar)      │
└────────────────────────────────┘
```

---

## 🧪 8. PRUEBAS

### Probar Sistema de Roles

1. **Login sin PIN**
   - Ingresar usuario y contraseña
   - No ingresar PIN
   - Verificar que aparece "👤 Staff"
   - Intentar eliminar un movimiento → debe fallar

2. **Login con PIN**
   - Ingresar usuario, contraseña y PIN: `0000`
   - Verificar que aparece "👑 Dueño"
   - Verificar que se ven tarjetas de resumen
   - Eliminar un movimiento → debe funcionar

### Probar Acceso por Huella

1. Asignar huella a un usuario:
```bash
PUT http://localhost:3002/api/user/1/fingerprint
{
  "finger_id": 1,
  "gym_id": 1
}
```

2. Simular acceso:
```bash
POST http://localhost:3002/api/access/fingerprint
{
  "finger_id": 1,
  "gym_id": 1
}
```

3. Verificar historial:
```bash
GET http://localhost:3002/api/user/1/historial
```

### Probar Historial

Después de:
- Crear un usuario
- Registrar acceso
- Renovar plan

Verificar que se crearon eventos:
```bash
GET http://localhost:3002/api/user/:id/historial
```

---

## 🔧 9. CÓDIGO MODULAR

### Archivos Creados

```
backend/
  ├── server-extensions.js          ← 🆕 Todas las extensiones
  ├── run-extension-migrations.js   ← 🆕 Script de migraciones
  └── migrations/
      ├── 003_add_fingerprint_and_roles.sql
      └── 004_create_user_historial.sql
```

### Integración en server.js

Las extensiones se cargan automáticamente:

```javascript
const {
  requireOwner,
  registrarAlta,
  registrarIngreso,
  initializeExtensions
} = require('./server-extensions')

// Al iniciar servidor:
initializeExtensions(app, PDFDocument)
```

**TODO el código existente sigue funcionando igual.**

---

## 📱 10. USO PRÁCTICO

### Flujo de Trabajo del Dueño

1. **Login como Owner** (con PIN)
2. Ver resumen completo de caja
3. Generar reporte mensual PDF
4. Revisar historial de usuarios
5. Gestionar movimientos de caja

### Flujo de Trabajo del Staff

1. **Login normal** (sin PIN)
2. Registrar usuarios nuevos
3. Registrar accesos por DNI
4. Registrar ventas en caja
5. Sin acceso a resumen ni eliminaciones

### Configuración del ESP32

Código básico para ESP32:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverUrl = "http://tu-servidor:3002/api/access/fingerprint";

void setup() {
  WiFi.begin(ssid, password);
  // Inicializar sensor AS608
}

void loop() {
  if (detectarHuella()) {
    int fingerId = obtenerFingerId();
    enviarAcceso(fingerId, 1); // gym_id = 1
  }
}

void enviarAcceso(int fingerId, int gymId) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"finger_id\":" + String(fingerId) + 
                   ",\"gym_id\":" + String(gymId) + "}";
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    // Acceso permitido
    Serial.println("Acceso permitido");
  } else {
    // Acceso denegado
    Serial.println("Acceso denegado");
  }
  
  http.end();
}
```

---

## 🚨 IMPORTANTE

### Seguridad

1. **Cambiar PIN por defecto**
   - El PIN inicial es `0000`
   - Cambiar inmediatamente en producción

2. **Backup de Base de Datos**
   - Hacer backup antes de ejecutar migraciones
   - Guardar copia de seguridad regularmente

3. **Headers de Rol**
   - El sistema valida el header `role` en cada request protegido
   - El frontend envía automáticamente el rol desde localStorage

### Compatibilidad

✅ Todo el sistema existente sigue funcionando  
✅ Los endpoints antiguos no fueron modificados  
✅ Los datos existentes no se pierden  
✅ Se puede seguir usando DNI para acceso  

---

## 🐛 DEBUGGING

### Logs del Servidor

El servidor muestra logs detallados:

```
🚀 Inicializando extensiones del sistema...
✅ Endpoint de acceso por huella creado
✅ Endpoint de historial creado
✅ Sistema de roles habilitado
```

### Errores Comunes

**1. "Acceso denegado. Solo el dueño..."**
- Solución: Login con PIN correcto

**2. "Huella no reconocida"**
- Verificar que finger_id esté asignado
- Verificar que gym_id sea correcto

**3. "Column finger_id does not exist"**
- Ejecutar migraciones manualmente
- Verificar en Supabase SQL Editor

---

## 📞 SOPORTE

Si encuentras problemas:

1. Verificar que las migraciones se ejecutaron correctamente
2. Revisar logs del servidor
3. Verificar que el rol se esté guardando en localStorage
4. Verificar headers en requests protegidos

---

## ✨ PRÓXIMAS MEJORAS SUGERIDAS

- [ ] Interfaz para gestionar huellas digitales
- [ ] Dashboard con gráficos de ingresos
- [ ] Notificaciones de vencimiento por email/SMS
- [ ] App móvil para staff
- [ ] Reportes personalizados
- [ ] Integración con sistemas de pago

---

**Sistema listo para producción en gimnasios reales** 💪

© 2026 CyberArgento - Sistema de Gestión de Gimnasios
