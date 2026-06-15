'use client'
import { CCKpiResult, Semaforo, semaforo, SEMAFORO_COLORS, META_DEFAULT, MetaCC } from '@/lib/ccDataUtils'

interface CCKpisProps {
  kpis: CCKpiResult
  meta?: MetaCC
}

function semColor(s: Semaforo) {
  return SEMAFORO_COLORS[s]
}

function KpiCard({
  label, value, sub, sem, barPct, borderColor, note,
}: {
  label: string; value: string; sub?: string; sem?: Semaforo
  barPct?: number; borderColor?: string; note?: string
}) {
  const sc = sem ? semColor(sem) : null
  const border = borderColor || (sc ? sc.text : 'var(--udla-orange)')
  return (
    <div className="card p-4" style={{ borderLeft: `4px solid ${border}` }}>
      <div className="kpi-label mb-1">{label}</div>
      <div className="kpi-value" style={{ color: sc ? sc.text : 'var(--udla-gray)' }}>{value}</div>
      {sem && <div className="mt-1 text-xs font-semibold" style={{ color: sc!.text }}>{sc!.label}</div>}
      {sub  && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
      {note && <div className="mt-0.5 text-xs" style={{ color: sc ? sc.text : '#9CA3AF' }}>{note}</div>}
      {barPct !== undefined && (
        <div className="progress-bar mt-2">
          <div className="progress-fill" style={{ width: `${Math.min(barPct, 100)}%`, background: sc ? sc.text : 'var(--udla-orange)' }} />
        </div>
      )}
    </div>
  )
}

function FunnelArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center" style={{ minWidth: 44 }}>
      <div className="text-center">
        <div style={{ color: 'var(--udla-orange)', fontSize: 18, fontWeight: 900 }}>▼</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{label}</div>
      </div>
    </div>
  )
}

export default function CCKpis({ kpis, meta = META_DEFAULT }: CCKpisProps) {
  const semCont = semaforo(kpis.contactabilidad, meta.contactabilidad)
  const semCita = semaforo(kpis.convContCita,    meta.convContCita)
  const semAf   = semaforo(kpis.convCitaAf,      meta.convCitaAf)
  const semMat  = semaforo(kpis.convAfMat,        meta.convAfMat)

  return (
    <div className="space-y-3">

      {/* ── Fila 1: Embudo completo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr auto 1fr', gap: 8, alignItems: 'center' }}>
        <KpiCard label="1 · Recorridos"     value={kpis.total.toLocaleString('es-CL')}       sub="Total leads base"                        borderColor="#6B7280" />
        <FunnelArrow label={`${kpis.contactabilidad.toFixed(1)}%`} />
        <KpiCard label="2 · Contactados"    value={kpis.contactados.toLocaleString('es-CL')} sub={`${kpis.noContactados.toLocaleString('es-CL')} sin contacto`} sem={semCont} barPct={(kpis.contactados/Math.max(kpis.total,1))*100} note={`Meta cont.: ${meta.contactabilidad}%`} />
        <FunnelArrow label={`${kpis.convContCita.toFixed(1)}%`} />
        <KpiCard label="3 · Citas (Viene)"  value={kpis.citas.toLocaleString('es-CL')}       sub="Interesa = Viene"                        sem={semCita} barPct={(kpis.citas/Math.max(kpis.contactados,1))*100} note={`Meta conv: ${meta.convContCita}%`} />
        <FunnelArrow label={`${kpis.convCitaAf.toFixed(1)}%`} />
        <KpiCard label="4 · Afluencia (A+M+MC)" value={kpis.afluencias.toLocaleString('es-CL')} sub="Asistieron a cita"                  sem={semAf}  barPct={(kpis.afluencias/Math.max(kpis.citas,1))*100}       note={`Meta conv: ${meta.convCitaAf}%`}  borderColor="#7C3AED" />
        <FunnelArrow label={`${kpis.convAfMat.toFixed(1)}%`} />
        <KpiCard label="5 · Matrículas (M+MC)" value={kpis.matriculas.toLocaleString('es-CL')} sub="Matrícula confirmada"                 sem={semMat} barPct={(kpis.matriculas/Math.max(kpis.afluencias,1))*100}  note={`Meta conv: ${meta.convAfMat}%`}   borderColor="#16A34A" />
      </div>

      {/* ── Fila 2: Tasas de conversión + Productividad ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
        <KpiCard label="6 · Contactabilidad"    value={`${kpis.contactabilidad.toFixed(1)}%`} sub="Contactados / Recorridos" sem={semCont} barPct={(kpis.contactabilidad/meta.contactabilidad)*100} note={`Meta: ${meta.contactabilidad}%`} />
        <KpiCard label="7 · Conv Cont → Cita"   value={`${kpis.convContCita.toFixed(1)}%`}   sub="Viene / Contactados"      sem={semCita} barPct={(kpis.convContCita/meta.convContCita)*100}       note={`Meta: ${meta.convContCita}%`} />
        <KpiCard label="8 · Conv Cita → Afluencia" value={`${kpis.convCitaAf.toFixed(1)}%`}  sub="Afluencia / Citas"        sem={semAf}  barPct={(kpis.convCitaAf/meta.convCitaAf)*100}           note={`Meta: ${meta.convCitaAf}%`} borderColor="#7C3AED" />
        <KpiCard label="9 · Conv AF → Matrícula" value={`${kpis.convAfMat.toFixed(1)}%`}     sub="Matrículas / Afluencia"   sem={semMat} barPct={(kpis.convAfMat/meta.convAfMat)*100}               note={`Meta: ${meta.convAfMat}%`}  borderColor="#16A34A" />
        <div className="card p-4" style={{ borderLeft: '4px solid var(--udla-orange)' }}>
          <div className="kpi-label mb-1">10 · Conv Final Lead → Mat</div>
          <div className="kpi-value" style={{ color: 'var(--udla-orange)' }}>{kpis.convLeadMat.toFixed(2)}%</div>
          <div className="mt-0.5 text-xs text-gray-400">Matrículas / Recorridos</div>
          <div className="progress-bar mt-2">
            <div className="progress-fill" style={{ width: `${Math.min(kpis.convLeadMat * 10, 100)}%` }} />
          </div>
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid #F0F0F5' }}>
            <div className="text-xs font-bold text-gray-500">Productividad</div>
            <div className="text-base font-extrabold" style={{ color: 'var(--udla-gray)' }}>{kpis.productividad.toFixed(0)} rec/ejec</div>
            <div className="text-xs text-gray-400">{kpis.ejecutivos} ejecutivos activos</div>
          </div>
        </div>
      </div>

    </div>
  )
}
