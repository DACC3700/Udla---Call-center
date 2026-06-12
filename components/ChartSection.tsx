'use client'
import { useEffect, useRef } from 'react'
import { ColMap } from './Dashboard'
import { LeadRow, getVal, norm, colorForStatus, PALETTE, computeFunnel } from '@/lib/dataUtils'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Chart: any
  }
}

const ORANGE = '#F4721E', GRAY = '#2B2D42'

interface Props { data: LeadRow[]; cols: ColMap }

// ── Hook genérico ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useChart(id: string, data: LeadRow[], cols: ColMap, builder: (d: LeadRow[], c: ColMap) => any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Chart) return
    const canvas = document.getElementById(id) as HTMLCanvasElement | null
    if (!canvas) return
    if (ref.current) ref.current.destroy()
    ref.current = new window.Chart(canvas, builder(data, cols))
    return () => { ref.current?.destroy(); ref.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cols])
}

// ── Builders ──────────────────────────────────────────────────────────────

function buildFunnel(data: LeadRow[], cols: ColMap) {
  const stages = computeFunnel(data, cols)
  const labels = stages.map(s => `${s.label}  (${s.pct}%)`)
  const values = stages.map(s => s.count)
  const colors = stages.map(s => s.color)
  return {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, borderSkipped: false }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: { raw: number; dataIndex: number }) => ` ${ctx.raw.toLocaleString('es-CL')} citas (${stages[ctx.dataIndex]?.pct}%)` } },
      },
      scales: {
        x: { beginAtZero: true, grid: { color: '#F0F0F5' }, ticks: { font: { size: 10 } } },
        y: { ticks: { font: { size: 11, weight: 'bold' } } },
      },
    },
  }
}

function buildSemanal(data: LeadRow[], cols: ColMap) {
  // Prioridad: semana → mes → fecha
  const useSemana = !!cols['semana']
  const useMes    = !useSemana && !!cols['mes']
  const byPeriod: Record<string, { citas: number; mat: number }> = {}

  data.forEach(row => {
    let period: string | null = null
    if (useSemana)     period = getVal(row, 'semana', cols)
    else if (useMes)   period = getVal(row, 'mes', cols)
    if (!period) return
    if (!byPeriod[period]) byPeriod[period] = { citas: 0, mat: 0 }
    byPeriod[period].citas++
    if (norm(getVal(row, 'estado', cols) || '').includes('matriculad')) byPeriod[period].mat++
  })

  // Ordenar semanas numéricamente, meses cronológicamente
  const MES_ORDER = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const labels = Object.keys(byPeriod).sort((a, b) => {
    if (useSemana) {
      const na = parseInt(a.replace(/\D/g, '')), nb = parseInt(b.replace(/\D/g, ''))
      return na - nb
    }
    const ai = MES_ORDER.indexOf(norm(a)), bi = MES_ORDER.indexOf(norm(b))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const citas = labels.map(l => byPeriod[l].citas)
  const mats  = labels.map(l => byPeriod[l].mat)
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { type: 'bar',  label: 'Citas',        data: citas, backgroundColor: 'rgba(244,114,30,0.25)', borderColor: ORANGE, borderWidth: 1.5, borderRadius: 4, borderSkipped: false, yAxisID: 'y' },
        { type: 'line', label: 'Matriculadas', data: mats,  borderColor: GRAY, backgroundColor: 'rgba(43,45,66,0.1)', pointBackgroundColor: GRAY, pointRadius: 4, borderWidth: 2.5, fill: false, tension: 0.35, yAxisID: 'y2' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 35 } },
        y:  { beginAtZero: true, grid: { color: '#F0F0F5' }, title: { display: true, text: 'Citas', font: { size: 9 } } },
        y2: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Matriculadas', font: { size: 9 } } },
      },
    },
  }
}

