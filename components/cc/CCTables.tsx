'use client'
import type { ReactNode } from 'react'
import {
  EjecutivoStats, RegimenStats, CarreraStats, BaseStats,
  CausaStats, Proyeccion, Insight,
  SEMAFORO_COLORS, Semaforo,
} from '@/lib/ccDataUtils'

const ORANGE = '#F4721E'

function pct(n: number) { return n.toFixed(1) + '%' }

function Bar({ value, max = 100, color = ORANGE }: { value: number; max?: number; color?: string }) {
  const w = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${w}%`, background: color }} /></div>
      <span className="text-xs font-bold w-9 text-right">{value.toFixed(1)}%</span>
    </div>
  )
}

function Sem({ s }: { s: Semaforo }) {
  const c = SEMAFORO_COLORS[s]
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: c.bg, color: c.text }}>
      {c.label.split(' ')[0]}
    </span>
  )
}

function Badge({ n, color }: { n: number | string; color: string }) {
  return <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: color + '22', color }}>{n}</span>
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title mb-1">{children}</div>
}

// ── 1. Ranking Ejecutivos ─────────────────────────────────────────────────────
export function EjecutivoTable({ data }: { data: EjecutivoStats[] }) {
  return (
    <div className="card p-5">
      <SectionTitle>Ranking Ejecutivos — Desempeño Individual con Semáforo</SectionTitle>
      <p className="text-xs text-gray-400 mb-3">Ordenado por matrículas · 🟢 Sobre meta · 🟡 Cerca · 🔴 Bajo desempeño</p>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ejecutivo / Agente</th>
              <th>Recorridos</th>
              <th>Contactados</th>
              <th>Citas (Viene)</th>
              <th>Afluencia (A+M+MC)</th>
              <th>Matrículas (M+MC)</th>
              <th>Contactab. %</th>
              <th>Cont→Cita %</th>
              <th>Cita→AF %</th>
              <th>AF→Mat %</th>
              <th>Conv Final %</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={13} className="text-center text-gray-400 py-6">Sin datos</td></tr>
            ) : data.map((e, i) => (
              <tr key={e.nombre}>
                <td className="font-bold text-center text-sm">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="font-medium text-sm">{i < 3 ? <strong>{e.nombre}</strong> : e.nombre}</td>
                <td className="font-bold">{e.recorridos.toLocaleString('es-CL')}</td>
                <td><Badge n={e.contactados} color="#22C55E" /></td>
                <td><Badge n={e.citas}       color={ORANGE} /></td>
                <td><Badge n={e.afluencias}  color="#7C3AED" /></td>
                <td><Badge n={e.matriculas}  color="#16A34A" /></td>
                <td>
                  <div className="flex items-center gap-1">
                    <Sem s={e.semCont} />
                    <Bar value={e.contactabilidad} color="#22C55E" />
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Sem s={e.semConv} />
                    <Bar value={e.convContCita} color={ORANGE} />
                  </div>
                </td>
                <td><Bar value={e.convCitaAf}  color="#7C3AED" /></td>
                <td>
                  <div className="flex items-center gap-1">
                    <Sem s={e.semMat} />
                    <Bar value={e.convAfMat} color="#16A34A" />
                  </div>
                </td>
                <td className="text-xs font-bold text-blue-600">{e.convFinal.toFixed(2)}%</td>
                <td>
                  {e.semCont === 'verde' && e.semConv === 'verde' && e.semMat === 'verde' ? (
                    <span className="text-xs font-bold text-green-600">Top Performer</span>
                  ) : e.semCont === 'rojo' || e.semMat === 'rojo' ? (
                    <span className="text-xs font-bold text-red-600">Requiere coaching</span>
                  ) : (
                    <span className="text-xs text-gray-400">En desarrollo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 2. Análisis por Régimen ───────────────────────────────────────────────────
export function RegimenTable({ data }: { data: RegimenStats[] }) {
  const maxCitas = Math.max(...data.map(r => r.citas), 1)
  return (
    <div className="card p-5">
      <SectionTitle>Análisis por Régimen</SectionTitle>
      <p className="text-xs text-gray-400 mb-3">Online · Executive · Semipresencial · Vespertino · Diurno — ¿qué régimen genera más citas? ¿cuál convierte mejor?</p>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Régimen</th>
              <th>Recorridos</th>
              <th>Contactados</th>
              <th>Citas (Viene)</th>
              <th>Afluencia (A+M+MC)</th>
              <th>Matrículas (M+MC)</th>
              <th>Contactab. %</th>
              <th>Cont→Cita %</th>
              <th>Cita→AF %</th>
              <th>AF→Mat %</th>
              <th>Conv Final %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.regimen}>
                <td className="font-medium">{r.regimen}</td>
                <td>{r.recorridos.toLocaleString('es-CL')}</td>
                <td>{r.contactados}</td>
                <td><Badge n={r.citas}      color={ORANGE} /></td>
                <td><Badge n={r.afluencias} color="#7C3AED" /></td>
                <td><Badge n={r.matriculas} color="#16A34A" /></td>
                <td><Bar value={r.contactabilidad} color="#22C55E" /></td>
                <td><Bar value={r.convContCita}     color={ORANGE} /></td>
                <td><Bar value={r.convCitaAf}       color="#7C3AED" /></td>
                <td><Bar value={r.convAfMat}         color="#16A34A" /></td>
                <td><Bar value={r.convFinal}          color="#0EA5E9" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
        <span>🏆 Más citas: <strong className="text-gray-700">{[...data].sort((a,b) => b.citas - a.citas)[0]?.regimen || '—'}</strong></span>
        <span>🎯 Mejor conversión: <strong className="text-gray-700">{[...data].sort((a,b) => b.convFinal - a.convFinal)[0]?.regimen || '—'}</strong></span>
        <span>⚠️ Requiere intervención: <strong className="text-red-600">{data.filter(r => r.convFinal < 2 && r.recorridos > 10)[0]?.regimen || 'Ninguno'}</strong></span>
      </div>
    </div>
  )
}

// ── 3. Análisis por Carrera ───────────────────────────────────────────────────
export function CarreraTable({ data }: { data: CarreraStats[] }) {
  const sorted = [...data].sort((a, b) => b.citas - a.citas)
  const topMat  = [...data].sort((a, b) => b.matriculas - a.matriculas)[0]
  const topConv = [...data].sort((a, b) => b.convFinal - a.convFinal)[0]
  const altaBaja = data.filter(c => c.recorridos > 20 && c.convFinal < 2)

  return (
    <div className="card p-5">
      <SectionTitle>Análisis por Carrera / Programa</SectionTitle>
      <p className="text-xs text-gray-400 mb-3">Ordenado por citas · Rankings: top por citas, matrículas, conversión · Detecta brechas</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-orange-50 rounded-lg p-3"><div className="text-xs text-gray-500">Más citas</div><div className="font-bold text-orange-600 text-sm">{sorted[0]?.carrera.substring(0,28) || '—'}</div></div>
        <div className="bg-purple-50 rounded-lg p-3"><div className="text-xs text-gray-500">Más matrículas</div><div className="font-bold text-purple-600 text-sm">{topMat?.carrera.substring(0,28) || '—'}</div></div>
        <div className="bg-green-50 rounded-lg p-3"><div className="text-xs text-gray-500">Mejor efectividad</div><div className="font-bold text-green-600 text-sm">{topConv?.carrera.substring(0,28) || '—'}</div></div>
        <div className="bg-red-50 rounded-lg p-3"><div className="text-xs text-gray-500">Alto recorrido / baja conv.</div><div className="font-bold text-red-600 text-sm">{altaBaja[0]?.carrera.substring(0,28) || 'Ninguna'}</div></div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Carrera / Programa</th>
              <th>Recorridos</th>
              <th>Contactados</th>
              <th>Citas (Viene)</th>
              <th>Afluencia (A+M+MC)</th>
              <th>Matrículas (M+MC)</th>
              <th>Contactab. %</th>
              <th>Cont→Cita %</th>
              <th>Cita→AF %</th>
              <th>AF→Mat %</th>
              <th>Conv Final %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={c.carrera} className={altaBaja.includes(c) ? 'bg-red-50' : ''}>
                <td className="font-bold text-center text-gray-400 text-xs">{i + 1}</td>
                <td className="font-medium text-xs">{c.carrera}</td>
                <td>{c.recorridos.toLocaleString('es-CL')}</td>
                <td>{c.contactados}</td>
                <td><Badge n={c.citas}       color={ORANGE} /></td>
                <td><Badge n={c.afluencias}  color="#7C3AED" /></td>
                <td><Badge n={c.matriculas}  color="#16A34A" /></td>
                <td><Bar value={c.contactabilidad} color="#22C55E" /></td>
                <td><Bar value={c.convContCita}     color={ORANGE} /></td>
                <td><Bar value={c.convCitaAf}       color="#7C3AED" /></td>
                <td><Bar value={c.convAfMat}         color="#16A34A" /></td>
                <td><Bar value={c.convFinal}          color="#0EA5E9" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 4. Tipo Base ──────────────────────────────────────────────────────────────
export function BaseTable({ data }: { data: BaseStats[] }) {
  return (
    <div className="card p-5">
      <SectionTitle>Análisis por Tipo de Base</SectionTitle>
      <p className="text-xs text-gray-400 mb-3">Lead · Stock · Inbound · C2C · WhatsApp — mejor y peor fuente</p>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo Base</th>
              <th>Recorridos</th>
              <th>Contactados</th>
              <th>Citas (Viene)</th>
              <th>Afluencia (A+M+MC)</th>
              <th>Matrículas (M+MC)</th>
              <th>Contactab. %</th>
              <th>Cont→Cita %</th>
              <th>Cita→AF %</th>
              <th>Conv Final %</th>
              <th>Ranking</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b, i) => (
              <tr key={b.base}>
                <td className="font-medium">{b.base}</td>
                <td>{b.recorridos.toLocaleString('es-CL')}</td>
                <td>{b.contactados}</td>
                <td><Badge n={b.citas}       color={ORANGE} /></td>
                <td><Badge n={b.afluencias}  color="#7C3AED" /></td>
                <td><Badge n={b.matriculas}  color="#16A34A" /></td>
                <td><Bar value={b.contactabilidad} color="#22C55E" /></td>
                <td><Bar value={b.convContCita}     color={ORANGE} /></td>
                <td><Bar value={b.convCitaAf}       color="#7C3AED" /></td>
                <td><Bar value={b.convFinal}          color="#0EA5E9" /></td>
                <td>
                  {i === 0 ? <Badge n="🏆 Mejor" color="#22C55E" /> : i === data.length - 1 ? <Badge n="⚠️ Peor" color="#EF4444" /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 5. Causa Raíz ─────────────────────────────────────────────────────────────
export function CausaRaizTable({ noCita, noMat }: { noCita: CausaStats[]; noMat: CausaStats[] }) {
  const CAUSA_COLORS: Record<string, string> = {
    'No contesta':         '#9CA3AF',
    'Buzón de voz':        '#6B7280',
    'Corta llamado':       '#DC2626',
    'No interesado':       '#EF4444',
    'Carrera no disponible': '#F59E0B',
    'Lo está evaluando':   '#3B82F6',
    'Espera documentación':'#06B6D4',
    'Fono fuera de servicio': '#6B7280',
    'No contactado':       '#D1D5DB',
    'Indeciso':            '#F59E0B',
    'Evaluando otra opción':'#A855F7',
    'Falta documentación': '#06B6D4',
    'No vino a cita':      '#EF4444',
    'Motivo económico':    '#84CC16',
    'Otro proceso':        '#78716C',
    'Otros':               '#D1D5DB',
  }

  function CausaRow({ c }: { c: CausaStats }) {
    const col = CAUSA_COLORS[c.causa] || '#D1D5DB'
    return (
      <tr>
        <td className="font-medium text-sm">{c.causa}</td>
        <td className="font-bold">{c.count.toLocaleString('es-CL')}</td>
        <td>
          <div className="flex items-center gap-1.5">
            <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${Math.min(c.pct, 100)}%`, background: col }} /></div>
            <span className="text-xs font-bold w-9 text-right">{c.pct.toFixed(1)}%</span>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-5">
        <SectionTitle>Causas — Por qué no se agenda cita</SectionTitle>
        <p className="text-xs text-gray-400 mb-3">Principales razones de no conversión contactado → cita</p>
        <table className="data-table">
          <thead><tr><th>Causa</th><th>Cantidad</th><th>% del total no cita</th></tr></thead>
          <tbody>{noCita.slice(0, 10).map(c => <CausaRow key={c.causa} c={c} />)}</tbody>
        </table>
      </div>
      <div className="card p-5">
        <SectionTitle>Causas — Por qué no se matricula (post-cita)</SectionTitle>
        <p className="text-xs text-gray-400 mb-3">Principales razones de no conversión cita → matrícula</p>
        <table className="data-table">
          <thead><tr><th>Causa</th><th>Cantidad</th><th>% del total no mat.</th></tr></thead>
          <tbody>{noMat.slice(0, 10).map(c => <CausaRow key={c.causa} c={c} />)}</tbody>
        </table>
      </div>
    </div>
  )
}

