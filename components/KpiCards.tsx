'use client'
import { ColMap } from './Dashboard'
import { LeadRow, getVal, parseDate, colorForStatus, norm } from '@/lib/dataUtils'

interface Props {
  data: LeadRow[]
  cols: ColMap
}

export default function KpiCards({ data, cols }: Props) {
  const total = data.length

  // Estado counts
  const estadoCounts: Record<string, number> = {}
  data.forEach(row => {
    const e = getVal(row, 'estado', cols) || 'Sin estado'
    estadoCounts[e] = (estadoCounts[e] || 0) + 1
  })
  const topEstados = Object.entries(estadoCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)

  // Conversión
  const matriculados = data.filter(r => norm(getVal(r, 'estado', cols) || '').includes('matricul')).length
  const pct = total > 0 ? ((matriculados / total) * 100).toFixed(1) : '0.0'

  // Citas
  const citasCol = cols['citas']
  let totalCitas = 0
  if (citasCol) data.forEach(r => { const v = parseFloat(String(r[citasCol] ?? '')); if (!isNaN(v)) totalCitas += v })
  else totalCitas = total
  const consultores = new Set(data.map(r => getVal(r, 'consultor', cols)).filter(Boolean))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Leads Totales */}
      <div className="card kpi-card p-5">
        <div className="kpi-label">Leads Totales</div>
        <div className="kpi-value mt-1">{total.toLocaleString()}</div>
        <div className="text-sm text-gray-500 mt-1">registros en el período</div>
      </div>

      {/* Estado Matrícula */}
      <div className="card kpi-card p-5">
        <div className="kpi-label">Estado Matrícula</div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {topEstados.length > 0 ? topEstados.map(([k, v]) => (
            <div key={k}>
              <div className="text-xl font-black" style={{ color: colorForStatus(k) }}>{v}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k}</div>
            </div>
          )) : <div className="text-gray-400 text-sm">—</div>}
        </div>
      </div>

      {/* Conversión */}
      <div className="card kpi-card p-5">
        <div className="kpi-label">% Conversión (Matrículas / Leads)</div>
        <div className="kpi-value mt-1">{pct}%</div>
        <div className="progress-bar mt-3">
          <div className="progress-fill" style={{ width: `${Math.min(parseFloat(pct), 100)}%` }} />
        </div>
        <div className="text-sm text-gray-500 mt-1">{matriculados} matriculados de {total} leads</div>
      </div>

      {/* Citas */}
      <div className="card kpi-card p-5">
        <div className="kpi-label">Citas Agendadas</div>
        <div className="kpi-value mt-1">{totalCitas.toLocaleString()}</div>
        <div className="text-sm text-gray-500 mt-1">{consultores.size} consultores activos</div>
      </div>
    </div>
  )
}
