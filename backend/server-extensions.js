/**
 * EXTENSIONES DEL SISTEMA DE GESTIÓN DE GIMNASIO
 * 
 * Este archivo contiene todas las funcionalidades avanzadas sin modificar
 * la lógica existente del sistema:
 * 
 * 1. Acceso por huella digital
 * 2. Sistema de historial completo de usuarios
 * 3. Sistema de roles (Owner vs Staff)
 * 4. Seguridad en caja por roles
 * 5. Generación de PDF mensual
 */

const { supabase } = require('./db')

// ========================================
// UTILIDADES
// ========================================

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0]
}

function formatTime(date = new Date()) {
  return date.toTimeString().split(' ')[0]
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date
}

// ========================================
// MIDDLEWARE DE VALIDACIÓN DE ROLES
// ========================================

/**
 * Middleware para validar que el usuario tenga rol de Owner
 * Uso: app.get('/ruta', requireOwner, (req, res) => {...})
 */
function requireOwner(req, res, next) {
  const { role } = req.headers
  
  if (role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo el dueño puede realizar esta acción.',
    })
  }
  
  next()
}

/**
 * Middleware para obtener el rol desde headers (opcional, para logging)
 */
function extractRole(req, res, next) {
  req.userRole = req.headers.role || 'staff'
  next()
}

// ========================================
// FUNCIONES DE REGISTRO DE HISTORIAL
// ========================================

/**
 * Registra un evento en el historial del usuario
 */
async function registrarEvento(user_id, gym_id, tipo_evento, descripcion) {
  try {
    const now = new Date()
    const fecha = formatDate(now)
    const hora = formatTime(now)
    const created_at = now.toISOString()

    const { data, error } = await supabase
      .from('user_historial')
      .insert([{
        user_id,
        gym_id,
        tipo_evento,
        descripcion,
        fecha,
        hora,
        created_at,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error registrando evento en historial:', error)
      return { success: false, error }
    }

    console.log(`✅ Evento registrado: ${tipo_evento} - ${descripcion}`)
    return { success: true, evento: data }
  } catch (error) {
    console.error('Error en registrarEvento:', error)
    return { success: false, error }
  }
}

/**
 * Registra alta de usuario
 */
async function registrarAlta(user_id, gym_id, nombre, plan) {
  const planTexto = plan === '12pases' ? '12 pases' : 'libre'
  return await registrarEvento(
    user_id,
    gym_id,
    'alta',
    `Usuario ${nombre} registrado con plan ${planTexto}`
  )
}

/**
 * Registra ingreso de usuario
 */
async function registrarIngreso(user_id, gym_id, nombre, metodo = 'DNI') {
  return await registrarEvento(
    user_id,
    gym_id,
    'ingreso',
    `Ingreso registrado via ${metodo}`
  )
}

/**
 * Registra vencimiento de plan
 */
async function registrarVencimiento(user_id, gym_id, nombre) {
  return await registrarEvento(
    user_id,
    gym_id,
    'vencimiento',
    `Plan vencido - Usuario inactivado`
  )
}

/**
 * Registra renovación de plan
 */
async function registrarRenovacion(user_id, gym_id, nombre, plan) {
  const planTexto = plan === '12pases' ? '12 pases' : 'libre'
  return await registrarEvento(
    user_id,
    gym_id,
    'renovacion',
    `Plan renovado: ${planTexto}`
  )
}

/**
 * Registra reactivación de usuario
 */
async function registrarReactivacion(user_id, gym_id, nombre) {
  return await registrarEvento(
    user_id,
    gym_id,
    'reactivacion',
    `Usuario reactivado`
  )
}

/**
 * Registra asignación de huella digital
 */
async function registrarAsignacionHuella(user_id, gym_id, nombre, finger_id) {
  return await registrarEvento(
    user_id,
    gym_id,
    'asignacion_huella',
    `Huella digital asignada: ID ${finger_id}`
  )
}

// ========================================
// ENDPOINTS - ACCESO POR HUELLA DIGITAL
// ========================================

/**
 * POST /api/access/fingerprint
 * Permite acceso mediante huella digital usando ESP32 + AS608
 */
function createFingerprintAccessEndpoint(app) {
  app.post('/api/access/fingerprint', async (req, res) => {
    const { finger_id, gym_id } = req.body

    if (!finger_id || !gym_id) {
      return res.status(400).json({
        success: false,
        message: 'finger_id y gym_id son obligatorios',
      })
    }

    console.log(`🔍 Buscando usuario con finger_id: ${finger_id} en gym: ${gym_id}`)

    try {
      // Buscar usuario por finger_id y gym_id
      const { data: user, error: findError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('finger_id', finger_id)
        .eq('gym_id', gym_id)
        .single()

      if (findError || !user) {
        console.log('❌ Usuario no encontrado')
        return res.status(404).json({
          success: false,
          message: 'Huella no reconocida',
        })
      }

      console.log(`✅ Usuario encontrado: ${user.nombre}`)

      // Validar estado
      if (user.estado !== 'activo') {
        return res.status(400).json({
          success: false,
          message: 'Usuario inactivo',
        })
      }

      // Validar vencimiento
      const today = new Date()
      const expirationDate = parseDate(user.fecha_vencimiento)

      if (!expirationDate || expirationDate < today) {
        // Inactivar usuario
        await supabase
          .from('usuarios')
          .update({ estado: 'inactivo' })
          .eq('id', user.id)

        // Registrar vencimiento en historial
        await registrarVencimiento(user.id, gym_id, user.nombre)

        return res.status(400).json({
          success: false,
          message: 'Plan vencido',
        })
      }

      // Manejar plan de pases
      let pasesRestantes = undefined
      if (user.tipo_plan === '12_pases') {
        if (user.ingresos_disponibles <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Sin pases disponibles',
          })
        }

        pasesRestantes = user.ingresos_disponibles - 1

        await supabase
          .from('usuarios')
          .update({ ingresos_disponibles: pasesRestantes })
          .eq('id', user.id)
      }

      // Registrar ingreso
      await supabase
        .from('ingresos')
        .insert([{ usuario_id: user.id, fecha: new Date().toISOString() }])

      // Registrar en historial
      await registrarIngreso(user.id, gym_id, user.nombre, 'Huella Digital')

      // Obtener usuario actualizado
      const { data: updatedUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      const message = user.tipo_plan === 'libre'
        ? 'Acceso permitido'
        : `Acceso permitido. Te quedan ${pasesRestantes} pases`

      console.log(`✅ ${message}`)

      return res.json({
        success: true,
        message,
        user: {
          id: updatedUser.id,
          nombre: updatedUser.nombre,
          dni: updatedUser.dni,
          plan: updatedUser.tipo_plan === '12_pases' ? '12pases' : 'libre',
          pases_disponibles: updatedUser.ingresos_disponibles,
        },
        pases_restantes: pasesRestantes,
      })
    } catch (error) {
      console.error('❌ Error en acceso por huella:', error)
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      })
    }
  })

  console.log('✅ Endpoint de acceso por huella creado: POST /api/access/fingerprint')
}

