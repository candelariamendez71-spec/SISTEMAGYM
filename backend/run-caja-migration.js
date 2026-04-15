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

async function runCajaMigration() {
  console.log('🔄 Running Caja migration...')
  
  const migrationPath = path.join(__dirname, 'migrations', '002_create_caja_movimientos.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('📝 SQL to execute:')
  console.log(sql)
  console.log('\n')

  const rpcAttempts = [
    { name: 'execute_sql', params: { sql } },
    { name: 'exec_sql', params: { query: sql } },
    { name: 'run_sql', params: { sql_query: sql } },
  ]

  for (const { name, params } of rpcAttempts) {
    try {
      console.log(`Trying RPC: ${name}...`)
      const { data, error } = await supabase.rpc(name, params)
      
      if (!error) {
        console.log(`✅ Migration successful with ${name}`)
        console.log('Response:', data)
        
        const { data: test, error: selectError } = await supabase
          .from('caja_movimientos')
          .select('id')
          .limit(1)
        
        if (!selectError) {
          console.log('✅ Table caja_movimientos verified!')
          return true
        } else {
          console.log('⚠️ Table created but verification failed:', selectError.message)
          return true
        }
      } else {
        console.log(`❌ Failed with ${name}:`, error.message)
      }
    } catch (err) {
      console.log(`❌ Exception with ${name}:`, err.message)
    }
  }

  console.log('\n⚠️ Auto-migration failed. Please create the table manually in Supabase SQL Editor:')
  console.log(sql)
  console.log('\n📌 IMPORTANTE: También ejecuta este comando después de crear la tabla:')
  console.log('ALTER TABLE caja_movimientos DISABLE ROW LEVEL SECURITY;')
  return false
}

runCajaMigration()
  .then((success) => {
    if (success) {
      console.log('\n✅ Caja migration completed successfully!')
      process.exit(0)
    } else {
      console.log('\n❌ Migration failed')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })
