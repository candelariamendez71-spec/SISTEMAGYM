const express = require('express')
const cors = require('cors')
const path = require('path')
const next = require('next')
const PDFDocument = require('pdfkit')
const { initDatabase, supabase, ensureGymPriceColumns } = require('./db')
const {
  requireOwner,
  extractRole,
  registrarAlta,
  registrarIngreso,
  registrarVencimiento,
  registrarRenovacion,
  registrarReactivacion,
  initializeExtensions,
} = require('./server-extensions')

const ROOT_DIR = path.join(__dirname, '..')
const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev, dir: ROOT_DIR })
const handle = nextApp.getRequestHandler()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3002



function normalizeGym(row) {
  const precioLibre = Number(row.precio_libre)
  const precio12Pases = Number(row.precio_12_pases)

  return {
    gym_id: String(row.id),
    nombre: row.nombre,
    logo: row.logo,
    color: row.color,
    precio_libre: Number.isFinite(precioLibre) && precioLibre >= 0 ? precioLibre : 0,
    precio_12_pases: Number.isFinite(precio12Pases) && precio12Pases >= 0 ? precio12Pases : 0,
  }
}

function parsePositivePrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    return null
  }

  return Math.round(amount * 100) / 100
}

function normalizeUser(row) {
  return {
    id: String(row.id),
    nombre: row.nombre,
    dni: row.dni,
    plan: row.tipo_plan === '12_pases' ? '12pases' : 'libre',
    fecha_inicio: row.fecha_inicio,
    vencimiento: row.fecha_vencimiento,
    pases_disponibles: row.ingresos_disponibles,
    estado: row.estado,
    activo: row.estado === 'activo',
    gym_id: String(row.gym_id),
    created_at: row.created_at,
  }
}

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0]
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date
}


app.use(express.static(path.join(ROOT_DIR, 'public')))
app.use('/_next', express.static(path.join(ROOT_DIR, '.next')))

