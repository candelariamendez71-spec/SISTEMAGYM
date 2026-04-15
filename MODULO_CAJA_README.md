# Módulo de Caja - Sistema de Gestión de Gimnasio

## ✅ Implementación Completa

Se ha agregado exitosamente el módulo de **Caja** al sistema de gestión de gimnasio.

---

## 📋 Características Implementadas

### Backend (Node.js + Express + Supabase)

#### Tabla de Base de Datos
- **Tabla**: `caja_movimientos`
- **Campos**:
  - `id` - BIGSERIAL (auto-incremento)
  - `gym_id` - ID del gimnasio
  - `tipo` - "ingreso" o "egreso"
  - `categoria` - "mensualidad", "clase_prueba", "producto", "gasto"
  - `descripcion` - Texto descriptivo
  - `monto` - Monto numérico (debe ser > 0)
  - `metodo_pago` - "efectivo", "transferencia", "otro"
  - `fecha` - Fecha del movimiento
  - `created_at` - Timestamp de creación

#### Endpoints API

1. **POST /api/caja**
   - Crear nuevo movimiento
   - Validaciones: tipo, categoría, monto > 0

2. **GET /api/caja/:gym_id**
   - Listar movimientos con filtros opcionales
   - Query params: `fecha`, `desde`, `hasta`

3. **GET /api/caja/:gym_id/resumen**
   - Resumen de ingresos/egresos
   - Totales por método de pago
   - Balance general

4. **GET /api/caja/:gym_id/reporte-mensual?mes=MM&anio=YYYY**
   - Genera PDF mensual descargable
   - Incluye: resumen, totales, tabla de movimientos

### Frontend (Next.js + React)

#### Página: `/admin/caja`

**Características**:
- ✅ Formulario para registrar movimientos
- ✅ Cards de resumen (ingresos, egresos, balance, métodos)
- ✅ Tabla de movimientos con formato ARS
- ✅ Filtro por fecha
- ✅ Colores: verde (ingresos), rojo (egresos)
- ✅ Botón para descargar PDF mensual
- ✅ Integración con sistema de notificaciones (toast)
- ✅ Integración con sistema de sonidos

---

## 🚀 Cómo Usar

### 1. Instalar Dependencias

Ya se ha agregado `pdfkit` al `package.json` y se instaló con:

```bash
pnpm install
```

### 2. Ejecutar la Migración

La tabla se creará automáticamente al iniciar el servidor, pero puedes ejecutar la migración manualmente:

```bash
node backend/run-caja-migration.js
```

O ejecutar el SQL directamente en el **Supabase SQL Editor**:

```sql
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

CREATE INDEX IF NOT EXISTS idx_caja_gym_fecha ON caja_movimientos(gym_id, fecha);
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON caja_movimientos(tipo);
```

### 3. Iniciar el Servidor

```bash
pnpm start
```

### 4. Acceder al Módulo

1. Iniciar sesión en el sistema
2. Ir al menú lateral → **Caja** (ícono de billetera 💰)
3. ¡Listo para usar!

---

## 📊 Uso del Módulo

### Registrar Movimiento

1. Click en **"Nuevo Movimiento"**
2. Completar formulario:
   - Tipo: Ingreso o Egreso
   - Categoría: Mensualidad, Clase de Prueba, Producto, Gasto
   - Descripción: Detalle del movimiento
   - Monto: Cantidad en ARS
   - Método de Pago: Efectivo, Transferencia u Otro
3. Click en **"Guardar Movimiento"**

### Ver Resumen

Los cards superiores muestran:
- 💚 **Total Ingresos**
- 🔴 **Total Egresos**
- 💰 **Balance** (ingresos - egresos)
- 💳 **Por Método** (efectivo, transferencia)

### Filtrar Movimientos

- Seleccionar fecha en el filtro
- La tabla se actualiza automáticamente
- Click en "Limpiar Filtro" para ver todos

### Descargar Reporte Mensual

