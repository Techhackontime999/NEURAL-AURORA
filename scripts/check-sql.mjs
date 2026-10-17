// Structural lint for the SQL migrations.
//
// There is no local Postgres/Supabase CLI in this environment, so this does
// not *execute* the migrations. It catches the realistic typo classes:
// unbalanced parentheses, unterminated string literals, and CREATE POLICY
// statements that reference a table nothing ever creates.
import fs from 'node:fs'
import path from 'node:path'

const MIGRATION_DIR = 'supabase/migrations'
const CANONICAL_SCHEMA = 'supabase-schema.sql'

// Tables may be defined in a migration or in the canonical schema (the repo
// keeps both), so seed the known set from the schema file too.
const knownTables = new Set()
if (fs.existsSync(CANONICAL_SCHEMA)) {
  const schema = fs.readFileSync(CANONICAL_SCHEMA, 'utf8').replace(/--[^\n]*/g, '')
  for (const m of schema.matchAll(/CREATE TABLE (?:IF NOT EXISTS\s+)?([a-z_]+)/gi)) {
    knownTables.add(m[1].toLowerCase())
  }
}

const files = fs
  .readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()

let failures = 0

for (const file of files) {
  const src = fs.readFileSync(path.join(MIGRATION_DIR, file), 'utf8')

  // Drop line comments, then $$ ... $$ function bodies (their contents are
  // plpgsql, not statement-level SQL we can meaningfully balance).
  let sql = src.replace(/--[^\n]*/g, '')
  sql = sql.replace(/\$\$[\s\S]*?\$\$/g, '$$ BODY $$')

  const problems = []

  let depth = 0
  let wentNegative = false
  for (const ch of sql) {
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth < 0) wentNegative = true
    }
  }
  if (depth !== 0) problems.push(`unbalanced parentheses (net ${depth})`)
  if (wentNegative) problems.push('closing parenthesis without an opener')

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const stmt of statements) {
    const quotes = (stmt.match(/'/g) || []).length
    if (quotes % 2 !== 0) {
      problems.push(
        `odd number of single quotes in: ${stmt.slice(0, 70).replace(/\s+/g, ' ')}...`
      )
    }
  }

  for (const stmt of statements) {
    for (const m of stmt.matchAll(/CREATE POLICY[^;]*?\bON\s+([a-z_.]+)/gi)) {
      const table = m[1].toLowerCase()
      if (table.startsWith('storage.')) continue
      if (!knownTables.has(table)) {
        problems.push(`policy references unknown table '${table}'`)
      }
    }
  }

  const newTables = []
  for (const stmt of statements) {
    const m = stmt.match(/CREATE TABLE (?:IF NOT EXISTS\s+)?([a-z_]+)/i)
    if (m) newTables.push(m[1].toLowerCase())
  }
  for (const t of newTables) knownTables.add(t)

  if (problems.length) {
    failures++
    console.log(`FAIL  ${file}`)
    for (const p of problems) console.log(`      - ${p}`)
  } else {
    console.log(`ok    ${file}  (${statements.length} statements)`)
  }
}

console.log(
  failures === 0
    ? '\nAll migrations passed structural lint.'
    : `\n${failures} migration(s) with problems.`
)
process.exit(failures === 0 ? 0 : 1)