// ── 6. Proyecciones ───────────────────────────────────────────────────────────
export function ProyeccionTable({ data }: { data: Proyeccion[] }) {
  const colors = ['#6B7280', ORANGE, '#22C55E']
  const icons  = ['📉', '📊', '🚀']
  return (
    <div className="card p-5">
      <SectionTitle>Proyecciones — Escenarios al Cierre del Período</SectionTitle>
      <p className="text-xs text-gray-400 mb-4">Basado en el ritmo actual del Call Center · Conservador (−15%) · Esperado · Optimista (+20%)</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.map((p, i) => (
          <div key={p.tipo} className="rounded-xl p-4 text-center" style={{ background: colors[i] + '15', border: `2px solid ${colors[i]}40` }}>
            <div className="text-2xl mb-1">{icons[i]}</div>
            <div className="font-black text-lg" style={{ color: colors[i] }}>{p.tipo}</div>
            <div className="mt-3 space-y-2">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Recorridos proy.</div>
                <div className="font-bold text-lg" style={{ color: colors[i] }}>{p.recorridos.toLocaleString('es-CL')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Citas proyectadas</div>
                <div className="font-bold text-xl" style={{ color: colors[i] }}>{p.citas.toLocaleString('es-CL')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Afluencia proyectada</div>
                <div className="font-bold" style={{ color: colors[i] }}>{p.afluencias.toLocaleString('es-CL')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Matrículas proyectadas</div>
                <div className="font-bold text-xl" style={{ color: colors[i] }}>{p.matriculas.toLocaleString('es-CL')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Conv. Final proy.</div>
                <div className="font-bold" style={{ color: colors[i] }}>{p.convFinal.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 7. Insights Automáticos ───────────────────────────────────────────────────
export function InsightsPanel({ data }: { data: Insight[] }) {
  const TYPE_CONFIG = {
    hallazgo:     { label: 'Hallazgo',      bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', icon: '🔍' },
    riesgo:       { label: 'Riesgo',        bg: '#FEF2F2', border: '#EF4444', text: '#DC2626', icon: '⚠️' },
    oportunidad:  { label: 'Oportunidad',   bg: '#F0FDF4', border: '#22C55E', text: '#15803D', icon: '✅' },
    recomendacion:{ label: 'Recomendación', bg: '#FFFBEB', border: '#F59E0B', text: '#B45309', icon: '💡' },
  }
  return (
    <div className="card p-5">
      <SectionTitle>Conclusiones Automáticas</SectionTitle>
      <p className="text-xs text-gray-400 mb-4">Generadas a partir de los datos cargados · Actualización automática al cambiar filtros</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Carga datos para generar conclusiones</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((ins, i) => {
            const cfg = TYPE_CONFIG[ins.tipo]
            return (
              <div key={i} className="rounded-xl p-4" style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{cfg.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.text }}>{cfg.label}</span>
                </div>
                <div className="font-semibold text-sm text-gray-800">{ins.titulo}</div>
                <div className="text-xs text-gray-600 mt-1">{ins.detalle}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