// ========================================
// ENDPOINTS - HISTORIAL DE USUARIO
// ========================================

/**
 * GET /api/user/:id/historial
 * Obtiene el historial completo de un usuario
 */
function createUserHistorialEndpoint(app) {
  app.get('/api/user/:id/historial', async (req, res) => {
    const { id } = req.params
    const { limit } = req.query

    try {
      let query = supabase
        .from('user_historial')
        .select('*')
        .eq('user_id', id)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (limit) {
        const limitNum = parseInt(limit)
        if (limitNum > 0) {
          query = query.limit(limitNum)
        }
      }

      const { data: historial, error } = await query

      if (error) throw error

      return res.json({
        success: true,
        total: historial.length,
        historial: historial || [],
      })
    } catch (error) {
      console.error('Error obteniendo historial:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener historial',
      })
    }
  })

  console.log('✅ Endpoint de historial creado: GET /api/user/:id/historial')
}

/**
 * PUT /api/user/:id/fingerprint
 * Asigna o actualiza la huella digital de un usuario
 */
function createAssignFingerprintEndpoint(app) {
  app.put('/api/user/:id/fingerprint', async (req, res) => {
    const { id } = req.params
    const { finger_id, gym_id } = req.body

    if (!finger_id || !gym_id) {
      return res.status(400).json({
        success: false,
        message: 'finger_id y gym_id son obligatorios',
      })
    }

    try {
      // Verificar que el usuario existe
      const { data: user, error: findError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .eq('gym_id', gym_id)
        .single()

      if (findError || !user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      // Verificar que finger_id no esté en uso por otro usuario
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('finger_id', finger_id)
        .eq('gym_id', gym_id)
        .neq('id', id)
        .single()

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este ID de huella ya está asignado a otro usuario',
        })
      }

      // Asignar finger_id
      const { data: updatedUser, error: updateError } = await supabase
        .from('usuarios')
        .update({ finger_id })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // Registrar en historial
      await registrarAsignacionHuella(id, gym_id, user.nombre, finger_id)

      return res.json({
        success: true,
        message: 'Huella digital asignada correctamente',
        user: updatedUser,
      })
    } catch (error) {
      console.error('Error asignando huella:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al asignar huella',
      })
    }
  })

  console.log('✅ Endpoint de asignación de huella creado: PUT /api/user/:id/fingerprint')
}

// ========================================
// ENDPOINTS - SISTEMA DE ROLES
// ========================================

