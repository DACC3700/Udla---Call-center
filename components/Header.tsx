'use client'
import { SbStatus, Filters } from './Dashboard'

interface Props {
  sbStatus: SbStatus
  filters: Filters
  filterOptions: Record<string, string[]>
  lastUpdate: string | null
  onFilterChange: (key: string, value: string) => void
  onSbClick: () => void
}

const filterConfig = [
  { key: 'estado',    label: 'Todos los estados' },
  { key: 'consultor', label: 'Todos los consultores' },
  { key: 'carrera',   label: 'Todas las carreras' },
]

const periodos = [
  { value: 'all', label: 'Todo el período' },
  { value: '7',   label: 'Últimos 7 días' },
  { value: '30',  label: 'Últimos 30 días' },
  { value: '90',  label: 'Últimos 90 días' },
]

export default function Header({ sbStatus, filters, filterOptions, lastUpdate, onFilterChange, onSbClick }: Props) {
  return (
    <div className="header-bar px-6 py-4">
      <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Logo + Title */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#F4721E" strokeWidth="2"/>
              <path d="M7 19 L14 9 L21 19" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M10 19 L18 19" stroke="#F4721E" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-widest">Universidad de las Américas</div>
            <div className="text-white text-xl font-black tracking-tight">Dashboard CRM · Admisiones</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Supabase status button */}
          <button
            onClick={onSbClick}
            className="flex items-center text-white/60 text-xs font-semibold cursor-pointer hover:text-white transition-colors"
          >
            <span className={`sb-status-dot ${sbStatus}`} />
            Supabase: {sbStatus === 'connected' ? 'conectado' : sbStatus === 'error' ? 'error' : 'desconectado'}
          </button>

          <div className="w-px h-5 bg-white/20" />

          {/* Filters */}
          {filterConfig.map(({ key, label }) => (
            <select
              key={key}
              className="filter-select text-sm"
              value={(filters as Record<string, string>)[key]}
              onChange={e => onFilterChange(key, e.target.value)}
            >
              <option value="all">{label}</option>
              {filterOptions[key]?.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}

          <select
            className="filter-select text-sm"
            value={filters.periodo}
            onChange={e => onFilterChange('periodo', e.target.value)}
          >
            {periodos.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {lastUpdate && (
            <span className="text-white/50 text-xs">Actualizado: {lastUpdate}</span>
          )}
        </div>
      </div>
    </div>
  )
}
