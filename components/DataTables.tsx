'use client'
import { LeadRow, ColMap } from './Dashboard'
import { getVal, norm, colorForStatus } from '@/lib/dataUtils'

interface Props { data: LeadRow[]; cols: ColMap }

const ORANGE = '#F4721E'

export default function DataTables({ data, cols }: Props) {
  // ── Carrera pivot ──────────────────────────────────────────────────────────
  const carreraPivot: Record<string, { total: number; mat: number; proceso: number; sin: number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'carrera', cols) || 'Sin carrera'
    const e = norm(getVal(row, 'estado', cols) || 'Sin estado')
    if (!carreraPivot[c]) carreraPivot[c] = { total: 0, mat: 0, proceso: 0, sin: 0 }
    carreraPivot[c].total++
    if (e.includes('matricul')) carreraPivot[c].mat++
    else if (e.includes('proceso') || e.includes('interesad')) carreraPivot[c].proceso++
    else carreraPivot[c].sin++
  })

  // ── Consultor pivot ────────────────────────────────────────────────────────
  const consultorPivot: Record<string, { total: number; mat: number; proceso: number; citas: number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'consultor', cols) || 'Sin asignar'
    const e = norm(getVal(row, 'estado', cols) || '')
    if (!consultorPivot[c]) consultorPivot[c] = { total: 0, mat: 0, proceso: 0, citas: 0 }
    consultorPivot[c].total++
    if (e.includes('matricul')) consultorPivot[c].mat++
    if (e.includes('proceso')) consultorPivot[c].proceso++
    const cc = cols['citas']
    if (cc) { const v = parseFloat(String(row[cc] ?? '')); if (!isNaN(v)) consultorPivot[c].citas += v }
    else consultorPivot[c].citas++
  })

  const pct = (mat: number, total: number) => total > 0 ? ((mat / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4">
      {/* Tabla Carrera */}
      <div className="card p-5">
        <div className="section-title mb-3">Tabla: Carrera vs Estado Matrícula y % Conversión</div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Carrera</th><th>Leads</th><th>Matriculados</th>
                <th>% Conversión</th><th>En Proceso</th><th>Sin Matrícula</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(carreraPivot).length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">Sin datos</td></tr>
              ) : Object.entries(carreraPivot)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([car, v]) => {
                    const p = pct(v.mat, v.total)
                    return (
                      <tr key={car}>
                        <td className="font-medium">{car}</td>
                        <td>{v.total}</td>
                        <td><span className="font-bold" style={{ color: ORANGE }}>{v.mat}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress-bar" style={{ width: 80 }}>
                              <div className="progress-fill" style={{ width: `${p}%` }} />
                            </div>
                            <span className="text-xs font-bold">{p}%</span>
                          </div>
                        </td>
                        <td>{v.proceso}</td>
                        <td>{v.sin}</td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla Consultor */}
      <div className="card p-5">
        <div className="section-title mb-3">Tabla: Leads por Consultor vs Estado Matrícula</div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Consultor</th><th>Leads</th><th>Matriculados</th>
                <th>% Conv.</th><th>Citas</th><th>En Proceso</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(consultorPivot).length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">Sin datos</td></tr>
              ) : Object.entries(consultorPivot)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([cons, v]) => {
                    const p = pct(v.mat, v.total)
                    return (
                      <tr key={cons}>
                        <td className="font-medium">{cons} {parseFloat(p) >= 20 ? '⭐' : ''}</td>
                        <td>{v.total}</td>
                        <td><span className="font-bold" style={{ color: ORANGE }}>{v.mat}</span></td>
                        <td><span className="font-bold">{p}%</span></td>
                        <td>{v.citas}</td>
                        <td>{v.proceso}</td>
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
