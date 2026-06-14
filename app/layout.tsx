import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dashboards UDLA — Call Center & CRM Admisiones',
  description: 'Dashboard Ejecutivo Call Center + Dashboard CRM Citas — Universidad de las Américas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Chart.js cargado síncronamente antes de cualquier JS del cliente */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}
