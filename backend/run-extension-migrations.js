const fs = require('fs')
const path = require('path')
const { supabase } = require('./db')

/**
 * Script para ejecutar las migraciones de extensión del sistema
 * Migración 003: Agrega finger_id a usuarios y admin_pin a gyms
 * Migración 004: Crea tabla user_historial
 */

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, 'migrations', migrationFile)
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`⚠️  Migración ${migrationFile} no encontrada`)
    return false
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')
  console.log(`\n📋 Ejecutando migración: ${migrationFile}`)
  console.log('SQL:', sql.substring(0, 100) + '...\n')

  try {
    // Para Supabase, necesitamos ejecutar las sentencias individualmente
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE') || statement.includes('CREATE TABLE') || 
          statement.includes('CREATE INDEX') || statement.includes('UPDATE')) {
        
        // Intentar ejecutar mediante RPC
        const { error } = await supabase.rpc('execute_sql', { sql: statement + ';' })
        
        if (error) {
          console.log(`⚠️  No se pudo ejecutar via RPC, intentando directo:`, error.message)
          
          // Si es ALTER TABLE, intentar directamente
          if (statement.includes('ALTER TABLE usuarios ADD COLUMN finger_id')) {
            // Verificar si la columna ya existe
            const { error: testError } = await supabase
              .from('usuarios')
              .select('finger_id')
              .limit(1)
            
            if (!testError) {
              console.log('✅ Columna finger_id ya existe')
            } else {
              console.log('⚠️  Necesitas ejecutar manualmente:', statement)
            }
          } else if (statement.includes('ALTER TABLE gyms ADD COLUMN admin_pin')) {
            const { error: testError } = await supabase
              .from('gyms')
              .select('admin_pin')
              .limit(1)
            
            if (!testError) {
              console.log('✅ Columna admin_pin ya existe')
            } else {
              console.log('⚠️  Necesitas ejecutar manualmente:', statement)
            }
          } else if (statement.includes('UPDATE gyms SET admin_pin')) {
            // Intentar update directo
            const { error: updateError } = await supabase
              .from('gyms')
              .update({ admin_pin: '0000' })
              .is('admin_pin', null)
            
            if (!updateError) {
              console.log('✅ PINs por defecto actualizados')
            } else {
              console.log('⚠️  Error actualizando PINs:', updateError.message)
            }
          }
        } else {
          console.log('✅ Sentencia ejecutada correctamente')
        }
      }
    }

    console.log(`✅ Migración ${migrationFile} completada\n`)
    return true
  } catch (error) {
    console.error(`❌ Error ejecutando migración ${migrationFile}:`, error.message)
    return false
  }
}

async function runExtensionMigrations() {
  console.log('🚀 Iniciando migraciones de extensión del sistema\n')

  // Ejecutar migraciones en orden
  const migrations = [
    '003_add_fingerprint_and_roles.sql',
    '004_create_user_historial.sql',
  ]

  for (const migration of migrations) {
    await runMigration(migration)
  }

  console.log('\n✨ Proceso de migración completado')
  console.log('\n📝 IMPORTANTE:')
  console.log('   - Si usas Supabase, puede que necesites ejecutar manualmente las migraciones desde el SQL Editor')
  console.log('   - Verifica que las columnas finger_id y admin_pin existan en las tablas')
  console.log('   - Verifica que la tabla user_historial se haya creado correctamente')
  
  process.exit(0)
}

// Ejecutar
runExtensionMigrations()
