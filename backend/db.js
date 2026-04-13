const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || 'https://sviowmmerkmogrytmtsh.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function initDatabase() {
  try {
    console.log('🗄️ Initializing Supabase database...')
    
    // Create gyms table
    await supabase.from('gyms').select('id').limit(1)
    console.log('✅ Database connected to Supabase')
    
    // Seed initial gyms if not exists
    const { data: gyms } = await supabase.from('gyms').select('id')
    if (!gyms || gyms.length === 0) {
      await supabase.from('gyms').insert([
        { nombre: 'Cyber Argento Gym', logo: '/images/logo.png', color: '#00FFC6', usuario: 'cyber', password: '1234' },
        { nombre: 'Gimnasio Capital', logo: '/images/logo.png', color: '#FF6B6B', usuario: 'capital', password: '5678' },
        { nombre: 'Gimnasio Norte', logo: '/images/logo.png', color: '#4ECDC4', usuario: 'norte', password: 'abcd' },
        { nombre: 'Apolo Gym', logo: '/images/logo.png', color: '#FFD700', usuario: 'apologymiseas', password: 'veronicaapolo873' }
      ])
      console.log('✅ Initial gyms seeded')
    }
    
    return true
  } catch (error) {
    console.error('❌ Database error:', error.message)
    return false
  }
}

module.exports = {
  supabase,
  initDatabase
}
