const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
require('dotenv').config({ path: envPath })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  throw new Error(`SUPABASE_KEY or SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required. Loaded env file: ${envPath}. Current SUPABASE_KEY=${process.env.SUPABASE_KEY}, SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY}, SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const DEFAULT_PRICE_LIBRE = 0
const DEFAULT_PRICE_12_PASES = 0

async function runSqlMigration(sql) {
  const attempts = [
    () => supabase.rpc('execute_sql', { sql }),
    () => supabase.rpc('exec_sql', { query: sql }),
    () => supabase.rpc('run_sql', { sql_query: sql }),
  ]

  for (const attempt of attempts) {
    try {
      const { error } = await attempt()
      if (!error) return true
    } catch {
      // Try the next RPC signature.
    }
  }

  return false
}

async function ensureGymPriceColumns() {
  const { error: selectError } = await supabase
    .from('gyms')
    .select('precio_libre, precio_12_pases')
    .limit(1)

  if (!selectError) {
    await supabase
      .from('gyms')
      .update({ precio_libre: DEFAULT_PRICE_LIBRE })
      .is('precio_libre', null)

    await supabase
      .from('gyms')
      .update({ precio_12_pases: DEFAULT_PRICE_12_PASES })
      .is('precio_12_pases', null)

    return true
  }

  const message = String(selectError.message || '').toLowerCase()
  const missingColumns =
    message.includes('precio_libre') ||
    message.includes('precio_12_pases') ||
    message.includes('column')

  if (!missingColumns) {
    throw selectError
  }

  const migrationSql = `
    ALTER TABLE gyms ADD COLUMN IF NOT EXISTS precio_libre NUMERIC NOT NULL DEFAULT ${DEFAULT_PRICE_LIBRE};
    ALTER TABLE gyms ADD COLUMN IF NOT EXISTS precio_12_pases NUMERIC NOT NULL DEFAULT ${DEFAULT_PRICE_12_PASES};
    UPDATE gyms
    SET
      precio_libre = COALESCE(precio_libre, ${DEFAULT_PRICE_LIBRE}),
      precio_12_pases = COALESCE(precio_12_pases, ${DEFAULT_PRICE_12_PASES});
  `

  const migrated = await runSqlMigration(migrationSql)
  if (!migrated) {
    console.warn('Could not auto-migrate gym price columns. Please run the SQL migration manually.')
    return false
  }

  return true
}

async function initDatabase() {
  try {
    const { error: connectError } = await supabase.from('gyms').select('id').limit(1)
    if (connectError) {
      throw connectError
    }

    const { data: gyms, error: gymsError } = await supabase.from('gyms').select('id')
    if (gymsError) {
      throw gymsError
    }

    await ensureGymPriceColumns()

    if (!gyms || gyms.length === 0) {
      const { error: insertError } = await supabase.from('gyms').insert([
        { nombre: 'Cyber Argento Gym', logo: '/images/logo.png', color: '#00FFC6', usuario: 'cyber', password: '1234' },
        { nombre: 'Gimnasio Capital', logo: '/images/logo.png', color: '#FF6B6B', usuario: 'capital', password: '5678' },
        { nombre: 'Gimnasio Norte', logo: '/images/logo.png', color: '#4ECDC4', usuario: 'norte', password: 'abcd' },
        { nombre: 'Apolo Gym', logo: '/images/logo.png', color: '#FFD700', usuario: 'apologymiseas', password: 'veronicaapolo873' }
      ])
      if (insertError) {
        throw insertError
      }
    }

    return true
  } catch (error) {
    console.error('Database initialization error:', error.message || error)
    return false
  }
}

module.exports = {
  supabase,
  initDatabase,
  ensureGymPriceColumns
}