function buildConsultores(data: LeadRow[], cols: ColMap) {
  const pivot: Record<string, { mat: number; pipeline: number; perdidos: number; nc: number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'consultor', cols) || 'Sin asignar'
    const e = norm(getVal(row, 'estado', cols) || '')
    if (!pivot[c]) pivot[c] = { mat: 0, pipeline: 0, perdidos: 0, nc: 0 }
    if (e.includes('matriculad')) pivot[c].mat++
    else if (e.includes('indeciso') || e.includes('volver a llamar') || e.includes('viene') || e.includes('devolver llamado')) pivot[c].pipeline++
    else if (e.includes('no contactado') || e.includes('no contesta')) pivot[c].nc++
    else pivot[c].perdidos++
  })
  const entries = Object.entries(pivot).sort((a, b) => b[1].mat - a[1].mat).slice(0, 15)
  const labels  = entries.map(([k]) => k.length > 22 ? k.substring(0, 22) + '…' : k)
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Matriculadas', data: entries.map(([, v]) => v.mat),      backgroundColor: ORANGE,    borderRadius: 3, borderSkipped: false },
        { label: 'Pipeline',     data: entries.map(([, v]) => v.pipeline), backgroundColor: '#F59E0B', borderRadius: 3, borderSkipped: false },
        { label: 'No Contactado',data: entries.map(([, v]) => v.nc),       backgroundColor: '#D1D5DB', borderRadius: 3, borderSkipped: false },
        { label: 'Perdidos',     data: entries.map(([, v]) => v.perdidos), backgroundColor: '#FCA5A5', borderRadius: 3, borderSkipped: false },
      ],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { stacked: true, beginAtZero: true, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 } } },
        y: { stacked: true, ticks: { font: { size: 10 } } },
      },
    },
  }
}

function buildSeguimiento(data: LeadRow[], cols: ColMap) {
  const counts: Record<string, number> = {}
  data.forEach(row => {
    const v = getVal(row, 'seguimiento', cols) || 'Sin estado'
    counts[v] = (counts[v] || 0) + 1
  })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
  return {
    type: 'bar',
    data: {
      labels: entries.map(([k]) => k.length > 30 ? k.substring(0, 30) + '…' : k),
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([k]) => colorForStatus(k)), borderRadius: 4, borderSkipped: false }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { raw: number }) => ` ${ctx.raw.toLocaleString('es-CL')} citas` } } },
      scales: {
        x: { beginAtZero: true, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 } } },
        y: { ticks: { font: { size: 10 } } },
      },
    },
  }
}

function buildCarreras(data: LeadRow[], cols: ColMap) {
  const pivot: Record<string, { mat: number; pipeline: number; perdidos: number; nc: number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'carrera', cols) || 'Sin carrera'
    const e = norm(getVal(row, 'estado', cols) || '')
    if (!pivot[c]) pivot[c] = { mat: 0, pipeline: 0, perdidos: 0, nc: 0 }
    if (e.includes('matriculad')) pivot[c].mat++
    else if (e.includes('indeciso') || e.includes('volver a llamar') || e.includes('viene') || e.includes('devolver llamado')) pivot[c].pipeline++
    else if (e.includes('no contactado') || e.includes('no contesta')) pivot[c].nc++
    else pivot[c].perdidos++
  })
  const entries = Object.entries(pivot)
    .map(([k, v]) => ({ k, total: v.mat + v.pipeline + v.perdidos + v.nc, ...v }))
    .sort((a, b) => b.total - a.total).slice(0, 12)
  const labels = entries.map(e => e.k.length > 35 ? e.k.substring(0, 35) + '…' : e.k)
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Matriculadas', data: entries.map(e => e.mat),      backgroundColor: ORANGE,    borderRadius: 3, borderSkipped: false },
        { label: 'Pipeline',     data: entries.map(e => e.pipeline), backgroundColor: '#F59E0B', borderRadius: 3, borderSkipped: false },
        { label: 'No Contactado',data: entries.map(e => e.nc),       backgroundColor: '#D1D5DB', borderRadius: 3, borderSkipped: false },
        { label: 'Perdidos',     data: entries.map(e => e.perdidos), backgroundColor: '#FCA5A5', borderRadius: 3, borderSkipped: false },
      ],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { stacked: true, beginAtZero: true, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 } } },
        y: { stacked: true, ticks: { font: { size: 9 } } },
      },
    },
  }
}

