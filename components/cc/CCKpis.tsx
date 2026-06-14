'use client'
import { CCKpiResult, Semaforo, semaforo, SEMAFORO_COLORS, META_DEFAULT } from '@/lib/ccDataUtils'

const ORANGE = '#F4721E', GRAY = '#2B2D42'

function KpiCard({
  label, value, sub, color = ORANGE, badge, progress, semColor,
}: {
  label: string; value: string; sub: string; color?: string
  badge?: string; progress?: number; semColor?: string
}) {
  return (
    <div className="card kpi-card p-4 flex flex-col gap-1 min-w-0" style={semColor ? { borderLeft: `4px solid ${semColor}` } : {}}>
      <div className="kpi-label">{label}</div>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="kpi-value" style={{ color }}>{value}</div>
        {badge && (
          <span className="mb-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>
            {badge}
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="progress-bar mt-1">
          <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: color }} />
        </div>
      )}
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  )
}

interface Props { kpis: CCKpiResult }

export default function CCKpis({ kpis }: Props) {
  const semCont  = semaforo(kpis.contactabilidad, META_DEFAULT.contactabilidad)
  const semConv  = semaforo(kpis.convContCita,    META_DEFAULT.convContCita)
  const semMat   = semaforo(kpis.convCitaMat,     META_DEFAULT.convCitaMat)

  const colSem = (s: Semaforo) => SEMAFORO_COLORS[s].text

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* Fila 1 */}
      <KpiCard
        label="Total Recorridos"
        value={kpis.total.toLocaleString('es-CL')}
        sub="Registros procesados"
        color={GRAY}
      />
      <KpiCard
        label="Contactados"
        value={kpis.contactados.toLocaleString('es-CL')}
        sub={`de ${kpis.total.toLocaleString('es-CL')} recorridos`}
        color="#22C55E"
        badge={`${kpis.contactabilidad.toFixed(1)}%`}
        progress={kpis.contactabilidad}
        semColor={colSem(semCont)}
      />
      <KpiCard
        label="No Contactados"
        value={kpis.noContactados.toLocaleString('es-CL')}
        sub={`${(100 - kpis.contactabilidad).toFixed(1)}% del total`}
        color="#9CA3AF"
      />
      <KpiCard
        label="% Contactabilidad"
        value={`${kpis.contactabilidad.toFixed(1)}%`}
        sub={`Meta: ${META_DEFAULT.contactabilidad}%`}
        color={colSem(semCont)}
        progress={kpis.contactabilidad}
        badge={SEMAFORO_COLORS[semCont].label.split(' ').slice(1).join(' ')}
        semColor={colSem(semCont)}
      />
      <KpiCard
        label="Total Citas"
        value={kpis.citas.toLocaleString('es-CL')}
        sub={`de ${kpis.contactados.toLocaleString('es-CL')} contactados`}
        color={ORANGE}
        badge={`${kpis.convContCita.toFixed(1)}%`}
        semColor={colSem(semConv)}
      />
      <KpiCard
        label="Conv. Cont. → Cita"
        value={`${kpis.convContCita.toFixed(1)}%`}
        sub={`Meta: ${META_DEFAULT.convContCita}%`}
        color={colSem(semConv)}
        progress={kpis.convContCita / META_DEFAULT.convContCita * 100}
        badge={SEMAFORO_COLORS[semConv].label.split(' ').slice(1).join(' ')}
        semColor={colSem(semConv)}
      />

      {/* Fila 2 */}
      <KpiCard
        label="Total Matrículas"
        value={kpis.matriculas.toLocaleString('es-CL')}
        sub={`de ${kpis.citas.toLocaleString('es-CL')} citas`}
        color="#7C3AED"
        badge={`${kpis.convCitaMat.toFixed(1)}%`}
        semColor={colSem(semMat)}
      />
      <KpiCard
        label="Conv. Cita → Matrícula"
        value={`${kpis.convCitaMat.toFixed(1)}%`}
        sub={`Meta: ${META_DEFAULT.convCitaMat}%`}
        color={colSem(semMat)}
        progress={kpis.convCitaMat / META_DEFAULT.convCitaMat * 100}
        badge={SEMAFORO_COLORS[semMat].label.split(' ').slice(1).join(' ')}
        semColor={colSem(semMat)}
      />
      <KpiCard
        label="Conv. Lead → Matrícula"
        value={`${kpis.convLeadMat.toFixed(1)}%`}
        sub="Conversión final global"
        color="#0EA5E9"
        progress={kpis.convLeadMat * 5}
      />
      <KpiCard
        label="Promedio Intentos"
        value={kpis.promedioIntentos > 0 ? kpis.promedioIntentos.toFixed(1) : '—'}
        sub="Llamadas por recorrido"
        color="#F59E0B"
      />
      <KpiCard
        label="Ejecutivos Activos"
        value={kpis.ejecutivos.toLocaleString('es-CL')}
        sub="En el período filtrado"
        color={GRAY}
      />
      <KpiCard
        label="Productividad"
        value={kpis.ejecutivos > 0 ? Math.round(kpis.total / kpis.ejecutivos).toLocaleString('es-CL') : '—'}
        sub="Recorridos/ejecutivo"
        color={ORANGE}
      />
    </div>
  )
}
