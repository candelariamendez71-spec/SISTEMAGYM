const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const envPath = path.join(__dirname, '..', '.env.local')
require('dotenv').config({ path: envPath })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ No Supabase key found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔄 Ejecutando migración SQL...')
  
  // Read the migration file
  const migrationPath = path.join(__dirname, 'migrations', '001_add_gym_prices.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('📝 SQL a ejecutar:')
  console.log(sql)
  console.log('\n')

  // Try different RPC methods
  const rpcAttempts = [
    { name: 'execute_sql', params: { sql } },
    { name: 'exec_sql', params: { query: sql } },
    { name: 'run_sql', params: { sql_query: sql } },
  ]

  for (const { name, params } of rpcAttempts) {
    try {
      console.log(`Intentando RPC: ${name}...`)
      const { data, error } = await supabase.rpc(name, params)
      
      if (!error) {
        console.log(`✅ Migración ejecutada exitosamente con ${name}`)
        console.log('Respuesta:', data)
        
        // Verify the columns were created
        const { data: gyms, error: selectError } = await supabase
          .from('gyms')
          .select('id, precio_libre, precio_12_pases')
          .limit(1)
        
        if (!selectError) {
          console.log('\n✅ Verificación exitosa - columnas disponibles')
          console.log('Ejemplo:', gyms)
          process.exit(0)
        } else {
          console.log('⚠️ Advertencia al verificar:', selectError.message)
        }
        
        return
      } else {
        console.log(`❌ Error con ${name}:`, error.message)
      }
    } catch (e) {
      console.log(`❌ Excepción con ${name}:`, e.message)
    }
  }

  console.log('\n⚠️ No se pudo ejecutar automáticamente.')
  console.log('\n📋 SOLUCIÓN MANUAL:')
  console.log('1. Abre Supabase Dashboard → SQL Editor')
  console.log('2. Copia y pega este SQL:')
  console.log('\n' + sql)
  console.log('\n3. Ejecuta la query')
  
  process.exit(1)
}

runMigration().catch(err => {
  console.error('❌ Error inesperado:', err)
  process.exit(1)
})
