'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { SbStatus } from './Dashboard'

interface Props {
  onClose: () => void
  onConnect: (url: string, key: string, table: string) => Promise<{ ok: boolean; msg: string }>
  onReload: (client: ReturnType<typeof getSupabaseClient>, table: string) => Promise<{ ok: boolean; msg: string }>
  onImport: (file: File, client: ReturnType<typeof getSupabaseClient>, table: string) => Promise<{ inserted: number; error?: string }>
  onAutoRefresh: (client: ReturnType<typeof getSupabaseClient>, table: string, secs: number) => void
  onStatusChange: (s: SbStatus) => void
  showToast: (msg: string, err?: boolean) => void
}

const SQL_TEMPLATE = `-- Ejecuta esto en Supabase → SQL Editor
CREATE TABLE IF NOT EXISTS leads (
  id                BIGSERIAL PRIMARY KEY,
  lead_id           TEXT,
  estado_matricula  TEXT,
  consultor         TEXT,
  carrera           TEXT,
  ultimo_interes    TEXT,
  citas             INTEGER DEFAULT 0,
  fecha_creacion    DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leads_estado    ON leads(estado_matricula);
CREATE INDEX idx_leads_consultor ON leads(consultor);
CREATE INDEX idx_leads_carrera   ON leads(carrera);
CREATE INDEX idx_leads_fecha     ON leads(fecha_creacion);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública"   ON leads FOR SELECT USING (true);
CREATE POLICY "Inserción pública" ON leads FOR INSERT WITH CHECK (true);`

