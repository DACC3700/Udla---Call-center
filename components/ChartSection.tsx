'use client'
import { useEffect, useRef } from 'react'
import Script from 'next/script'
import { LeadRow, ColMap } from './Dashboard'
import { getVal, parseDate, fmtMonth, colorForStatus, norm, PALETTE } from '@/lib/dataUtils'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Chart: any
  }
}

const ORANGE = '#F4721E', GRAY = '#2B2D42'

interface Props { data: LeadRow[]; cols: ColMap }

function useChart(id: string, data: LeadRow[], cols: ColMap, builder: (data: LeadRow[], cols: ColMap) => object) {
  const chartRef = useRef<unknown>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Chart) return
    const canvas = document.getElementById(id) as HTMLCanvasElement | null
    if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (chartRef.current) (chartRef.current as any).destroy()
    const cfg = builder(data, cols)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartRef.current = new window.Chart(canvas, cfg as any)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (chartRef.current) { (chartRef.current as any).destroy(); chartRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cols])
}

function buildCitas(data: LeadRow[], cols: ColMap) {
  const pivot: Record<string, Record<string, number>> = {}
  const estados = new Set<string>()
  data.forEach(row => {
    const c = getVal(row, 'consultor', cols) || 'Sin asignar'
    const e = getVal(row, 'estado', cols) || 'Sin estado'
    estados.add(e)
    if (!pivot[c]) pivot[c] = {}
    pivot[c][e] = (pivot[c][e] || 0) + 1
  })
  const labels = Object.keys(pivot).sort()
  const estArr = [...estados].sort()
  return { type: 'bar', data: { labels, datasets: estArr.map(est => ({ label: est, data: labels.map(c => pivot[c][est] || 0), backgroundColor: colorForStatus(est), borderRadius: 4, borderSkipped: false })) }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { footer: (items: {raw: number}[]) => `Total: ${items.reduce((s, i) => s + i.raw, 0)}` } } }, scales: { x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 40 } }, y: { stacked: true, beginAtZero: true, grid: { color: '#F0F0F5' } } } } }
}

