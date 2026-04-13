const express = require('express')
const cors = require('cors')
const path = require('path')
const next = require('next')
const { initDatabase, openDb, run, get, all, DB_PATH } = require('./db')

const ROOT_DIR = path.join(__dirname, '..')
const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev, dir: ROOT_DIR })
const handle = nextApp.getRequestHandler()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

console.log('Starting backend/server.js')
console.log('Frontend root path:', ROOT_DIR)
console.log('Database path:', DB_PATH)

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

async function findUser(dni, gym_id) {
  const db = openDb()
  try {
    const row = await get(db, 'SELECT * FROM usuarios WHERE dni = ? AND gym_id = ?', [dni, gym_id])
    return row ? normalizeUser(row) : null
  } finally {
    db.close()
  }
}

app.use(express.static(path.join(ROOT_DIR, 'public')))
app.use('/_next', express.static(path.join(ROOT_DIR, '.next')))

app.post('/api/login', async (req, res) => {
  console.log('POST /api/login', req.body)
  const { usuario, password } = req.body

  if (!usuario || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son obligatorios' })
  }

  const db = openDb()
  try {
    const gym = await get(db, 'SELECT * FROM gyms WHERE usuario = ? AND password = ?', [usuario, password])
    console.log('Gym query result:', gym)
    if (!gym) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' })
    }

    const users = await all(db, 'SELECT * FROM usuarios WHERE gym_id = ?', [gym.id])
    return res.json({
      success: true,
      gym: normalizeGym(gym),
      users: users.map(normalizeUser),
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.post('/api/access', async (req, res) => {
  console.log('POST /api/access', req.body)
  const { dni, gym_id } = req.body

  if (!dni || !gym_id) {
    return res.status(400).json({ success: false, message: 'DNI y gym_id son obligatorios' })
  }

  const db = openDb()
  try {
    const row = await get(db, 'SELECT * FROM usuarios WHERE dni = ? AND gym_id = ?', [dni, gym_id])
    if (!row) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }

    const user = normalizeUser(row)
    const today = new Date()
    const expirationDate = parseDate(user.vencimiento)

    if (!expirationDate || expirationDate < today) {
      await run(db, 'UPDATE usuarios SET estado = ? WHERE id = ?', ['inactivo', row.id])
      return res.status(400).json({ success: false, message: 'Plan vencido. Usuario inactivado.' })
    }

    if (!user.activo) {
      return res.status(400).json({ success: false, message: 'Usuario inactivo' })
    }

    let pasesRestantes = undefined
    if (user.plan === '12pases') {
      if (user.pases_disponibles <= 0) {
        return res.status(400).json({ success: false, message: 'Sin pases disponibles' })
      }
      pasesRestantes = user.pases_disponibles - 1
      await run(db, 'UPDATE usuarios SET ingresos_disponibles = ? WHERE id = ?', [pasesRestantes, row.id])
      await run(db, 'INSERT INTO ingresos (usuario_id, fecha) VALUES (?, ?)', [row.id, new Date().toISOString()])
    } else {
      await run(db, 'INSERT INTO ingresos (usuario_id, fecha) VALUES (?, ?)', [row.id, new Date().toISOString()])
    }

    const updatedUserRow = await get(db, 'SELECT * FROM usuarios WHERE id = ?', [row.id])
    const updatedUser = normalizeUser(updatedUserRow)

    return res.json({
      success: true,
      message: user.plan === 'libre' ? 'Acceso permitido' : `Acceso permitido. Te quedan ${pasesRestantes} pases`,
      user: updatedUser,
      pases_restantes: pasesRestantes,
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.post('/api/user', async (req, res) => {
  console.log('POST /api/user', req.body)
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

  const db = openDb()
  try {
    const result = await run(db,
      `INSERT INTO usuarios (nombre, dni, tipo_plan, fecha_inicio, fecha_vencimiento, ingresos_disponibles, estado, gym_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre.trim(), dni.trim(), tipo_plan, fecha_inicio, vencimiento, ingresos, 'activo', gym_id, now]
    )

    const newRow = await get(db, 'SELECT * FROM usuarios WHERE id = ?', [result.lastID])
    return res.json({ success: true, user: normalizeUser(newRow) })
  } catch (error) {
    const message = error && error.message && error.message.includes('UNIQUE')
      ? 'Ya existe un usuario con ese DNI en este gimnasio'
      : 'Error al crear el usuario'
    return res.status(400).json({ success: false, message })
  } finally {
    db.close()
  }
})

app.get('/api/user/:dni/:gym_id', async (req, res) => {
  console.log('GET /api/user/:dni/:gym_id', req.params)
  const { dni, gym_id } = req.params
  const db = openDb()
  try {
    const row = await get(db, 'SELECT * FROM usuarios WHERE dni = ? AND gym_id = ?', [dni, gym_id])
    if (!row) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }
    return res.json({ success: true, user: normalizeUser(row) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.get('/api/users/:gym_id', async (req, res) => {
  console.log('GET /api/users/:gym_id', req.params, req.query)
  const { gym_id } = req.params
  const { estado } = req.query
  const db = openDb()
  try {
    let rows
    if (estado === 'activo' || estado === 'inactivo') {
      rows = await all(db, 'SELECT * FROM usuarios WHERE gym_id = ? AND estado = ?', [gym_id, estado])
    } else {
      rows = await all(db, 'SELECT * FROM usuarios WHERE gym_id = ?', [gym_id])
    }
    return res.json({ success: true, total: rows.length, users: rows.map(normalizeUser) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.post('/api/renew', async (req, res) => {
  console.log('POST /api/renew', req.body)
  const { dni, gym_id, plan } = req.body

  if (!dni || !gym_id || !plan) {
    return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' })
  }

  const tipo_plan = plan === '12pases' ? '12_pases' : 'libre'
  const ingresos = tipo_plan === '12_pases' ? 12 : 0
  const fecha_inicio = formatDate()
  const fecha_vencimiento = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

  const db = openDb()
  try {
    const row = await get(db, 'SELECT * FROM usuarios WHERE dni = ? AND gym_id = ?', [dni, gym_id])
    if (!row) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }

    await run(db,
      `UPDATE usuarios SET tipo_plan = ?, fecha_inicio = ?, fecha_vencimiento = ?, ingresos_disponibles = ?, estado = ? WHERE id = ?`,
      [tipo_plan, fecha_inicio, fecha_vencimiento, ingresos, 'activo', row.id]
    )

    const updatedRow = await get(db, 'SELECT * FROM usuarios WHERE id = ?', [row.id])
    return res.json({ success: true, user: normalizeUser(updatedRow) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.put('/api/gym/:id', async (req, res) => {
  console.log('PUT /api/gym/:id', req.params, req.body)
  const { id } = req.params
  const { nombre, logo, color } = req.body

  if (!nombre && !logo && !color) {
    return res.status(400).json({ success: false, message: 'Debes enviar al menos un campo para actualizar' })
  }

  const db = openDb()
  try {
    const current = await get(db, 'SELECT * FROM gyms WHERE id = ?', [id])
    if (!current) {
      return res.status(404).json({ success: false, message: 'Gimnasio no encontrado' })
    }

    const updatedGym = {
      nombre: nombre || current.nombre,
      logo: logo || current.logo,
      color: color || current.color,
    }

    await run(db, 'UPDATE gyms SET nombre = ?, logo = ?, color = ? WHERE id = ?', [updatedGym.nombre, updatedGym.logo, updatedGym.color, id])
    return res.json({ success: true, gym: normalizeGym({ id, ...updatedGym }) })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.get('/api/gym/:id', async (req, res) => {
  console.log('GET /api/gym/:id', req.params)
  const { id } = req.params
  const db = openDb()
  try {
    const gym = await get(db, 'SELECT * FROM gyms WHERE id = ?', [id])
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gimnasio no encontrado' })
    }
    return res.json({ success: true, gym: normalizeGym(gym) })
  } catch (error) {
    console.error('GET /api/gym/:id error:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.get('/api/debug/gyms', async (req, res) => {
  console.log('GET /api/debug/gyms')
  const db = openDb()
  try {
    const gyms = await all(db, 'SELECT * FROM gyms')
    console.log('Debug gyms result:', gyms)
    return res.json({ success: true, gyms })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    db.close()
  }
})

app.all('*', (req, res) => handle(req, res))

nextApp.prepare().then(() => {
  initDatabase().then((created) => {
    console.log(`Database initialized${created ? ' and seeded' : ''}`)
    app.listen(PORT, () => {
      console.log(`Server ready on http://localhost:${PORT}`)
    })
  }).catch((error) => {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  })
}).catch((error) => {
  console.error('Next.js prepare failed:', error)
  process.exit(1)
})
