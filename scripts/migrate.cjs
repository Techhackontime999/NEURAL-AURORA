const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'supabase-schema.sql'), 'utf8')
const fixSql = fs.readFileSync(path.join(__dirname, 'fix-rls.sql'), 'utf8')

// Split SQL into individual statements, filtering out empty/comments
function splitStatements(sql) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
}

const client = new Client({
  connectionString: 'postgresql://postgres:Kumaramit%40%237654@db.vtbldaytmebyakoukswb.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log('Connecting to database...')
  await client.connect()
  console.log('Connected. Running migration...')

  // Run schema statements individually with error tolerance
  const statements = splitStatements(schemaSql)
  let ok = 0, errs = 0

  for (const stmt of statements) {
    try {
      await client.query(stmt)
      ok++
    } catch (err) {
      // Ignore "already exists" errors for policies, triggers, extensions
      const msg = err.message || ''
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('already been granted')
      ) {
        console.log(`  ↻ skipped (already exists): ${stmt.slice(0, 80)}...`)
        ok++
      } else {
        console.error(`  ✗ error: ${msg}`)
        console.error(`  statement: ${stmt.slice(0, 120)}...`)
        errs++
      }
    }
  }

  // Run permission fix statements
  const fixStatements = splitStatements(fixSql)
  for (const stmt of fixStatements) {
    try {
      await client.query(stmt)
      ok++
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already been granted')) {
        ok++
      } else {
        console.error(`  ✗ error: ${msg}`)
        errs++
      }
    }
  }

  console.log(`\n✓ Migration complete: ${ok} statements executed, ${errs} errors`)
  await client.end()
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
