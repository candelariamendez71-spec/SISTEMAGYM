const express = require('express')
const cors = require('cors')
const path = require('path')
const next = require('next')
const { initDatabase, supabase } = require('./db')

const ROOT_DIR = path.join(__dirname, '..')
const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev, dir: ROOT_DIR })
const handle = nextApp.getRequestHandler()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3002


function normalizeGym(row) {
  return {
    gym_id: String(row.id),
    nombre: row.nombre,
    logo: row.logo,
    color: row.color,
  }
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
  const { usuario, password } = req.body

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

    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('gym_id', gym.id)

    if (usersError) throw usersError

    return res.json({
      success: true,
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
    } else {
      await supabase
        .from('ingresos')
        .insert([{ usuario_id: user.id, fecha: new Date().toISOString() }])
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

nextApp.prepare().then(() => {
  app.all('*', (req, res) => handle(req, res))

  initDatabase().then((created) => {
    if (!created) {
      throw new Error('Database initialization failed')
    }

    console.log(`Database initialized${created ? ' and seeded' : ''}`)
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
