'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { getSupabaseClient } from '@/lib/supabase'
import {
  LeadRow, mapColumns, getVal, parseDate, fmtMonth,
  generateDemoData, norm,
} from '@/lib/dataUtils'
import Header from './Header'
import KpiCards from './KpiCards'
import SupabasePanel from './SupabasePanel'
import UploadZone from './UploadZone'
import ChartSection from './ChartSection'
import DataTables from './DataTables'
import Toast from './Toast'

export type Filters = {
  estado:    string
  consultor: string
  carrera:   string
  campus:    string
  equipo:    string
  mes:       string
  periodo:   string
}

export type ColMap = Record<string, string | null>
export type SbStatus = 'connected' | 'disconnected' | 'error'

export default function Dashboard() {
  const [rawData,        setRawData]        = useState<LeadRow[]>([])
  const [cols,           setCols]           = useState<ColMap>({})
  const [filters,        setFilters]        = useState<Filters>({
    estado: 'all', consultor: 'all', carrera: 'all',
    campus: 'all', equipo: 'all', mes: 'all', periodo: 'all',
  })
  const [filterOptions,  setFilterOptions]  = useState<Record<string, string[]>>({
    estado: [], consultor: [], carrera: [], campus: [], equipo: [], mes: [],
  })
  const [sbStatus,       setSbStatus]       = useState<SbStatus>('disconnected')
  const [sbPanelOpen,    setSbPanelOpen]    = useState(false)
  const [lastUpdate,     setLastUpdate]     = useState<string | null>(null)
  const [toast,          setToast]          = useState<{ msg: string; err?: boolean } | null>(null)
  const [colHint,        setColHint]        = useState<string>('')
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = useCallback((msg: string, err = false) => {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3200)
  }, [])

  const applyFilters = useCallback((data: LeadRow[]): LeadRow[] => {
    return data.filter(row => {
      if (filters.estado    !== 'all' && getVal(row, 'estado',    cols) !== filters.estado)    return false
      if (filters.consultor !== 'all' && getVal(row, 'consultor', cols) !== filters.consultor) return false
      if (filters.carrera   !== 'all' && getVal(row, 'carrera',   cols) !== filters.carrera)   return false
      if (filters.campus    !== 'all' && getVal(row, 'campus',    cols) !== filters.campus)    return false
      if (filters.equipo    !== 'all' && getVal(row, 'equipo',    cols) !== filters.equipo)    return false
      if (filters.mes       !== 'all' && getVal(row, 'mes',       cols) !== filters.mes)       return false
      if (filters.periodo   !== 'all') {
        const fd = parseDate(getVal(row, 'fecha', cols))
        if (fd) {
          const cut = new Date()
          cut.setDate(cut.getDate() - parseInt(filters.periodo))
          if (fd < cut) return false
        }
      }
      return true
    })
  }, [filters, cols])

  const filteredData = applyFilters(rawData)

  function ingestData(data: LeadRow[]) {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const newCols = mapColumns(headers)
    setCols(newCols)
    setRawData(data)

    const sets: Record<string, Set<string>> = {
      estado: new Set(), consultor: new Set(), carrera: new Set(),
      campus: new Set(), equipo: new Set(), mes: new Set(),
    }
    data.forEach(row => {
      for (const k of Object.keys(sets)) {
        const v = getVal(row, k, newCols)
        if (v) sets[k].add(v)
      }
    })
    // Ordenar meses en orden cronológico si es posible
    const MES_ORDER = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const sortedMeses = [...sets.mes].sort((a, b) => {
      const ai = MES_ORDER.indexOf(norm(a)), bi = MES_ORDER.indexOf(norm(b))
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    setFilterOptions({
      estado:    [...sets.estado].sort(),
      consultor: [...sets.consultor].sort(),
      carrera:   [...sets.carrera].sort(),
      campus:    [...sets.campus].sort(),
      equipo:    [...sets.equipo].sort(),
      mes:       sortedMeses,
    })
    const det = Object.entries(newCols).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')
    setColHint(det)
    setLastUpdate(new Date().toLocaleTimeString())
  }

  // ── Carga de archivo ──────────────────────────────────────────────────────
  function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result as string, { type: 'binary', cellDates: true })
      // Preferir "Hoja1" si existe (formato UDLA Call Center)
      const sheetName = wb.SheetNames.includes('Hoja1') ? 'Hoja1' : wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json<LeadRow>(ws, { defval: '' })
      if (!json.length) { showToast('⚠ Archivo vacío', true); return }
      ingestData(json)
      showToast(`✓ ${json.length} registros cargados — ${file.name} (hoja: ${sheetName})`)
    }
    reader.readAsBinaryString(file)
  }

  // ── Supabase ──────────────────────────────────────────────────────────────
  async function connectSupabase(url: string, key: string, table: string) {
    const client = getSupabaseClient(url, key)
    return loadFromSupabase(client, table)
  }

  async function loadFromSupabase(client: ReturnType<typeof getSupabaseClient> | null, table: string, limit = 10000) {
    if (!client) return { ok: false, msg: 'No hay cliente' }
    const { data, error } = await client.from(table).select('*').limit(limit)
    if (error)       { setSbStatus('error'); return { ok: false, msg: error.message } }
    if (!data?.length) { setSbStatus('error'); return { ok: false, msg: 'Tabla vacía' } }
    ingestData(data as LeadRow[])
    setSbStatus('connected')
    showToast(`✓ ${data.length} registros desde Supabase`)
    return { ok: true, msg: `${data.length} filas` }
  }

  async function importExcelToSupabase(file: File, client: ReturnType<typeof getSupabaseClient>, table: string) {
    const reader = new FileReader()
    return new Promise<{ inserted: number; error?: string }>((resolve) => {
      reader.onload = async (e) => {
        const wb = XLSX.read(e.target?.result as string, { type: 'binary', cellDates: true })
        const sheetName = wb.SheetNames.includes('Hoja1') ? 'Hoja1' : wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<LeadRow>(ws, { defval: '' })
        if (!rows.length) { resolve({ inserted: 0, error: 'Archivo vacío' }); return }

        // Normalizar nombres de columna a snake_case limpio para Supabase
        const UDLA_COL_MAP: Record<string, string> = {
          'rut':                                                    'rut',
          'asunto':                                                 'asunto',
          'marketing5':                                             'equipo',
          'cont. llamadas (referente a) (contacto)':               'cont_llamadas',
          'fecha de cración':                                       'fecha_creacion',
          'fecha de creacion':                                      'fecha_creacion',
          'fecha compromiso':                                       'fecha_compromiso',
          'primer sub origen (referente a) (contacto)':            'primer_sub_origen',
          'teléfono móvil (referente a) (contacto)':               'telefono',
          'propietario':                                            'propietario',
          'campus':                                                 'campus',
          'régimen interés 1':                                      'regimen',
          'carrera de interés':                                     'carrera',
          'llamada a':                                              'consultor',
          'propietario (referente a) (contacto)':                  'propietario_contacto',
          'ultimo interés cierre (referente a) (contacto)':        'ultimo_interes_cierre',
          'seguimiento cierre':                                     'seguimiento_cierre',
          'interés':                                                'interes',
          'interés cierre':                                         'interes_cierre',
          'prioridad':                                              'prioridad',
          'semana':                                                 'semana',
          'mes':                                                    'mes',
          'banner':                                                 'banner',
        }
        const normalised = rows.map(r => {
          const o: LeadRow = {}
          for (const [k, v] of Object.entries(r)) {
            const kn = norm(k).replace(/[̀-ͯ]/g, '')
            const mapped = UDLA_COL_MAP[kn] ?? kn.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            if (mapped) o[mapped] = v === '' ? null : v
          }
          return o
        })

        const CHUNK = 500; let inserted = 0
        for (let i = 0; i < normalised.length; i += CHUNK) {
          const { error } = await client.from(table).insert(normalised.slice(i, i + CHUNK))
          if (error) { resolve({ inserted, error: error.message }); return }
          inserted += Math.min(CHUNK, normalised.length - i)
        }
        await loadFromSupabase(client, table)
        resolve({ inserted })
      }
      reader.readAsBinaryString(file)
    })
  }

  function startAutoRefresh(client: ReturnType<typeof getSupabaseClient>, table: string, secs: number) {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    if (secs > 0) refreshTimerRef.current = setInterval(() => loadFromSupabase(client, table), secs * 1000)
  }

  useEffect(() => {
    ingestData(generateDemoData())
    showToast('📊 Datos demo — importa el Excel o conecta Supabase')
    const url   = localStorage.getItem('udla_sb_url')
    const key   = localStorage.getItem('udla_sb_key')
    const table = localStorage.getItem('udla_sb_table') || 'citas_callcenter'
    if (url && key) {
      setSbPanelOpen(true)
      connectSupabase(url, key, table)
    }
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#F0F0F5' }}>
      <Header
        sbStatus={sbStatus}
        filters={filters}
        filterOptions={filterOptions}
        lastUpdate={lastUpdate}
        onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onSbClick={() => setSbPanelOpen(p => !p)}
      />

      {sbPanelOpen && (
        <SupabasePanel
          onClose={() => setSbPanelOpen(false)}
          onConnect={connectSupabase}
          onReload={(client, table) => loadFromSupabase(client, table)}
          onImport={importExcelToSupabase}
          onAutoRefresh={startAutoRefresh}
          onStatusChange={setSbStatus}
          showToast={showToast}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 pt-4">
        <UploadZone onFile={processFile} colHint={colHint} />
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 pb-10 mt-5 space-y-4">
        <KpiCards   data={filteredData} cols={cols} rawTotal={rawData.length} />
        <ChartSection data={filteredData} cols={cols} />
        <DataTables   data={filteredData} cols={cols} />
      </div>

      {toast && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  )
}