app.post('/api/login', async (req, res) => {

  const { usuario, password, pin } = req.body

  if (!usuario || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son obligatorios' })
  }

  const normalizedUsuario = String(usuario).trim().toLowerCase()
  const normalizedPassword = String(password).trim()

  try {
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('*')
      .ilike('usuario', normalizedUsuario)
      .eq('password', normalizedPassword)
      .single()



    if (gymError) {
      throw gymError
    }

    if (!gym) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' })
    }

    // 🆕 SISTEMA DE ROLES: Validar PIN para determinar rol
    let role = 'staff'
    if (pin && gym.admin_pin && pin === gym.admin_pin) {
      role = 'owner'
      console.log('✅ Login como Owner (PIN correcto)')
    } else if (pin) {
      console.log('⚠️  PIN incorrecto, login como Staff')
    } else {
      console.log('ℹ️  Sin PIN, login como Staff')
    }

    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('gym_id', gym.id)

    if (usersError) throw usersError

    return res.json({
      success: true,
      role,
      gym: normalizeGym(gym),
      users: (users || []).map(normalizeUser),
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.post('/api/access', async (req, res) => {
  const { dni, gym_id } = req.body

  if (!dni || !gym_id) {
    return res.status(400).json({ success: false, message: 'DNI y gym_id son obligatorios' })
  }

  try {
    const { data: user, error: findError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('dni', dni)
      .eq('gym_id', gym_id)
      .single()

    if (findError || !user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }

    const normalizedUser = normalizeUser(user)
    const today = new Date()
    const expirationDate = parseDate(normalizedUser.vencimiento)

    if (!expirationDate || expirationDate < today) {
      await supabase
        .from('usuarios')
        .update({ estado: 'inactivo' })
        .eq('id', user.id)

      // 🆕 REGISTRAR VENCIMIENTO EN HISTORIAL
      await registrarVencimiento(user.id, gym_id, user.nombre)

      return res.status(400).json({ success: false, message: 'Plan vencido. Usuario inactivado.' })
    }

    if (normalizedUser.activo === false) {
      return res.status(400).json({ success: false, message: 'Usuario inactivo' })
    }

    let pasesRestantes = undefined
    if (normalizedUser.plan === '12pases') {
      if (normalizedUser.pases_disponibles <= 0) {
        return res.status(400).json({ success: false, message: 'Sin pases disponibles' })
      }
      pasesRestantes = normalizedUser.pases_disponibles - 1

      await supabase
        .from('usuarios')
        .update({ ingresos_disponibles: pasesRestantes })
        .eq('id', user.id)

      await supabase
        .from('ingresos')
        .insert([{ usuario_id: user.id, fecha: new Date().toISOString() }])
      
      // 🆕 REGISTRAR INGRESO EN HISTORIAL
      await registrarIngreso(user.id, gym_id, user.nombre, 'DNI')
    } else {
      await supabase
        .from('ingresos')
        .insert([{ usuario_id: user.id, fecha: new Date().toISOString() }])
      
      // 🆕 REGISTRAR INGRESO EN HISTORIAL
      await registrarIngreso(user.id, gym_id, user.nombre, 'DNI')
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single()

    if (updateError) throw updateError

    return res.json({
      success: true,
      message: normalizedUser.plan === 'libre' ? 'Acceso permitido' : `Acceso permitido. Te quedan ${pasesRestantes} pases`,
      user: normalizeUser(updatedUser),
      pases_restantes: pasesRestantes,
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.post('/api/user', async (req, res) => {
  const { nombre, dni, plan, fecha_inicio, gym_id } = req.body

  if (!nombre || !dni || !plan || !fecha_inicio || !gym_id) {
    return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' })
  }

  const tipo_plan = plan === '12pases' ? '12_pases' : 'libre'
  const ingresos = plan === '12pases' ? 12 : 0
  const fechaInicio = parseDate(fecha_inicio)
  if (!fechaInicio) {
    return res.status(400).json({ success: false, message: 'Fecha de inicio inválida' })
  }

  const fechaVencimiento = new Date(fechaInicio)
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1)
  const vencimiento = formatDate(fechaVencimiento)
  const now = formatDate()

  try {
    const { data: newUser, error } = await supabase
      .from('usuarios')
      .insert([{
        nombre: nombre.trim(),
        dni: dni.trim(),
        tipo_plan,
        fecha_inicio,
        fecha_vencimiento: vencimiento,
        ingresos_disponibles: ingresos,
        estado: 'activo',
        gym_id,
        created_at: now,
      }])
      .select()
      .single()

    if (error) throw error

    // 🆕 REGISTRAR ALTA EN HISTORIAL
    await registrarAlta(newUser.id, gym_id, nombre.trim(), plan)

    return res.json({ success: true, user: normalizeUser(newUser) })
  } catch (error) {
    const message = error && error.message && error.message.includes('unique')
      ? 'Ya existe un usuario con ese DNI en este gimnasio'
      : 'Error al crear el usuario'
    return res.status(400).json({ success: false, message })
  }
})

app.get('/api/user/:dni/:gym_id', async (req, res) => {
  const { dni, gym_id } = req.params

  try {
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('dni', dni)
      .eq('gym_id', gym_id)
      .single()

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }

    return res.json({ success: true, user: normalizeUser(user) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.get('/api/users/:gym_id', async (req, res) => {
  const { gym_id } = req.params
  const { estado } = req.query

  try {
    let query = supabase
      .from('usuarios')
      .select('*')
      .eq('gym_id', gym_id)

    if (estado === 'activo' || estado === 'inactivo') {
      query = query.eq('estado', estado)
    }

    const { data: users, error } = await query

    if (error) throw error

    return res.json({ success: true, total: users.length, users: users.map(normalizeUser) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.post('/api/renew', async (req, res) => {
  const { dni, gym_id, plan } = req.body

  if (!dni || !gym_id || !plan) {
    return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' })
  }

  const tipo_plan = plan === '12pases' ? '12_pases' : 'libre'
  const ingresos = tipo_plan === '12_pases' ? 12 : 0
  const fecha_inicio = formatDate()
  const fecha_vencimiento = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

  try {
    const { data: user, error: findError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('dni', dni)
      .eq('gym_id', gym_id)
      .single()

    if (findError || !user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .update({
        tipo_plan,
        fecha_inicio,
        fecha_vencimiento,
        ingresos_disponibles: ingresos,
        estado: 'activo'
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) throw updateError

    // 🆕 REGISTRAR RENOVACIÓN EN HISTORIAL
    await registrarRenovacion(updatedUser.id, gym_id, updatedUser.nombre, plan)

    return res.json({ success: true, user: normalizeUser(updatedUser) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.put('/api/gym/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, logo, color } = req.body

  if (!nombre && !logo && !color) {
    return res.status(400).json({ success: false, message: 'Debes enviar al menos un campo para actualizar' })
  }

  try {
    const { data: current, error: findError } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !current) {
      return res.status(404).json({ success: false, message: 'Gimnasio no encontrado' })
    }

    const updatedGym = {
      nombre: nombre || current.nombre,
      logo: logo || current.logo,
      color: color || current.color,
    }

    const { data: updated, error: updateError } = await supabase
      .from('gyms')
      .update(updatedGym)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return res.json({ success: true, gym: normalizeGym(updated) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.get('/api/gym/:id/prices', async (req, res) => {
  const { id } = req.params

  try {
    const { data: gym, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !gym) {
      return res.status(404).json({ success: false, message: 'Gimnasio no encontrado' })
    }

    const normalized = normalizeGym(gym)

    return res.json({
      success: true,
      prices: {
        precio_libre: normalized.precio_libre,
        precio_12_pases: normalized.precio_12_pases,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.put('/api/gym/:id/prices', async (req, res) => {
  const { id } = req.params
  const { precio_libre, precio_12_pases } = req.body

  const parsedPrecioLibre = parsePositivePrice(precio_libre)
  const parsedPrecio12Pases = parsePositivePrice(precio_12_pases)

  if (parsedPrecioLibre === null || parsedPrecio12Pases === null) {
    return res.status(400).json({
      success: false,
      message: 'Los precios deben ser numeros validos y positivos',
    })
  }

  try {
    await ensureGymPriceColumns()

    const { data: updated, error: updateError } = await supabase
      .from('gyms')
      .update({
        precio_libre: parsedPrecioLibre,
        precio_12_pases: parsedPrecio12Pases,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError || !updated) {
      const message = String(updateError?.message || '')
      if (message.toLowerCase().includes('precio_libre') || message.toLowerCase().includes('precio_12_pases')) {
        return res.status(500).json({
          success: false,
          message: 'No se pudieron actualizar los precios porque faltan columnas en la base de datos.',
        })
      }
      return res.status(404).json({ success: false, message: 'Gimnasio no encontrado' })
    }

    const normalized = normalizeGym(updated)
    return res.json({
      success: true,
      prices: {
        precio_libre: normalized.precio_libre,
        precio_12_pases: normalized.precio_12_pases,
      },
      gym: normalized,
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.get('/api/gym/:id', async (req, res) => {
  const { id } = req.params

  try {
    const { data: gym, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !gym) {
      return res.status(404).json({ success: false, message: 'Gimnasio no encontrado' })
    }

    return res.json({ success: true, gym: normalizeGym(gym) })
  } catch (error) {
    console.error('GET /api/gym/:id error:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

app.get('/api/debug/gyms', async (req, res) => {
  try {
    const { data: gyms, error } = await supabase
      .from('gyms')
      .select('*')

    if (error) throw error

    return res.json({ success: true, gyms })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})

// ==================== CAJA ENDPOINTS ====================

// POST /api/caja - Crear movimiento de caja
app.post('/api/caja', async (req, res) => {
  const { gym_id, tipo, categoria, descripcion, monto, metodo_pago, fecha } = req.body

  // Validación
  if (!gym_id || !tipo || !categoria || !descripcion || !monto || !metodo_pago) {
    return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' })
  }

  if (!['ingreso', 'egreso'].includes(tipo)) {
    return res.status(400).json({ success: false, message: 'Tipo debe ser "ingreso" o "egreso"' })
  }

  if (!['mensualidad', 'clase_prueba', 'producto', 'gasto'].includes(categoria)) {
    return res.status(400).json({ success: false, message: 'Categoría inválida' })
  }

  if (!['efectivo', 'transferencia', 'otro'].includes(metodo_pago)) {
    return res.status(400).json({ success: false, message: 'Método de pago inválido' })
  }

  const parsedMonto = Number(monto)
  if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
    return res.status(400).json({ success: false, message: 'Monto debe ser mayor a 0' })
  }

  const fechaMovimiento = fecha || formatDate()

  try {
    const { data: newMovimiento, error } = await supabase
      .from('caja_movimientos')
      .insert([{
        gym_id,
        tipo,
        categoria,
        descripcion: descripcion.trim(),
        monto: parsedMonto,
        metodo_pago,
        fecha: fechaMovimiento,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error

    return res.json({ success: true, movimiento: newMovimiento })
  } catch (error) {
    console.error('Error creating movimiento:', error)
    return res.status(500).json({ success: false, message: 'Error al crear movimiento' })
  }
})

// DELETE /api/caja/:id - Eliminar movimiento (debe ir ANTES del GET con :gym_id)
// 🆕 SOLO OWNER puede eliminar
app.delete('/api/caja/:id', requireOwner, async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID es obligatorio' })
  }

  console.log('Intentando eliminar movimiento con ID:', id)

  try {
    const { data, error } = await supabase
      .from('caja_movimientos')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error de Supabase al eliminar:', error)
      throw error
    }

    console.log('Movimiento eliminado:', data)
    return res.json({ success: true, message: 'Movimiento eliminado' })
  } catch (error) {
    console.error('Error deleting movimiento:', error)
    const errorMessage = error.message || 'Error al eliminar movimiento'
    return res.status(500).json({ success: false, message: errorMessage })
  }
})

// GET /api/caja/:gym_id - Listar movimientos con filtros opcionales
app.get('/api/caja/:gym_id', async (req, res) => {
  const { gym_id } = req.params
  const { fecha, desde, hasta } = req.query

  try {
    let query = supabase
      .from('caja_movimientos')
      .select('*')
      .eq('gym_id', gym_id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    if (fecha) {
      query = query.eq('fecha', fecha)
    } else if (desde && hasta) {
      query = query.gte('fecha', desde).lte('fecha', hasta)
    } else if (desde) {
      query = query.gte('fecha', desde)
    } else if (hasta) {
      query = query.lte('fecha', hasta)
    }

    const { data: movimientos, error } = await query

    if (error) throw error

    return res.json({
      success: true,
      total: movimientos.length,
      movimientos: movimientos || [],
    })
  } catch (error) {
    console.error('Error fetching movimientos:', error)
    return res.status(500).json({ success: false, message: 'Error al obtener movimientos' })
  }
})

// GET /api/caja/:gym_id/resumen - Resumen de ingresos/egresos
// 🆕 SOLO OWNER puede ver el resumen
app.get('/api/caja/:gym_id/resumen', requireOwner, async (req, res) => {
  const { gym_id } = req.params
  const { desde, hasta } = req.query

  try {
    let query = supabase
      .from('caja_movimientos')
      .select('*')
      .eq('gym_id', gym_id)

    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)

    const { data: movimientos, error } = await query

    if (error) throw error

    const ingresos = movimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + Number(m.monto), 0)

    const egresos = movimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((sum, m) => sum + Number(m.monto), 0)

    const porMetodo = {
      efectivo: 0,
      transferencia: 0,
      otro: 0,
    }

    movimientos.forEach(m => {
      if (m.tipo === 'ingreso' && porMetodo.hasOwnProperty(m.metodo_pago)) {
        porMetodo[m.metodo_pago] += Number(m.monto)
      }
    })

    return res.json({
      success: true,
      ingresos: Math.round(ingresos * 100) / 100,
      egresos: Math.round(egresos * 100) / 100,
      balance: Math.round((ingresos - egresos) * 100) / 100,
      por_metodo: {
        efectivo: Math.round(porMetodo.efectivo * 100) / 100,
        transferencia: Math.round(porMetodo.transferencia * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Error fetching resumen:', error)
    return res.status(500).json({ success: false, message: 'Error al obtener resumen' })
  }
})

// GET /api/caja/:gym_id/reporte-mensual - Generar PDF mensual
// 🆕 SOLO OWNER puede generar PDF
app.get('/api/caja/:gym_id/reporte-mensual', requireOwner, async (req, res) => {
  const { gym_id } = req.params
  const { mes, anio } = req.query

  if (!mes || !anio) {
    return res.status(400).json({ success: false, message: 'Mes y año son obligatorios' })
  }

  const mesNum = parseInt(mes)
  const anioNum = parseInt(anio)

  if (mesNum < 1 || mesNum > 12 || anioNum < 2020 || anioNum > 2100) {
    return res.status(400).json({ success: false, message: 'Mes o año inválidos' })
  }

  try {
    // Obtener datos del gym
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', gym_id)
      .single()

    if (gymError || !gym) {
      return res.status(404).json({ success: false, message: 'Gimnasio no encontrado' })
    }

    // Calcular fechas del mes
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

    const porMetodo = {
      efectivo: 0,
      transferencia: 0,
    }

    movimientos.forEach(m => {
      if (m.tipo === 'ingreso' && porMetodo.hasOwnProperty(m.metodo_pago)) {
        porMetodo[m.metodo_pago] += Number(m.monto)
      }
    })

    // Crear PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' })

    // Headers para la respuesta
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=reporte-mensual-${mes}-${anio}.pdf`)

    doc.pipe(res)

    // Header del PDF
    doc.fontSize(20).text('REPORTE MENSUAL DE CAJA', { align: 'center' })
    doc.moveDown()
    doc.fontSize(16).text(gym.nombre || 'Gimnasio', { align: 'center' })
    doc.fontSize(12).text(`${mesNum}/${anioNum}`, { align: 'center' })
    doc.moveDown(2)

    // Resumen
    doc.fontSize(14).text('RESUMEN', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(11)
    doc.fillColor('#00AA00').text(`Total Ingresos: $${ingresos.toFixed(2)}`)
    doc.fillColor('#FF0000').text(`Total Egresos: $${egresos.toFixed(2)}`)
    doc.fillColor('#000000').text(`Balance: $${balance.toFixed(2)}`, { bold: balance >= 0 })
    doc.moveDown(1.5)

    // Métodos de pago
    doc.fontSize(14).text('POR MÉTODO DE PAGO', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(11)
    doc.text(`Efectivo: $${porMetodo.efectivo.toFixed(2)}`)
    doc.text(`Transferencia: $${porMetodo.transferencia.toFixed(2)}`)
    doc.moveDown(2)

    // Tabla de movimientos
    doc.fontSize(14).text('DETALLE DE MOVIMIENTOS', { underline: true })
    doc.moveDown(1)

    // Header de tabla
    const tableTop = doc.y
    const col1 = 50
    const col2 = 110
    const col3 = 170
    const col4 = 240
    const col5 = 370
    const col6 = 480

    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Fecha', col1, tableTop)
    doc.text('Tipo', col2, tableTop)
    doc.text('Categoría', col3, tableTop)
    doc.text('Descripción', col4, tableTop)
    doc.text('Método', col5, tableTop)
    doc.text('Monto', col6, tableTop)

    doc.font('Helvetica')
    let y = tableTop + 20

    movimientos.forEach((mov, index) => {
      // Verificar si hay espacio, si no, nueva página
      if (y > 700) {
        doc.addPage()
        y = 50
      }

      const monto = Number(mov.monto).toFixed(2)
      const color = mov.tipo === 'ingreso' ? '#00AA00' : '#FF0000'

      doc.fontSize(9)
      doc.fillColor('#000000').text(mov.fecha, col1, y, { width: 55 })
      doc.fillColor(color).text(mov.tipo, col2, y, { width: 55 })
      doc.fillColor('#000000').text(mov.categoria, col3, y, { width: 65 })
      doc.text(mov.descripcion.substring(0, 20), col4, y, { width: 125 })
      doc.text(mov.metodo_pago, col5, y, { width: 100 })
      doc.fillColor(color).text(`$${monto}`, col6, y, { width: 70 })

      y += 20
    })

    // Finalizar PDF
    doc.end()

  } catch (error) {
    console.error('Error generating PDF:', error)
    return res.status(500).json({ success: false, message: 'Error al generar reporte' })
  }
})

nextApp.prepare().then(() => {
  // 🆕 INICIALIZAR EXTENSIONES DEL SISTEMA
  initializeExtensions(app, PDFDocument)

  app.all('*', (req, res) => handle(req, res))

  initDatabase().then((created) => {
    if (!created) {
      throw new Error('Database initialization failed')
    }
    const server = app.listen(PORT, () => {
      console.log(`Server ready on http://localhost:${PORT}`)
    })

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} already in use. Stop the running process or set PORT to a free port before starting.`)
      } else {
        console.error('Server error:', error)
      }
      process.exit(1)
    })
  }).catch((error) => {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  })
}).catch((error) => {
  console.error('Next.js prepare failed:', error)
  process.exit(1)
})
