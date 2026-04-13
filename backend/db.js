const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, 'database.sqlite')
const INIT_SQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8')

function openDb() {
  const db = new sqlite3.Database(DB_PATH)
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON')
  })
  return db
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve(this)
      }
    })
  })
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err)
      } else {
        resolve(row)
      }
    })
  })
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log('DB_PATH:', DB_PATH)
    const exists = fs.existsSync(DB_PATH)
    console.log('DB exists:', exists)
    const db = openDb()

    db.exec(INIT_SQL, async (err) => {
      if (err) {
        console.error('DB init error:', err)
        reject(err)
      } else {
        try {
          console.log('DB initialized successfully')
          await db.run(`
            INSERT OR IGNORE INTO gyms (id, nombre, usuario, password, logo, color)
            VALUES (1, 'Apolo Gym', 'admin', '1234', '', '#000')
          `)

          await db.run(`
            INSERT OR IGNORE INTO usuarios 
            (nombre, dni, tipo_plan, fecha_inicio, fecha_vencimiento, ingresos_disponibles, estado, gym_id, created_at)
            VALUES 
            ('Usuario Test', '12345678', 'libre', '2024-01-01', '2099-01-01', 0, 'activo', 1, '2024-01-01')
          `)
        } catch (seedError) {
          console.error('DB seed error:', seedError)
          reject(seedError)
          return
        }

        db.close((closeError) => {
          if (closeError) {
            reject(closeError)
          } else {
            resolve(!exists)
          }
        })
      }
    })
  })
}

module.exports = {
  DB_PATH,
  openDb,
  run,
  get,
  all,
  initDatabase,
}
