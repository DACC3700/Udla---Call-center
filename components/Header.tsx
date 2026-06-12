'use client'
import { SbStatus, Filters } from './Dashboard'

interface Props {
  sbStatus:     SbStatus
  filters:      Filters
  filterOptions: Record<string, string[]>
  lastUpdate:   string | null
  onFilterChange: (key: string, value: string) => void
  onSbClick:    () => void
}

const FILTER_CONFIG = [
  { key: 'estado',    label: 'Estado' },
  { key: 'campus',    label: 'Campus' },
  { key: 'equipo',    label: 'Equipo' },
  { key: 'mes',       label: 'Mes' },
  { key: 'consultor', label: 'Consultor' },
  { key: 'carrera',   label: 'Carrera' },
]

const PERIODOS = [
  { value: 'all', label: 'Todo el período' },
  { value: '7',   label: 'Últimos 7 días' },
  { value: '30',  label: 'Últimos 30 días' },
  { value: '90',  label: 'Últimos 90 días' },
]

export default function Header({ sbStatus, filters, filterOptions, lastUpdate, onFilterChange, onSbClick }: Props) {
  return (
    <div className="header-bar px-6 py-3">
      <div className="max-w-screen-2xl mx-auto">
        {/* Top row: Logo + status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="#F4721E" strokeWidth="2"/>
                <path d="M7 19 L14 9 L21 19" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M10 19 L18 19" stroke="#F4721E" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div className="text-white/50 text-xs font-semibold uppercase tracking-widest">Universidad de las Américas</div>
              <div className="text-white text-lg font-black tracking-tight">Dashboard CRM · Call Center Admisiones</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSbClick}
              className="flex items-center text-white/60 text-xs font-semibold hover:text-white transition-colors"
            >
              <span className={`sb-status-dot ${sbStatus}`} />
              Supabase: {sbStatus === 'connected' ? 'conectado' : sbStatus === 'error' ? 'error' : 'desconectado'}
            </button>
            {lastUpdate && <span className="text-white/40 text-xs">Act: {lastUpdate}</span>}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider mr-1">Filtros:</span>
          {FILTER_CONFIG.map(({ key, label }) => (
            <select
              key={key}
              className="filter-select text-xs py-1 px-2"
              value={(filters as Record<string, string>)[key]}
              onChange={e => onFilterChange(key, e.target.value)}
            >
              <option value="all">— {label} —</option>
              {filterOptions[key]?.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}

          <select
            className="filter-select text-xs py-1 px-2"
            value={filters.periodo}
            onChange={e => onFilterChange('periodo', e.target.value)}
          >
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {Object.entries(filters).some(([k, v]) => k !== 'periodo' && v !== 'all') && (
            <button
              onClick={() => {
                const reset: Filters = { estado: 'all', consultor: 'all', carrera: 'all', campus: 'all', equipo: 'all', mes: 'all', periodo: 'all' }
                Object.entries(reset).forEach(([k, v]) => onFilterChange(k, v))
              }}
              className="text-xs text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
