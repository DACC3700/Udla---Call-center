import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dashboard CRM — Universidad de las Américas',
  description: 'Dashboard de admisiones y call center para UDLA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