function buildInteres(data: LeadRow[], cols: ColMap) {
  const counts: Record<string, number> = {}
  data.forEach(row => { const v = getVal(row, 'interes', cols) || 'Sin especificar'; counts[v] = (counts[v] || 0) + 1 })
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  return { type: 'doughnut', data: { labels, datasets: [{ data: labels.map(l => counts[l]), backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx: {label: string; raw: number; dataset: {data: number[]}}) => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)) * 100).toFixed(1)}%)` } } } } }
}

function buildConsultor(data: LeadRow[], cols: ColMap) {
  const pivot: Record<string, Record<string, number>> = {}
  const estados = new Set<string>()
  data.forEach(row => {
    const c = getVal(row, 'consultor', cols) || 'Sin asignar'
    const e = getVal(row, 'estado', cols) || 'Sin estado'
    estados.add(e)
    if (!pivot[c]) pivot[c] = {}
    pivot[c][e] = (pivot[c][e] || 0) + 1
  })
  const labels = Object.keys(pivot).sort()
  const estArr = [...estados].sort()
  return { type: 'bar', data: { labels, datasets: estArr.map(est => ({ label: est, data: labels.map(c => pivot[c][est] || 0), backgroundColor: colorForStatus(est), borderRadius: 3, borderSkipped: false })) }, options: { responsive: true, maintainAspectRatio: true, indexAxis: 'y', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }, scales: { x: { stacked: true, beginAtZero: true, grid: { color: '#F0F0F5' } }, y: { stacked: true, ticks: { font: { size: 10 } } } } } }
}

function buildCarrera(data: LeadRow[], cols: ColMap) {
  const pivot: Record<string, Record<string, number>> = {}
  const estados = new Set<string>()
  data.forEach(row => {
    const c = getVal(row, 'carrera', cols) || 'Sin carrera'
    const e = getVal(row, 'estado', cols) || 'Sin estado'
    estados.add(e)
    if (!pivot[c]) pivot[c] = {}
    pivot[c][e] = (pivot[c][e] || 0) + 1
  })
  const labels = Object.entries(pivot).sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)).slice(0, 10).map(([k]) => k)
  const estArr = [...estados].sort()
  const datasets: object[] = estArr.map(est => ({ label: est, data: labels.map(c => pivot[c] ? pivot[c][est] || 0 : 0), backgroundColor: colorForStatus(est), borderRadius: 3, borderSkipped: false }))
  const convData = labels.map(c => { const t = Object.values(pivot[c] || {}).reduce((s, v) => s + v, 0); const m = Object.entries(pivot[c] || {}).filter(([k]) => norm(k).includes('matricul')).reduce((s, [, v]) => s + v, 0); return t > 0 ? parseFloat(((m / t) * 100).toFixed(1)) : 0 })
  datasets.push({ label: '% Conversión', data: convData, type: 'line', yAxisID: 'pct', borderColor: GRAY, backgroundColor: 'rgba(43,45,66,.1)', pointBackgroundColor: GRAY, pointRadius: 4, borderWidth: 2, fill: false, tension: .3 })
  return { type: 'bar', data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { stacked: true, ticks: { font: { size: 9 }, maxRotation: 45 } }, y: { stacked: true, beginAtZero: true, grid: { color: '#F0F0F5' } }, pct: { position: 'right', beginAtZero: true, max: 100, grid: { display: false }, ticks: { callback: (v: number) => v + '%', font: { size: 10 } } } } } }
}

function buildEvolucion(data: LeadRow[], cols: ColMap) {
  const byMonth: Record<string, number> = {}
  data.forEach(row => { const f = parseDate(getVal(row, 'fecha', cols)); if (!f) return; const m = fmtMonth(f); byMonth[m] = (byMonth[m] || 0) + 1 })
  const labels = Object.keys(byMonth).sort()
  const vals = labels.map(l => byMonth[l])
  return { type: 'bar', data: { labels, datasets: [{ label: 'Leads creados', data: vals, backgroundColor: labels.map((_, i) => `rgba(244,114,30,${0.4 + 0.6 * (i / Math.max(labels.length - 1, 1))})`), borderRadius: 5, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: {raw: number}) => ` ${ctx.raw} leads` } } }, scales: { x: { ticks: { font: { size: 10 }, maxRotation: 45 } }, y: { beginAtZero: true, grid: { color: '#F0F0F5' } } } } }
}

function buildAcumulado(data: LeadRow[], cols: ColMap) {
  const byMonth: Record<string, number> = {}, matByMonth: Record<string, number> = {}
  data.forEach(row => { const f = parseDate(getVal(row, 'fecha', cols)); if (!f) return; const m = fmtMonth(f); byMonth[m] = (byMonth[m] || 0) + 1; if (norm(getVal(row, 'estado', cols) || '').includes('matricul')) matByMonth[m] = (matByMonth[m] || 0) + 1 })
  const labels = Object.keys(byMonth).sort()
  let cl = 0, cm = 0; const cumL: number[] = [], cumM: number[] = []
  labels.forEach(m => { cl += byMonth[m] || 0; cumL.push(cl); cm += matByMonth[m] || 0; cumM.push(cm) })
  return { type: 'line', data: { labels, datasets: [{ label: 'Leads acumulados', data: cumL, borderColor: GRAY, backgroundColor: 'rgba(43,45,66,.08)', fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: GRAY }, { label: 'Matrículas acumuladas', data: cumM, borderColor: ORANGE, backgroundColor: 'rgba(244,114,30,.10)', fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: ORANGE }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { ticks: { font: { size: 10 }, maxRotation: 45 } }, y: { beginAtZero: true, grid: { color: '#F0F0F5' } } } } }
}

function ChartCard({ title, subtitle, id }: { title: string; subtitle?: string; id: string }) {
  return (
    <div className="card p-5">
      <div className="section-title">{title}</div>
      {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
      <div className="relative"><canvas id={id} /></div>
    </div>
  )
}

export default function ChartSection({ data, cols }: Props) {
  useChart('chartCitas',     data, cols, buildCitas)
  useChart('chartInteres',   data, cols, buildInteres)
  useChart('chartConsultor', data, cols, buildConsultor)
  useChart('chartCarrera',   data, cols, buildCarrera)
  useChart('chartEvolucion', data, cols, buildEvolucion)
  useChart('chartAcumulado', data, cols, buildAcumulado)

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
        strategy="beforeInteractive"
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard id="chartCitas"     title="Citas vs Consultor vs Estado Matrícula" subtitle="Desglose de citas por propietario y resultado" />
          <ChartCard id="chartInteres"   title="Distribución Leads por Último Interés"  subtitle="Proporción de leads según su interés más reciente" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard id="chartConsultor" title="Leads por Consultor vs Estado Matrícula" />
          <ChartCard id="chartCarrera"   title="Carrera vs Estado Matrícula y % Conversión" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard id="chartEvolucion" title="Evolución de Leads por Fecha de Creación" subtitle="Volumen de captación a lo largo del tiempo" />
          <ChartCard id="chartAcumulado" title="Acumulado Matrículas vs Leads"             subtitle="Tendencia de conversión en el período" />
        </div>
      </div>
    </>
  )
}
