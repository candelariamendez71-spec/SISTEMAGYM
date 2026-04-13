const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
require('dotenv').config({ path: envPath })

const supabaseUrl = process.env.SUPABASE_URL || 'https://sviowmmerkmogrytmtsh.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  throw new Error(`SUPABASE_KEY or SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required. Loaded env file: ${envPath}. Current SUPABASE_KEY=${process.env.SUPABASE_KEY}, SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY}, SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function initDatabase() {
  try {
    console.log('🗄️ Initializing Supabase database...')

    const { error: connectError } = await supabase.from('gyms').select('id').limit(1)
    if (connectError) {
      throw connectError
    }
    console.log('✅ Database connected to Supabase')

    const { data: gyms, error: gymsError } = await supabase.from('gyms').select('id')
    if (gymsError) {
      throw gymsError
    }

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
      console.log('✅ Initial gyms seeded')
    }

    return true
  } catch (error) {
    console.error('❌ Database error:', error.message || error)
    console.error(error)
    return false
  }
}

module.exports = {
  supabase,
  initDatabase
}