function buildCampus(data: LeadRow[], cols: ColMap) {
  const counts: Record<string, number> = {}
  data.forEach(row => { const v = getVal(row, 'campus', cols) || 'Sin campus'; counts[v] = (counts[v] || 0) + 1 })
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  const total  = Object.values(counts).reduce((s, v) => s + v, 0)
  return {
    type: 'doughnut',
    data: { labels, datasets: [{ data: labels.map(l => counts[l]), backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
        tooltip: { callbacks: { label: (ctx: { label: string; raw: number }) => ` ${ctx.label}: ${ctx.raw} (${(ctx.raw / total * 100).toFixed(1)}%)` } },
      },
    },
  }
}

function buildRegimen(data: LeadRow[], cols: ColMap) {
  const counts: Record<string, number> = {}
  data.forEach(row => { const v = getVal(row, 'regimen', cols) || 'Sin régimen'; counts[v] = (counts[v] || 0) + 1 })
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  const total  = Object.values(counts).reduce((s, v) => s + v, 0)
  return {
    type: 'doughnut',
    data: { labels, datasets: [{ data: labels.map(l => counts[l]), backgroundColor: labels.map((_, i) => [GRAY,'#4B4E68','#F4721E','#F9A36A','#FDA97B','#FBCDA0'][i % 6]), borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } },
        tooltip: { callbacks: { label: (ctx: { label: string; raw: number }) => ` ${ctx.label}: ${ctx.raw} (${(ctx.raw / total * 100).toFixed(1)}%)` } },
      },
    },
  }
}

function buildOrigen(data: LeadRow[], cols: ColMap) {
  const counts: Record<string, number> = {}
  data.forEach(row => { const v = getVal(row, 'origen', cols) || 'Sin origen'; counts[v] = (counts[v] || 0) + 1 })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
  return {
    type: 'bar',
    data: {
      labels: entries.map(([k]) => k.length > 28 ? k.substring(0, 28) + '…' : k),
      datasets: [{ label: 'Citas', data: entries.map(([, v]) => v), backgroundColor: entries.map((_, i) => `rgba(244,114,30,${0.35 + 0.65 * (1 - i / Math.max(entries.length - 1, 1))})`), borderRadius: 4, borderSkipped: false }],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 }, maxRotation: 40 } },
        y: { beginAtZero: true, grid: { color: '#F0F0F5' } },
      },
    },
  }
}

// ── Card wrapper ──────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, id, height = 'h-72' }: { title: string; subtitle?: string; id: string; height?: string }) {
  return (
    <div className="card p-5 flex flex-col">
      <div className="section-title">{title}</div>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5 mb-2">{subtitle}</p>}
      <div className={`relative flex-1 ${height}`}>
        <canvas id={id} style={{ maxHeight: '100%' }} />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────
export default function ChartSection({ data, cols }: Props) {
  useChart('chartFunnel',      data, cols, buildFunnel)
  useChart('chartSemanal',     data, cols, buildSemanal)
  useChart('chartConsultores', data, cols, buildConsultores)
  useChart('chartSeguimiento', data, cols, buildSeguimiento)
  useChart('chartCarreras',    data, cols, buildCarreras)
  useChart('chartCampus',      data, cols, buildCampus)
  useChart('chartRegimen',     data, cols, buildRegimen)
  useChart('chartOrigen',      data, cols, buildOrigen)

  return (
    <div className="space-y-4">
      {/* Fila 1: Funnel full width */}
      <ChartCard
        id="chartFunnel"
        title="Funnel de Conversión"
        subtitle="Progresión desde cita hasta matrícula"
        height="h-48"
      />

      {/* Fila 2: Evolución temporal full width */}
      <ChartCard
        id="chartSemanal"
        title="Evolución Semanal — Citas vs Matriculadas"
        subtitle="Barras: volumen de citas · Línea: matrículas por período"
        height="h-64"
      />

      {/* Fila 3: Consultores + Seguimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard id="chartConsultores" title="Ranking Consultores" subtitle="Top 15 · Matriculadas + Pipeline + No Contactado + Perdidos" height="h-96" />
        <ChartCard id="chartSeguimiento" title="Pipeline por Seguimiento Cierre" subtitle="Estado de la gestión en cada contacto" height="h-96" />
      </div>

      {/* Fila 4: Carreras full width */}
      <ChartCard
        id="chartCarreras"
        title="Top 12 Carreras — Conversión por Programa"
        subtitle="Ordenado por volumen total · Stacked por estado"
        height="h-96"
      />

      {/* Fila 5: Campus + Régimen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard id="chartCampus"  title="Distribución por Campus"        subtitle="Participación de cada sede" height="h-64" />
        <ChartCard id="chartRegimen" title="Distribución por Régimen"        subtitle="Modalidad de estudio de interés" height="h-64" />
      </div>

      {/* Fila 6: Origen */}
      <ChartCard
        id="chartOrigen"
        title="Origen de Leads (Primer Sub Origen)"
        subtitle="Canales de captación por volumen"
        height="h-64"
      />
    </div>
  )
}
