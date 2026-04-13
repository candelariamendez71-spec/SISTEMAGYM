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
    const exists = fs.existsSync(DB_PATH)
    const db = openDb()

    db.exec(INIT_SQL, (err) => {
      if (err) {
        reject(err)
      } else {
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