1. Click en **"Descargar Reporte Mensual"**
2. Se genera PDF del mes actual
3. Archivo: `reporte-mensual-MM-YYYY.pdf`

**Contenido del PDF**:
- Header con nombre del gym y fecha
- Resumen de totales
- Totales por método de pago
- Tabla detallada de todos los movimientos

---

## 🎨 Características UX

- ✅ Ingresos en **verde** (#00AA00)
- ✅ Egresos en **rojo** (#FF0000)
- ✅ Formato de moneda: ARS con separadores
- ✅ Animaciones suaves (Framer Motion)
- ✅ Feedback visual con toasts
- ✅ Sonidos de éxito/error
- ✅ Responsive (móvil y desktop)

---

## 🔧 Archivos Modificados/Creados

### Backend
- ✅ `backend/server.js` - Endpoints de Caja + require PDFKit
- ✅ `backend/db.js` - Función `ensureCajaMovimientosTable()`
- ✅ `backend/migrations/002_create_caja_movimientos.sql` - Migración SQL
- ✅ `backend/run-caja-migration.js` - Script de migración manual

### Frontend
- ✅ `app/admin/caja/page.tsx` - Página principal del módulo
- ✅ `app/admin/layout.tsx` - Agregado enlace en navegación

### Configuración
- ✅ `package.json` - Agregado `pdfkit@^0.15.1`

---

## 🧪 Testing

### Probar Endpoints (Postman/cURL)

#### 1. Crear Movimiento
```bash
curl -X POST http://localhost:3002/api/caja \
  -H "Content-Type: application/json" \
  -d '{
    "gym_id": 1,
    "tipo": "ingreso",
    "categoria": "mensualidad",
    "descripcion": "Pago de Juan Pérez",
    "monto": 5000,
    "metodo_pago": "efectivo"
  }'
```

#### 2. Listar Movimientos
```bash
curl http://localhost:3002/api/caja/1
```

#### 3. Obtener Resumen
```bash
curl http://localhost:3002/api/caja/1/resumen
```

#### 4. Descargar PDF
```bash
curl "http://localhost:3002/api/caja/1/reporte-mensual?mes=4&anio=2026" \
  --output reporte.pdf
```

---

## 🔒 Seguridad

- ✅ Validación de tipos de datos
- ✅ Validación de monto > 0
- ✅ Valores permitidos (CHECK constraints)
- ✅ SQL injection prevention (Supabase parametrized queries)
- ✅ Autenticación requerida (gym_id validado)

---

## 📝 Notas Importantes

1. **No se modificó lógica existente** - Todo el código es nuevo
2. **Compatibilidad con Supabase/PostgreSQL** - Usa BIGSERIAL, NUMERIC, DATE
3. **Auto-migración** - La tabla se crea automáticamente al iniciar el servidor
4. **Reutilización de código** - Usa las mismas funciones y patrones del backend
5. **Integración completa** - Sistema de toasts, sonidos, contexto de gym

---

## 🎯 Resultado Final

El sistema ahora cuenta con:

✅ Control completo de ingresos y egresos  
✅ Resumen financiero en tiempo real  
✅ Filtros por fecha  
✅ Reportes mensuales en PDF descargables  
✅ Interfaz intuitiva y rápida  
✅ Control financiero profesional  

---

## 🐛 Troubleshooting

### La tabla no se crea automáticamente

Ejecutar manualmente:
```bash
node backend/run-caja-migration.js
```

O crear en Supabase SQL Editor (ver sección "Ejecutar la Migración")

### Error al generar PDF

Verificar que `pdfkit` esté instalado:
```bash
pnpm list pdfkit
```

Si no está, instalar:
```bash
pnpm install pdfkit
```

### Error "gym_id no encontrado"

Asegurarse de estar autenticado y tener un gym activo en el contexto.

---

## 📞 Soporte

Para reportar problemas o mejoras, revisar:
- `backend/server.js` líneas de endpoints Caja
- `app/admin/caja/page.tsx` para UI
- Logs del servidor con `console.log`

---

**¡Módulo de Caja implementado exitosamente! 🎉**
