export type LeadRow = Record<string, string | number | null>

export const COL_ALIASES: Record<string, string[]> = {
  leads:     ['lead','leads','id lead','id_lead','leadid','folio'],
  estado:    ['estado matricula','estado_matricula','estado de matricula','estado','status','matricula','matrícula'],
  consultor: ['consultor','propietario','owner','asesor','ejecutivo','agente','vendedor','responsable'],
  carrera:   ['carrera','programa','programa académico','programa academico','major','curso'],
  interes:   ['ultimo interes','último interés','ultimo_interes','interes','interés','interest','ultimo_interés'],
  citas:     ['citas','cita','appointment','appointments','reuniones'],
  fecha:     ['fecha creacion','fecha_creacion','fecha de creacion','fecha','create date','createdate','created','creado','fecha_creación','fecha creación'],
}

export function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function detectCol(headers: string[], aliases: string[]): string | null {
  const hn = headers.map(norm)
  for (const a of aliases) {
    const an = norm(a)
    const idx = hn.findIndex(h => h === an || h.includes(an) || an.includes(h))
    if (idx !== -1) return headers[idx]
  }
  return null
}

export function mapColumns(headers: string[]): Record<string, string | null> {
  const cols: Record<string, string | null> = {}
  for (const [key, aliases] of Object.entries(COL_ALIASES)) {
    cols[key] = detectCol(headers, aliases)
  }
  return cols
}

export function getVal(row: LeadRow, key: string, cols: Record<string, string | null>): string | null {
  const col = cols[key]
  if (!col) return null
  const v = row[col]
  return v !== undefined && v !== null && v !== '' ? String(v).trim() : null
}

export function parseDate(str: string | null): Date | null {
  if (!str) return null
  if (/^\d{5}$/.test(str)) {
    const d = new Date((parseInt(str) - 25569) * 86400 * 1000)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function fmtMonth(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export const PALETTE = [
  '#F4721E','#2B2D42','#F9A36A','#6B7280','#FBCDA0',
  '#4B5563','#FDE8D0','#9CA3AF','#D45E0A','#1E2033',
  '#FDA97B','#374151','#FEE6CE','#8890A4','#F87337',
]

export const STATUS_COLORS: Record<string, string> = {
  'matriculado':   '#F4721E',
  'en proceso':    '#FDA97B',
  'sin matrícula': '#9CA3AF',
  'interesado':    '#2B2D42',
  'no interesado': '#6B7280',
  'pendiente':     '#FBCDA0',
}

export function colorForStatus(s: string): string {
  if (!s) return '#D1D5DB'
  const k = norm(s)
  for (const [pat, col] of Object.entries(STATUS_COLORS)) {
    if (k.includes(pat)) return col
  }
  return PALETTE[Math.abs(s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTE.length]
}

export function generateDemoData(): LeadRow[] {
  const estados = ['Matriculado', 'En Proceso', 'Sin Matrícula', 'Interesado', 'No Interesado']
  const consultores = ['Ana García', 'Carlos López', 'María Torres', 'Rodrigo Pérez', 'Valentina Ruiz']
  const carreras = ['Ingeniería Civil', 'Psicología', 'Medicina', 'Derecho', 'Administración', 'Ing. Informática', 'Diseño Gráfico', 'Arquitectura']
  const intereses = ['Ingenierías', 'Salud', 'Humanidades', 'Negocios', 'Artes']
  const now = new Date()

  return Array.from({ length: 380 }, (_, i) => {
    const offset = Math.floor(Math.random() * 150)
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const r = Math.random()
    const estado = r < .22 ? 'Matriculado' : r < .55 ? 'En Proceso' : r < .72 ? 'Interesado' : r < .88 ? 'Sin Matrícula' : 'No Interesado'
    return {
      'Lead ID': i + 1001,
      'Estado Matricula': estado,
      'Consultor': consultores[Math.floor(Math.random() * consultores.length)],
      'Carrera': carreras[Math.floor(Math.random() * carreras.length)],
      'Ultimo Interes': intereses[Math.floor(Math.random() * intereses.length)],
      'Citas': Math.floor(Math.random() * 4),
      'Fecha Creacion': `${d.getFullYear()}-${mm}-${dd}`,
    }
  })
}