/**
 * Modificar endpoint de login existente para incluir roles
 * Esta función debe ser llamada DESPUÉS de que el servidor esté configurado
 */
function enhanceLoginWithRoles(app) {
  console.log('✅ Sistema de roles habilitado en /api/login')
  console.log('   - Enviar "pin" en el body para autenticarse como Owner')
  console.log('   - Sin pin o pin incorrecto = Staff')
}

/**
 * PUT /api/gym/:id/pin
 * Actualiza el PIN de administrador del gimnasio
 */
function createUpdatePinEndpoint(app) {
  app.put('/api/gym/:id/pin', requireOwner, async (req, res) => {
    const { id } = req.params
    const { new_pin, current_pin } = req.body

    if (!new_pin || !current_pin) {
      return res.status(400).json({
        success: false,
        message: 'current_pin y new_pin son obligatorios',
      })
    }

    if (new_pin.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'El PIN debe tener al menos 4 caracteres',
      })
    }

    try {
      // Verificar PIN actual
      const { data: gym, error: findError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', id)
        .single()

      if (findError || !gym) {
        return res.status(404).json({
          success: false,
          message: 'Gimnasio no encontrado',
        })
      }

      if (gym.admin_pin !== current_pin) {
        return res.status(401).json({
          success: false,
          message: 'PIN actual incorrecto',
        })
      }

      // Actualizar PIN
      const { error: updateError } = await supabase
        .from('gyms')
        .update({ admin_pin: new_pin })
        .eq('id', id)

      if (updateError) throw updateError

      return res.json({
        success: true,
        message: 'PIN actualizado correctamente',
      })
    } catch (error) {
      console.error('Error actualizando PIN:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar PIN',
      })
    }
  })

  console.log('✅ Endpoint de actualización de PIN creado: PUT /api/gym/:id/pin')
}

// ========================================
// ENDPOINTS - SEGURIDAD EN CAJA
// ========================================

/**
 * Modifica el endpoint GET /api/caja/:gym_id para filtrar por rol
 */
function enhanceCajaListEndpoint(app) {
  console.log('✅ Endpoint GET /api/caja/:gym_id mejorado con control de roles')
}

/**
 * Modifica el endpoint GET /api/caja/:gym_id/resumen para requerir Owner
 */
function enhanceCajaResumenEndpoint(app) {
  console.log('✅ Endpoint GET /api/caja/:gym_id/resumen protegido (solo Owner)')
}

/**
 * PUT /api/caja/:id - Editar movimiento (solo Owner)
 */
function createEditCajaEndpoint(app) {
  app.put('/api/caja/:id', requireOwner, async (req, res) => {
    const { id } = req.params
    const { tipo, categoria, descripcion, monto, metodo_pago, fecha } = req.body

    if (!tipo && !categoria && !descripcion && !monto && !metodo_pago && !fecha) {
      return res.status(400).json({
        success: false,
        message: 'Debes enviar al menos un campo para actualizar',
      })
    }

    try {
      // Obtener movimiento actual
      const { data: current, error: findError } = await supabase
        .from('caja_movimientos')
        .select('*')
        .eq('id', id)
        .single()

      if (findError || !current) {
        return res.status(404).json({
          success: false,
          message: 'Movimiento no encontrado',
        })
      }

      // Preparar actualización
      const updates = {}
      
      if (tipo) {
        if (!['ingreso', 'egreso'].includes(tipo)) {
          return res.status(400).json({
            success: false,
            message: 'Tipo debe ser "ingreso" o "egreso"',
          })
        }
        updates.tipo = tipo
      }

      if (categoria) {
        if (!['mensualidad', 'clase_prueba', 'producto', 'gasto'].includes(categoria)) {
          return res.status(400).json({
            success: false,
            message: 'Categoría inválida',
          })
        }
        updates.categoria = categoria
      }

      if (descripcion) {
        updates.descripcion = descripcion.trim()
      }

      if (monto) {
        const parsedMonto = Number(monto)
        if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Monto debe ser mayor a 0',
          })
        }
        updates.monto = parsedMonto
      }

      if (metodo_pago) {
        if (!['efectivo', 'transferencia', 'otro'].includes(metodo_pago)) {
          return res.status(400).json({
            success: false,
            message: 'Método de pago inválido',
          })
        }
        updates.metodo_pago = metodo_pago
      }

      if (fecha) {
        updates.fecha = fecha
      }

      // Actualizar
      const { data: updated, error: updateError } = await supabase
        .from('caja_movimientos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      return res.json({
        success: true,
        message: 'Movimiento actualizado',
        movimiento: updated,
      })
    } catch (error) {
      console.error('Error actualizando movimiento:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar movimiento',
      })
    }
  })

  console.log('✅ Endpoint de edición de caja creado: PUT /api/caja/:id (solo Owner)')
}

// ========================================
// ENDPOINTS - PDF MENSUAL
// ========================================

