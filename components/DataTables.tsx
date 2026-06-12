'use client'
import { ColMap } from './Dashboard'
import { LeadRow } from '@/lib/dataUtils'
import { getVal, norm } from '@/lib/dataUtils'

interface Props { data: LeadRow[]; cols: ColMap }

const ORANGE = '#F4721E'

function pct(n: number, d: number) { return d > 0 ? (n / d * 100).toFixed(1) : '0.0' }
function Bar({ p }: { p: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-[90px]">
      <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${p}%` }} /></div>
      <span className="text-xs font-bold w-10 text-right">{p}%</span>
    </div>
  )
}

function Badge({ n, color }: { n: number; color: string }) {
  return <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: color + '22', color }}>{n}</span>
}

export default function DataTables({ data, cols }: Props) {

  // ── Pivot consultores ───────────────────────────────────────────────────
  const cPivot: Record<string, { total: number; mat: number; pipeline: number; nc: number; perdidos: number; llamadas: number; llamCnt: number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'consultor', cols) || 'Sin asignar'
    const e = norm(getVal(row, 'estado', cols) || '')
    if (!cPivot[c]) cPivot[c] = { total: 0, mat: 0, pipeline: 0, nc: 0, perdidos: 0, llamadas: 0, llamCnt: 0 }
    cPivot[c].total++
    if (e.includes('matriculad'))                                                               cPivot[c].mat++
    else if (e.includes('indeciso') || e.includes('volver a llamar') || e.includes('viene') || e.includes('devolver llamado')) cPivot[c].pipeline++
    else if (e.includes('no contactado') || e.includes('no contesta'))                         cPivot[c].nc++
    else                                                                                        cPivot[c].perdidos++
    const lc = cols['llamadas']
    if (lc) { const v = parseFloat(String(row[lc] ?? '')); if (!isNaN(v)) { cPivot[c].llamadas += v; cPivot[c].llamCnt++ } }
  })

  // ── Pivot carreras ──────────────────────────────────────────────────────
  const rPivot: Record<string, { total: number; mat: number; pipeline: number; nc: number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'carrera', cols) || 'Sin carrera'
    const e = norm(getVal(row, 'estado', cols) || '')
    if (!rPivot[c]) rPivot[c] = { total: 0, mat: 0, pipeline: 0, nc: 0 }
    rPivot[c].total++
    if (e.includes('matriculad')) rPivot[c].mat++
    else if (e.includes('indeciso') || e.includes('volver a llamar') || e.includes('viene') || e.includes('devolver llamado')) rPivot[c].pipeline++
    else if (e.includes('no contactado') || e.includes('no contesta')) rPivot[c].nc++
  })

  const consultores = Object.entries(cPivot).sort((a, b) => b[1].mat - a[1].mat)
  const carreras    = Object.entries(rPivot).sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="space-y-4">

      {/* ── Ranking Consultores ─────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="section-title mb-1">Ranking Consultores — Desempeño Individual</div>
        <p className="text-xs text-gray-400 mb-3">Ordenado por matrículas · Avg. llamadas calculado sobre citas con dato disponible</p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Consultor</th>
                <th>Total Citas</th>
                <th>Matriculadas</th>
                <th>% Conv.</th>
                <th>Pipeline</th>
                <th>No Contact.</th>
                <th>Perdidos</th>
                <th>Avg Llamadas</th>
              </tr>
            </thead>
            <tbody>
              {consultores.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-400 py-6">Sin datos</td></tr>
              ) : consultores.map(([name, v], i) => {
                const p = pct(v.mat, v.total)
                const avgL = v.llamCnt > 0 ? (v.llamadas / v.llamCnt).toFixed(1) : '—'
                const isMvp = i < 3
                return (
                  <tr key={name}>
                    <td className="font-bold text-center" style={{ color: i === 0 ? '#F4721E' : i === 1 ? '#9CA3AF' : i === 2 ? '#D97706' : undefined }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className="font-medium">{isMvp ? <strong>{name}</strong> : name}</td>
                    <td>{v.total}</td>
                    <td><Badge n={v.mat} color={ORANGE} /></td>
                    <td><Bar p={p} /></td>
                    <td><Badge n={v.pipeline} color="#F59E0B" /></td>
                    <td><Badge n={v.nc} color="#9CA3AF" /></td>
                    <td><Badge n={v.perdidos} color="#EF4444" /></td>
                    <td className="text-xs font-bold text-blue-600">{avgL}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top Carreras ────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="section-title mb-1">Ranking Carreras — Demanda y Conversión</div>
        <p className="text-xs text-gray-400 mb-3">Ordenado por volumen total de citas · % conversión = matriculadas / total</p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Carrera / Programa</th>
                <th>Total Citas</th>
                <th>Matriculadas</th>
                <th>% Conv.</th>
                <th>Pipeline</th>
                <th>No Contactado</th>
                <th>Otros</th>
              </tr>
            </thead>
            <tbody>
              {carreras.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-6">Sin datos</td></tr>
              ) : carreras.map(([car, v], i) => {
                const p = pct(v.mat, v.total)
                const otros = v.total - v.mat - v.pipeline - v.nc
                return (
                  <tr key={car}>
                    <td className="font-bold text-center text-gray-400 text-xs">{i + 1}</td>
                    <td className="font-medium text-xs">{car}</td>
                    <td className="font-bold">{v.total}</td>
                    <td><Badge n={v.mat} color={ORANGE} /></td>
                    <td><Bar p={p} /></td>
                    <td><Badge n={v.pipeline} color="#F59E0B" /></td>
                    <td><Badge n={v.nc} color="#9CA3AF" /></td>
                    <td className="text-xs text-gray-400">{otros > 0 ? otros : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
