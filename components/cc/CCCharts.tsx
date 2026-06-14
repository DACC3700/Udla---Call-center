'use client'
import { useEffect, useRef } from 'react'
import { PALETTE } from '@/lib/dataUtils'
import {
  EjecutivoStats, RegimenStats, CarreraStats, BaseStats,
  TemporalPoint,
} from '@/lib/ccDataUtils'

declare global { interface Window { Chart: any } }

const ORANGE = '#F4721E', GRAY = '#2B2D42', GREEN = '#22C55E', PURPLE = '#7C3AED'

// ── hook genérico ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useChart(id: string, deps: unknown[], builder: () => any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Chart) return
    const canvas = document.getElementById(id) as HTMLCanvasElement | null
    if (!canvas) return
    if (ref.current) ref.current.destroy()
    ref.current = new window.Chart(canvas, builder())
    return () => { ref.current?.destroy(); ref.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function ChartCard({ id, title, subtitle, height = 'h-72' }: { id: string; title: string; subtitle?: string; height?: string }) {
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

interface Props {
  ejecutivos: EjecutivoStats[]
  regimenes:  RegimenStats[]
  carreras:   CarreraStats[]
  bases:      BaseStats[]
  temporal:   TemporalPoint[]
  granularity: 'dia' | 'semana' | 'mes'
}

export default function CCCharts({ ejecutivos, regimenes, carreras, bases, temporal, granularity }: Props) {

  // 1. Barras: Recorridos vs Contactados vs Citas vs Matrículas por Ejecutivo
  useChart('ccChartEjec', [ejecutivos], () => {
    const top = ejecutivos.slice(0, 12)
    const labels = top.map(e => e.nombre.length > 20 ? e.nombre.substring(0, 20) + '…' : e.nombre)
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Recorridos',  data: top.map(e => e.recorridos),  backgroundColor: 'rgba(43,45,66,0.3)',    borderRadius: 3 },
          { label: 'Contactados', data: top.map(e => e.contactados), backgroundColor: GREEN,                   borderRadius: 3 },
          { label: 'Citas',       data: top.map(e => e.citas),       backgroundColor: ORANGE,                  borderRadius: 3 },
          { label: 'Matrículas',  data: top.map(e => e.matriculas),  backgroundColor: PURPLE,                  borderRadius: 3 },
        ],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 } } },
          y: { ticks: { font: { size: 10 } } },
        },
      },
    }
  })

  // 2. Barras: Contactabilidad y conversión por Ejecutivo
  useChart('ccChartEjecConv', [ejecutivos], () => {
    const top = ejecutivos.slice(0, 12)
    const labels = top.map(e => e.nombre.length > 18 ? e.nombre.substring(0, 18) + '…' : e.nombre)
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Contactabilidad %', data: top.map(e => e.contactabilidad.toFixed(1)), backgroundColor: GREEN,  borderRadius: 3 },
          { label: 'Conv Cont→Cita %',  data: top.map(e => e.convContCita.toFixed(1)),    backgroundColor: ORANGE, borderRadius: 3 },
          { label: 'Conv Cita→Mat %',   data: top.map(e => e.convCitaMat.toFixed(1)),     backgroundColor: PURPLE, borderRadius: 3 },
        ],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%` } } },
        scales: {
          x: { beginAtZero: true, max: 100, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 }, callback: (v: number) => v + '%' } },
          y: { ticks: { font: { size: 10 } } },
        },
      },
    }
  })

  // 3. Barras: Conversión por Carrera
  useChart('ccChartCarrera', [carreras], () => {
    const top = carreras.slice(0, 12)
    const labels = top.map(c => c.carrera.length > 32 ? c.carrera.substring(0, 32) + '…' : c.carrera)
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Contactabilidad %', data: top.map(c => c.contactabilidad.toFixed(1)), backgroundColor: GREEN,              borderRadius: 3 },
          { label: 'Conv Cont→Cita %',  data: top.map(c => c.convContCita.toFixed(1)),    backgroundColor: ORANGE,             borderRadius: 3 },
          { label: 'Conv Cita→Mat %',   data: top.map(c => c.convCitaMat.toFixed(1)),     backgroundColor: PURPLE,             borderRadius: 3 },
          { label: 'Conv Final %',       data: top.map(c => c.convFinal.toFixed(1)),       backgroundColor: 'rgba(14,165,233,0.7)', borderRadius: 3 },
        ],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%` } } },
        scales: {
          x: { beginAtZero: true, max: 100, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 }, callback: (v: number) => v + '%' } },
          y: { ticks: { font: { size: 9 } } },
        },
      },
    }
  })

  // 4. Barras: Conversión por Régimen
  useChart('ccChartRegimen', [regimenes], () => {
    const labels = regimenes.map(r => r.regimen)
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Contactabilidad %', data: regimenes.map(r => r.contactabilidad.toFixed(1)), backgroundColor: GREEN,              borderRadius: 3 },
          { label: 'Conv Cont→Cita %',  data: regimenes.map(r => r.convContCita.toFixed(1)),    backgroundColor: ORANGE,             borderRadius: 3 },
          { label: 'Conv Cita→Mat %',   data: regimenes.map(r => r.convCitaMat.toFixed(1)),     backgroundColor: PURPLE,             borderRadius: 3 },
          { label: 'Conv Final %',       data: regimenes.map(r => r.convFinal.toFixed(1)),       backgroundColor: 'rgba(14,165,233,0.7)', borderRadius: 3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%` } } },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, max: 100, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 }, callback: (v: number) => v + '%' } },
        },
      },
    }
  })

  // 5. Barras: Conversión por Tipo Base
  useChart('ccChartBase', [bases], () => {
    const labels = bases.map(b => b.base)
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Recorridos',        data: bases.map(b => b.recorridos),               backgroundColor: 'rgba(43,45,66,0.25)', borderRadius: 3, yAxisID: 'y2' },
          { label: 'Contactabilidad %', data: bases.map(b => b.contactabilidad.toFixed(1)), backgroundColor: GREEN,               borderRadius: 3, yAxisID: 'y' },
          { label: 'Conv Cont→Cita %',  data: bases.map(b => b.convContCita.toFixed(1)),   backgroundColor: ORANGE,              borderRadius: 3, yAxisID: 'y' },
          { label: 'Conv Final %',       data: bases.map(b => b.convFinal.toFixed(1)),      backgroundColor: PURPLE,              borderRadius: 3, yAxisID: 'y' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          y:  { beginAtZero: true, max: 100, grid: { color: '#F0F0F5' }, ticks: { callback: (v: number) => v + '%', font: { size: 9 } }, title: { display: true, text: '% conversión', font: { size: 9 } } },
          y2: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { font: { size: 9 } }, title: { display: true, text: 'Recorridos', font: { size: 9 } } },
          x:  { ticks: { font: { size: 10 } } },
        },
      },
    }
  })

  // 6. Líneas: Evolución temporal
  useChart('ccChartTemporal', [temporal, granularity], () => {
    const labels = temporal.map(t => t.label)
    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Recorridos',    data: temporal.map(t => t.recorridos),    borderColor: GRAY,   backgroundColor: 'rgba(43,45,66,0.1)',  fill: true, tension: 0.35, pointRadius: 4, borderWidth: 2, yAxisID: 'y' },
          { label: 'Contactados',   data: temporal.map(t => t.contactados),   borderColor: GREEN,  backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2, yAxisID: 'y' },
          { label: 'Citas',         data: temporal.map(t => t.citas),         borderColor: ORANGE, backgroundColor: 'rgba(244,114,30,0.1)',fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2, yAxisID: 'y' },
          { label: 'Matrículas',    data: temporal.map(t => t.matriculas),    borderColor: PURPLE, backgroundColor: 'transparent',         fill: false,tension: 0.35, pointRadius: 4, borderWidth: 2.5, yAxisID: 'y' },
          { label: 'Contactab. %',  data: temporal.map(t => t.contactabilidad.toFixed(1)), borderColor: '#0EA5E9', backgroundColor: 'transparent', fill: false, tension: 0.35, pointRadius: 3, borderWidth: 1.5, borderDash: [4,2], yAxisID: 'y2' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x:  { ticks: { font: { size: 9 }, maxRotation: 35 } },
          y:  { beginAtZero: true, grid: { color: '#F0F0F5' }, ticks: { font: { size: 9 } }, title: { display: true, text: 'Volumen', font: { size: 9 } } },
          y2: { beginAtZero: true, max: 100, position: 'right', grid: { display: false }, ticks: { font: { size: 9 }, callback: (v: number) => v + '%' }, title: { display: true, text: '%', font: { size: 9 } } },
        },
      },
    }
  })

  // 7. Dona: Distribución por Seguimiento
  useChart('ccChartSeg', [bases], () => {
    // Reuse bases data for seguimiento distribution look
    const labels = bases.map(b => b.base)
    const vals   = bases.map(b => b.recorridos)
    const total  = vals.reduce((s, v) => s + v, 0)
    return {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: PALETTE.slice(0, labels.length), borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} (${(ctx.raw / total * 100).toFixed(1)}%)` } } },
      },
    }
  })

  // 8. Dona: Distribución por Régimen
  useChart('ccChartRegimenDona', [regimenes], () => {
    const labels = regimenes.map(r => r.regimen)
    const vals   = regimenes.map(r => r.recorridos)
    const total  = vals.reduce((s, v) => s + v, 0)
    return {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: [GRAY,'#4B4E68',ORANGE,'#F9A36A','#FDA97B'], borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} (${(ctx.raw / total * 100).toFixed(1)}%)` } } },
      },
    }
  })

  return (
    <div className="space-y-4">
      {/* 1. Volumen por Ejecutivo */}
      <ChartCard id="ccChartEjec" title="Recorridos vs Contactados vs Citas vs Matrículas — por Ejecutivo" subtitle="Top 12 ejecutivos · Volumen en cada etapa del funnel" height="h-[420px]" />

      {/* 2. Conversión por Ejecutivo */}
      <ChartCard id="ccChartEjecConv" title="% Contactabilidad y Conversiones — por Ejecutivo" subtitle="Contactabilidad · Conv. Contactado→Cita · Conv. Cita→Matrícula" height="h-[360px]" />

      {/* 3. Evolución temporal */}
      <ChartCard id="ccChartTemporal" title="Evolución Temporal — Funnel del Call Center" subtitle={`Vista por ${granularity} · Volumen e indicadores de contactabilidad`} height="h-72" />

      {/* 4+5. Régimen + Base */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard id="ccChartRegimen" title="Conversión por Régimen" subtitle="Online · Executive · Semipresencial · Vespertino · Diurno" height="h-64" />
        <ChartCard id="ccChartBase"   title="Contactabilidad y Conversión por Tipo Base" subtitle="Lead · Stock · Inbound · C2C · WhatsApp" height="h-64" />
      </div>

      {/* 6. Conversión por Carrera */}
      <ChartCard id="ccChartCarrera" title="Indicadores por Carrera — Top 12" subtitle="% Contactabilidad · Conv. Contactado→Cita · Conv. Cita→Matrícula · Conversión Final" height="h-[400px]" />

      {/* 7+8. Donas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard id="ccChartSeg"        title="Distribución por Tipo Base"   subtitle="Volumen de recorridos por fuente" height="h-56" />
        <ChartCard id="ccChartRegimenDona" title="Distribución por Régimen"    subtitle="Participación por modalidad" height="h-56" />
      </div>
    </div>
  )
}