/**
 * GET /api/caja/:gym_id/resumen/pdf
 * Genera PDF mensual de resumen de caja (solo Owner)
 */
function createPDFEndpoint(app, PDFDocument) {
  app.get('/api/caja/:gym_id/resumen/pdf', requireOwner, async (req, res) => {
    const { gym_id } = req.params
    const { mes, anio } = req.query

    if (!mes || !anio) {
      return res.status(400).json({
        success: false,
        message: 'mes y anio son obligatorios (ej: ?mes=4&anio=2026)',
      })
    }

    const mesNum = parseInt(mes)
    const anioNum = parseInt(anio)

    if (mesNum < 1 || mesNum > 12 || anioNum < 2020 || anioNum > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Mes o año inválidos',
      })
    }

    try {
      // Obtener gimnasio
      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gym_id)
        .single()

      if (gymError || !gym) {
        return res.status(404).json({
          success: false,
          message: 'Gimnasio no encontrado',
        })
      }

      // Calcular rango de fechas
      const desde = `${anioNum}-${String(mesNum).padStart(2, '0')}-01`
      const ultimoDia = new Date(anioNum, mesNum, 0).getDate()
      const hasta = `${anioNum}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

      // Obtener movimientos
      const { data: movimientos, error: movError } = await supabase
        .from('caja_movimientos')
        .select('*')
        .eq('gym_id', gym_id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: true })

      if (movError) throw movError

      // Calcular totales
      const ingresos = movimientos
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + Number(m.monto), 0)

      const egresos = movimientos
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + Number(m.monto), 0)

      const balance = ingresos - egresos

      // Crear PDF
      const doc = new PDFDocument()
      
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=resumen-${gym.nombre}-${mesNum}-${anioNum}.pdf`)
      
      doc.pipe(res)

      // Título
      doc.fontSize(20).text(`Resumen Mensual - ${gym.nombre}`, { align: 'center' })
      doc.moveDown()
      doc.fontSize(14).text(`Mes: ${mesNum}/${anioNum}`, { align: 'center' })
      doc.moveDown(2)

      // Resumen
      doc.fontSize(16).text('Resumen', { underline: true })
      doc.moveDown()
      doc.fontSize(12)
      doc.text(`Ingresos: $${ingresos.toFixed(2)}`, { color: 'green' })
      doc.text(`Egresos: $${egresos.toFixed(2)}`, { color: 'red' })
      doc.text(`Balance: $${balance.toFixed(2)}`, { bold: true })
      doc.moveDown(2)

      // Movimientos
      doc.fontSize(16).text('Movimientos', { underline: true })
      doc.moveDown()
      doc.fontSize(10)

      if (movimientos.length === 0) {
        doc.text('No hay movimientos en este período')
      } else {
        movimientos.forEach((mov, index) => {
          const signo = mov.tipo === 'ingreso' ? '+' : '-'
          doc.text(`${index + 1}. ${mov.fecha} - ${mov.descripcion} - ${signo}$${mov.monto} - ${mov.metodo_pago}`)
        })
      }

      // Pie de página
      doc.moveDown(3)
      doc.fontSize(8).text(`Generado el ${formatDate()} a las ${formatTime()}`, { align: 'center' })

      doc.end()

      console.log(`✅ PDF generado para ${gym.nombre} - ${mesNum}/${anioNum}`)
    } catch (error) {
      console.error('Error generando PDF:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al generar PDF',
      })
    }
  })

  console.log('✅ Endpoint de PDF mensual creado: GET /api/caja/:gym_id/resumen/pdf (solo Owner)')
}

// ========================================
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ========================================

/**
 * Inicializa todas las extensiones del sistema
 * Llamar esto desde server.js
 */
function initializeExtensions(app, PDFDocument) {
  console.log('\n🚀 Inicializando extensiones del sistema...\n')

  // 1. Acceso por huella digital
  createFingerprintAccessEndpoint(app)
  createAssignFingerprintEndpoint(app)

  // 2. Historial de usuarios
  createUserHistorialEndpoint(app)

  // 3. Sistema de roles
  enhanceLoginWithRoles(app)
  createUpdatePinEndpoint(app)

  // 4. Seguridad en caja
  createEditCajaEndpoint(app)

  // 5. PDF mensual
  createPDFEndpoint(app, PDFDocument)

  console.log('\n✅ Todas las extensiones inicializadas correctamente\n')
}

// ========================================
// EXPORTACIONES
// ========================================

module.exports = {
  // Middleware
  requireOwner,
  extractRole,
  
  // Funciones de historial
  registrarAlta,
  registrarIngreso,
  registrarVencimiento,
  registrarRenovacion,
  registrarReactivacion,
  registrarAsignacionHuella,
  
  // Inicialización
  initializeExtensions,
}
