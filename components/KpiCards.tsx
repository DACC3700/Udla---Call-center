'use client'
import { ColMap } from './Dashboard'
import { LeadRow, getVal, norm } from '@/lib/dataUtils'

interface Props { data: LeadRow[]; cols: ColMap; rawTotal: number }

function KpiCard({ label, value, sub, color = '#F4721E', badge, progress }:
  { label: string; value: string; sub: string; color?: string; badge?: string; progress?: number }) {
  return (
    <div className="card kpi-card p-4 flex flex-col gap-1 min-w-0">
      <div className="kpi-label">{label}</div>
      <div className="flex items-end gap-2">
        <div className="kpi-value" style={{ color }}>{value}</div>
        {badge && (
          <span className="mb-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>
            {badge}
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="progress-bar mt-1">
          <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  )
}

export default function KpiCards({ data, cols, rawTotal }: Props) {
  const total = data.length

  // Conteos por estado
  let matriculadas = 0, indecisos = 0, volverLlamar = 0, noContactados = 0, viene = 0, noViene = 0
  let totalLlamadas = 0, llamadasCount = 0

  data.forEach(row => {
    const e = norm(getVal(row, 'estado', cols) || '')
    if (e.includes('matriculad'))        matriculadas++
    else if (e.includes('indeciso'))     indecisos++
    else if (e.includes('volver a llamar') || e.includes('devolver llamado')) volverLlamar++
    else if (e.includes('no contactado') || e.includes('no contesta')) noContactados++
    else if (e === 'viene' || e.includes('afluencia')) viene++
    else if (e.includes('no viene') || e.includes('evalua otra') || e.includes('no califica')) noViene++

    const llamCol = cols['llamadas']
    if (llamCol) {
      const v = parseFloat(String(row[llamCol] ?? ''))
      if (!isNaN(v)) { totalLlamadas += v; llamadasCount++ }
    }
  })

  const pipeline   = indecisos + volverLlamar + viene
  const convPct    = total > 0 ? (matriculadas / total * 100) : 0
  const avgLlamadas = llamadasCount > 0 ? (totalLlamadas / llamadasCount) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard
        label="Total Citas"
        value={total.toLocaleString('es-CL')}
        sub={rawTotal !== total ? `de ${rawTotal.toLocaleString('es-CL')} total` : 'registros en el período'}
        color="#2B2D42"
      />
      <KpiCard
        label="Matriculadas"
        value={matriculadas.toLocaleString('es-CL')}
        sub={`${convPct.toFixed(1)}% de conversión`}
        badge={`${convPct.toFixed(1)}%`}
        progress={convPct}
        color="#F4721E"
      />
      <KpiCard
        label="Pipeline Activo"
        value={pipeline.toLocaleString('es-CL')}
        sub={`${indecisos} indecisos · ${volverLlamar} a rellamar`}
        color="#F59E0B"
        badge={total > 0 ? `${(pipeline / total * 100).toFixed(0)}%` : undefined}
      />
      <KpiCard
        label="No Contactados"
        value={noContactados.toLocaleString('es-CL')}
        sub={total > 0 ? `${(noContactados / total * 100).toFixed(1)}% del total` : '—'}
        color="#9CA3AF"
      />
      <KpiCard
        label="No Vienen / Perdidos"
        value={noViene.toLocaleString('es-CL')}
        sub={`${viene} confirmaron visita`}
        color="#EF4444"
      />
      <KpiCard
        label="Promedio Llamadas"
        value={avgLlamadas > 0 ? avgLlamadas.toFixed(1) : '—'}
        sub={llamadasCount > 0 ? `sobre ${llamadasCount.toLocaleString('es-CL')} citas` : 'sin dato de llamadas'}
        color="#3B82F6"
      />
    </div>
  )
}