export default function SupabasePanel({ onClose, onConnect, onReload, onImport, onAutoRefresh, onStatusChange, showToast }: Props) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [table, setTable] = useState('leads')
  const [limit, setLimit] = useState(10000)
  const [logs, setLogs] = useState<{ msg: string; type: 'info'|'success'|'error' }[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showSql, setShowSql] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [refreshSecs, setRefreshSecs] = useState(0)
  const [client, setClient] = useState<ReturnType<typeof getSupabaseClient> | null>(null)

  useEffect(() => {
    setUrl(localStorage.getItem('udla_sb_url') || '')
    setKey(localStorage.getItem('udla_sb_key') || '')
    setTable(localStorage.getItem('udla_sb_table') || 'leads')
  }, [])

  const log = (msg: string, type: 'info'|'success'|'error' = 'info') =>
    setLogs(prev => [...prev.slice(-20), { msg, type }])

  async function handleConnect() {
    if (!url || !key) { log('URL y Key son obligatorios', 'error'); return }
    log(`Conectando a ${url}…`)
    const c = getSupabaseClient(url, key)
    setClient(c)
    const res = await onConnect(url, key, table)
    if (res.ok) { log(`✓ ${res.msg}`, 'success'); if (refreshSecs > 0) onAutoRefresh(c, table, refreshSecs) }
    else log(`Error: ${res.msg}`, 'error')
  }

  function handleSave() {
    if (!url || !key) return
    localStorage.setItem('udla_sb_url', url)
    localStorage.setItem('udla_sb_key', key)
    localStorage.setItem('udla_sb_table', table)
    log('✓ Credenciales guardadas', 'success')
    showToast('✓ Credenciales guardadas')
  }

  function handleClear() {
    ['udla_sb_url','udla_sb_key','udla_sb_table'].forEach(k => localStorage.removeItem(k))
    setUrl(''); setKey(''); setTable('leads')
    log('Credenciales eliminadas')
  }

  async function handleImport(file: File) {
    if (!client) { log('Conéctate primero', 'error'); return }
    log(`Importando ${file.name}…`)
    setImportProgress('Procesando…')
    const res = await onImport(file, client, table)
    if (res.error) { log(`Error: ${res.error}`, 'error'); setImportProgress('Error') }
    else { log(`✓ ${res.inserted} filas importadas`, 'success'); setImportProgress(`✓ ${res.inserted} filas`) }
  }

  function handleRefreshChange(secs: number) {
    setRefreshSecs(secs)
    if (client && secs > 0) onAutoRefresh(client, table, secs)
  }

  const logColor = { info: '#94A3B8', success: '#6EE7B7', error: '#FCA5A5' }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 pt-4">
      <div className="sb-panel p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 14l9-11v7h7L10 21v-7H3z" fill="#3ECF8E"/>
            </svg>
            <span className="text-white font-bold text-sm">Conexión Supabase</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xs font-bold transition-colors px-3 py-1 rounded border border-white/10 hover:border-white/30">✕ Cerrar</button>
        </div>

        {/* Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="sb-label">Supabase URL</div>
            <input className="sb-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" autoComplete="off"/>
          </div>
          <div>
            <div className="sb-label">Anon Key</div>
            <input className="sb-input" value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="eyJhbGci…" autoComplete="off"/>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <div className="sb-label">Tabla</div>
            <input className="sb-input" value={table} onChange={e => setTable(e.target.value)} placeholder="leads"/>
          </div>
          <div>
            <div className="sb-label">Límite filas</div>
            <input className="sb-input" type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 10000)}/>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleConnect} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">⚡ Conectar</button>
            <button onClick={handleSave} title="Guardar" className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm">💾</button>
            <button onClick={handleClear} title="Limpiar" className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm">🗑</button>
          </div>
        </div>

        {/* Upload section */}
        <div className="border-t border-white/10 mt-4 pt-4">
          <button className="flex items-center justify-between w-full text-left" onClick={() => setShowUpload(p => !p)}>
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">📤 Importar Excel → Supabase</span>
            <span className="text-white/40 text-xs">{showUpload ? '▲' : '▼'}</span>
          </button>
          {showUpload && (
            <div className="mt-3">
              <p className="text-white/40 text-xs mb-3">Sube tu Excel e inserta sus filas en Supabase. Requiere estar conectado.</p>
              <label className="upload-zone p-4 flex items-center justify-center gap-3 cursor-pointer block">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = '' }}/>
                <span className="text-sm font-semibold text-gray-700">Selecciona Excel para importar</span>
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Elegir archivo</span>
              </label>
              {importProgress && <p className="text-white/50 text-xs mt-2">{importProgress}</p>}
            </div>
          )}
        </div>

        {/* SQL */}
        <div className="border-t border-white/10 mt-4 pt-4">
          <button className="flex items-center justify-between w-full text-left" onClick={() => setShowSql(p => !p)}>
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">🛠 SQL para crear la tabla</span>
            <span className="text-white/40 text-xs">{showSql ? '▲' : '▼'}</span>
          </button>
          {showSql && (
            <div className="mt-3">
              <pre className="bg-black/30 text-green-300 text-xs p-4 rounded-lg overflow-x-auto leading-relaxed">{SQL_TEMPLATE}</pre>
              <button onClick={() => navigator.clipboard.writeText(SQL_TEMPLATE).then(() => showToast('✓ SQL copiado'))} className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors">📋 Copiar SQL</button>
            </div>
          )}
        </div>

        {/* Auto-refresh */}
        <div className="border-t border-white/10 mt-4 pt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <label className="text-white/60 text-xs font-semibold">Auto-actualizar cada</label>
            <select className="sb-input" style={{ width: 'auto', padding: '4px 8px' }} value={refreshSecs} onChange={e => handleRefreshChange(parseInt(e.target.value))}>
              <option value={0}>Desactivado</option>
              <option value={30}>30 seg</option>
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
            </select>
          </div>
          <div className="flex gap-2">
            {client && <button onClick={() => onReload(client, table)} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors">🔄 Recargar ahora</button>}
            <button onClick={onClose} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">✓ Listo</button>
          </div>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-3 bg-black/20 rounded-lg p-3 max-h-28 overflow-y-auto">
            {logs.map((l, i) => (
              <div key={i} className="text-xs font-mono" style={{ color: logColor[l.type] }}>
                [{new Date().toLocaleTimeString()}] {l.msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
