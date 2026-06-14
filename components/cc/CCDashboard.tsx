'use client'
import { useState, useCallback } from 'react'
import { LeadRow } from '@/lib/dataUtils'
import {
  CCColMap,
  computeCCKpis, computeByEjecutivo, computeByRegimen,
  computeByCarrera, computeByBase, computeCausaRaiz,
  computeTemporal, computeProyecciones, computeInsights,
  META_DEFAULT,
} from '@/lib/ccDataUtils'
import CCKpis from './CCKpis'
import CCCharts from './CCCharts'
import {
  EjecutivoTable, RegimenTable, CarreraTable,
  BaseTable, CausaRaizTable, ProyeccionTable, InsightsPanel,
} from './CCTables'

type Granularity = 'dia' | 'semana' | 'mes'
type ActiveSection = 'kpis' | 'ejecutivos' | 'regimen' | 'carrera' | 'base' | 'temporal' | 'causa' | 'proyecciones' | 'insights'

interface Props {
  data: LeadRow[]
  cols: CCColMap
}

const FILTER_CONFIG = [
  { key: 'ejecutivo', label: 'Ejecutivo' },
  { key: 'regimen',   label: 'Régimen' },
  { key: 'carrera',   label: 'Carrera' },
  { key: 'base',      label: 'Tipo Base' },
  { key: 'campus',    label: 'Campus' },
  { key: 'mes',       label: 'Mes' },
]

export default function CCDashboard({ data, cols }: Props) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('kpis')
  const [granularity, setGranularity] = useState<Granularity>('semana')
  const [filters, setFilters] = useState<Record<string, string>>({
    ejecutivo: 'all', regimen: 'all', carrera: 'all',
    base: 'all', campus: 'all', mes: 'all',
  })

  // Construir opciones de filtro desde los datos
  const filterOptions = useCallback((): Record<string, string[]> => {
    const sets: Record<string, Set<string>> = {}
    FILTER_CONFIG.forEach(f => sets[f.key] = new Set())
    data.forEach(row => {
      FILTER_CONFIG.forEach(({ key }) => {
        const col = cols[key]
        if (col && row[col]) sets[key].add(String(row[col]).trim())
      })
    })
    const opts: Record<string, string[]> = {}
    FILTER_CONFIG.forEach(({ key }) => opts[key] = [...sets[key]].sort())
    return opts
  }, [data, cols])()

  // Aplicar filtros
  const filtered = data.filter(row => {
    return FILTER_CONFIG.every(({ key }) => {
      if (filters[key] === 'all') return true
      const col = cols[key]
      if (!col) return true
      return String(row[col] ?? '').trim() === filters[key]
    })
  })

  // Computar todos los datos derivados
  const kpis       = computeCCKpis(filtered, cols)
  const ejecutivos = computeByEjecutivo(filtered, cols, META_DEFAULT)
  const regimenes  = computeByRegimen(filtered, cols)
  const carreras   = computeByCarrera(filtered, cols)
  const bases      = computeByBase(filtered, cols)
  const temporal   = computeTemporal(filtered, cols, granularity)
  const causas     = computeCausaRaiz(filtered, cols)
  const proyecciones = computeProyecciones(kpis)
  const insights   = computeInsights(kpis, ejecutivos, carreras, regimenes, META_DEFAULT)

  const NAV_ITEMS: { id: ActiveSection; label: string; icon: string }[] = [
    { id: 'kpis',        label: 'KPIs',        icon: '📊' },
    { id: 'ejecutivos',  label: 'Ejecutivos',  icon: '👤' },
    { id: 'regimen',     label: 'Régimen',     icon: '📋' },
    { id: 'carrera',     label: 'Carrera',     icon: '🎓' },
    { id: 'base',        label: 'Tipo Base',   icon: '📦' },
    { id: 'temporal',    label: 'Temporal',    icon: '📅' },
    { id: 'causa',       label: 'Causa Raíz',  icon: '🔍' },
    { id: 'proyecciones',label: 'Proyecciones',icon: '📈' },
    { id: 'insights',    label: 'Conclusiones',icon: '💡' },
  ]

  const hasFilters = Object.values(filters).some(v => v !== 'all')

  return (
    <div className="space-y-4">
      {/* Filtros + sección activa */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Filtros:</span>
          {FILTER_CONFIG.map(({ key, label }) => (
            <select
              key={key}
              className="filter-select text-xs py-1 px-2"
              value={filters[key]}
              onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            >
              <option value="all">— {label} —</option>
              {filterOptions[key]?.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}
          {hasFilters && (
            <button
              onClick={() => setFilters({ ejecutivo: 'all', regimen: 'all', carrera: 'all', base: 'all', campus: 'all', mes: 'all' })}
              className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2"
            >Limpiar</button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length.toLocaleString('es-CL')} de {data.length.toLocaleString('es-CL')} registros</span>
        </div>
      </div>

      {/* KPIs siempre visibles */}
      <CCKpis kpis={kpis} />

      {/* Navegación de secciones */}
      <div className="card px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                activeSection === item.id
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
              style={activeSection === item.id ? { background: '#F4721E' } : {}}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sección activa */}
      {activeSection === 'kpis' && (
        <div className="space-y-4">
          <CCCharts
            ejecutivos={ejecutivos}
            regimenes={regimenes}
            carreras={carreras}
            bases={bases}
            temporal={temporal}
            granularity={granularity}
          />
        </div>
      )}

      {activeSection === 'ejecutivos' && (
        <EjecutivoTable data={ejecutivos} />
      )}

      {activeSection === 'regimen' && (
        <RegimenTable data={regimenes} />
      )}

      {activeSection === 'carrera' && (
        <CarreraTable data={carreras} />
      )}

      {activeSection === 'base' && (
        <BaseTable data={bases} />
      )}

      {activeSection === 'temporal' && (
        <div className="space-y-4">
          <div className="card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vista temporal:</span>
              {(['dia', 'semana', 'mes'] as Granularity[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${granularity === g ? 'text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                  style={granularity === g ? { background: '#F4721E' } : {}}
                >
                  {g === 'dia' ? 'Día' : g === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
          <CCCharts
            ejecutivos={ejecutivos}
            regimenes={regimenes}
            carreras={carreras}
            bases={bases}
            temporal={temporal}
            granularity={granularity}
          />
        </div>
      )}

      {activeSection === 'causa' && (
        <CausaRaizTable noCita={causas.noCita} noMat={causas.noMat} />
      )}

      {activeSection === 'proyecciones' && (
        <ProyeccionTable data={proyecciones} />
      )}

      {activeSection === 'insights' && (
        <InsightsPanel data={insights} />
      )}
    </div>
  )
}
