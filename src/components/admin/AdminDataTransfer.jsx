import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../../context/ToastContext'
import {
  DATA_TABLES,
  IMPORTABLE_TABLES,
  collectData,
  countDumpRows,
  exportCsvBackup,
  exportJsonBackup,
  fetchTableCounts,
  importTables,
  parseImportFile,
  tableLabel,
} from '../../lib/dataTransfer'

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

const ALL = '__all__'

export default function AdminDataTransfer() {
  const { toast, confirm } = useToast()

  const [counts, setCounts] = useState(null)
  const [scope, setScope] = useState(ALL)
  const [exporting, setExporting] = useState(null) // 'json' | 'csv' | null

  const [fileName, setFileName] = useState('')
  const [fileText, setFileText] = useState('')
  const [targetTable, setTargetTable] = useState('')
  const [mode, setMode] = useState('merge')
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null) // { tables: { name: rows[] } }
  const [results, setResults] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchTableCounts().then(setCounts).catch(() => setCounts({}))
  }, [])

  // Preview is null when the file didn't carry a table name (CSV / bare array).
  const needsTablePick = Boolean(fileText) && !preview

  const scopeTables = useMemo(
    () => (scope === ALL ? DATA_TABLES.map((t) => t.table) : [scope]),
    [scope]
  )

  /* ------------------------------ Export ------------------------------ */

  async function handleExport(format) {
    setExporting(format)
    try {
      const dump = await collectData(scopeTables)
      if (format === 'json') {
        exportJsonBackup(dump)
      } else {
        const ok = await exportCsvBackup(dump)
        if (!ok) {
          toast.error('Nothing to export for this selection')
          return
        }
      }
      toast.success(`Export complete — ${countDumpRows(dump)} rows downloaded as ${format.toUpperCase()}`)
    } catch (err) {
      toast.error('Export failed: ' + err.message)
    } finally {
      setExporting(null)
    }
  }

  /* ------------------------------ Import ------------------------------ */

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    setResults(null)
    setPreview(null)
    if (!file) {
      setFileName('')
      setFileText('')
      return
    }
    let text = ''
    try {
      text = await file.text()
    } catch (err) {
      toast.error('Could not read file: ' + err.message)
      return
    }
    setFileName(file.name)
    setFileText(text)
    try {
      setPreview(parseImportFile(text, file.name, targetTable || null))
    } catch {
      // Expected for CSV / bare arrays — the target table is picked manually.
      setPreview(null)
    }
  }

  function buildPreview() {
    if (!fileText) return null
    try {
      return parseImportFile(fileText, fileName, targetTable || null)
    } catch (err) {
      toast.error(err.message)
      return null
    }
  }

  async function handleImport() {
    if (!fileText) return
    const parsed = buildPreview()
    if (!parsed) return
    const rowCount = countDumpRows(parsed.tables)
    if (rowCount === 0) {
      toast.error('No importable rows found in the file')
      return
    }

    const isReplace = mode === 'replace'
    const ok = await confirm({
      title: isReplace ? 'Replace Data' : 'Import Data',
      message: isReplace
        ? `This will DELETE existing rows in ${Object.keys(parsed.tables).length} table(s) and restore ${rowCount} row(s) from the file. This cannot be undone. Continue?`
        : `Import ${rowCount} row(s) into ${Object.keys(parsed.tables).length} table(s)? Existing rows matching a unique key will be updated, everything else is added.`,
      confirmText: isReplace ? 'Replace & Restore' : 'Import',
      danger: isReplace,
    })
    if (!ok) return

    setImporting(true)
    setResults(null)
    try {
      const final = await importTables(parsed.tables, mode, setResults)
      setResults(final)
      const okCount = final.filter((r) => r.status === 'ok').reduce((s, r) => s + r.count, 0)
      const failed = final.filter((r) => r.status === 'error')
      if (failed.length) {
        toast.error(`Import finished with errors in ${failed.length} table(s)`)
      } else {
        toast.success(`Import complete — ${okCount} row(s) written`)
      }
      fetchTableCounts().then(setCounts).catch(() => {})
    } catch (err) {
      toast.error('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  function resetImport() {
    setFileName('')
    setFileText('')
    setPreview(null)
    setResults(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const parsedTables = preview ? Object.keys(preview.tables) : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Data Import &amp; Export
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Back up everything in your site database as JSON or CSV, and restore it anytime.
        </p>
      </div>

      {/* Export */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
      >
        <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Export Data
        </h2>
        <p className="mt-1 mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Download your data so you can keep a copy at your end, move it to another instance, or use it anywhere else.
          JSON exports every selected table into one backup file; CSV exports one file per table (best for spreadsheets).
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              What to export
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            >
              <option value={ALL}>All tables ({DATA_TABLES.length})</option>
              {DATA_TABLES.map(({ table, label }) => (
                <option key={table} value={table}>
                  {label}
                  {counts && counts[table] != null ? ` (${counts[table]})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {exporting === 'json' ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting…
              </span>
            ) : (
              'Export JSON'
            )}
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#10b981' }}
          >
            {exporting === 'csv' ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting…
              </span>
            ) : (
              'Export CSV'
            )}
          </button>
        </div>

        {/* Table chips with row counts */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {DATA_TABLES.map(({ table, label, importable }) => (
            <span
              key={table}
              title={importable ? 'Included in export & import' : 'Included in export only (server-managed)'}
              className="rounded-full border px-2.5 py-0.5 text-[11px]"
              style={{
                borderColor: 'var(--border-color)',
                color: importable ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                background: 'var(--hover-bg)',
              }}
            >
              {label}
              {counts && counts[table] != null ? ` · ${counts[table]}` : ''}
              {!importable ? ' · read-only' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Import */}
      <div
        className="mt-8 rounded-xl border p-5"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
      >
        <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Import Data
        </h2>
        <p className="mt-1 mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Restore a JSON backup exported from this page, or a single-table CSV file.
          Tables marked <em>read-only</em> (orders, entitlements, users…) are managed by the server and are never imported.
          Note: only database rows are included — uploaded images and product files in storage are not part of a backup.
          Merge keeps existing rows and updates those matching a unique key (tables without one may gain duplicates); Replace
          wipes the selected tables first, so use it only with a full backup you trust.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px]">
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Backup file (.json or .csv)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full rounded-lg border px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Target table{!needsTablePick ? '' : ' (required)'}
            </label>
            <select
              value={targetTable}
              onChange={(e) => {
                const value = e.target.value
                setTargetTable(value)
                if (fileText) {
                  try {
                    setPreview(parseImportFile(fileText, fileName, value || null))
                  } catch {
                    setPreview(null)
                  }
                }
              }}
              disabled={importing}
              className="rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            >
              <option value="">—</option>
              {IMPORTABLE_TABLES.map(({ table, label }) => (
                <option key={table} value={table}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={importing}
              className="rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            >
              <option value="merge">Merge (add &amp; update)</option>
              <option value="replace">Replace (wipe &amp; restore)</option>
            </select>
          </div>

          <button
            onClick={handleImport}
            disabled={importing || !fileText}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: mode === 'replace' ? '#ef4444' : 'var(--accent)' }}
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing…
              </span>
            ) : (
              'Import'
            )}
          </button>

          {fileName && (
            <button
              onClick={resetImport}
              disabled={importing}
              className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* File preview */}
        <AnimatePresence>
          {fileName && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Loaded <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{fileName}</span>
              {parsedTables.length > 0 && (
                <> — {parsedTables.map(tableLabel).join(', ')} ({countDumpRows(preview.tables)} rows)</>
              )}
              {!parsedTables.length && <> — pick the target table to continue.</>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import results */}
        <AnimatePresence>
          {results && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-4 overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}>
                    <th className="px-3 py-2 font-medium uppercase tracking-wider">Table</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wider">Rows</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.table} style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
                      <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>{r.label}</td>
                      <td className="px-3 py-1.5">{r.count}</td>
                      <td
                        className="px-3 py-1.5"
                        style={{ color: r.status === 'error' ? '#ef4444' : r.status === 'skipped' ? '#f59e0b' : '#10b981' }}
                      >
                        {r.status === 'error' ? 'Failed' : r.status === 'skipped' ? 'Skipped' : 'OK'}
                      </td>
                      <td className="px-3 py-1.5">{r.message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
