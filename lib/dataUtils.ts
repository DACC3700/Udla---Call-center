export type LeadRow = Record<string, string | number | null>

// ── Column aliases ──────────────────────────────────────────────────────────
export const COL_ALIASES: Record<string, string[]> = {
  leads:       ['lead','leads','id lead','id_lead','leadid','folio','rut'],
  estado:      ['ultimo interes cierre','último interés cierre','ultimo_interes_cierre',
                'estado matricula','estado_matricula','estado de matricula',
                'estado','status','matricula','matrícula'],
  consultor:   ['llamada a','llamada_a','consultor','asesor','ejecutivo','agente',
                'vendedor','responsable'],
  carrera:     ['carrera de interes','carrera de interés','carrera_de_interes',
                'carrera','programa','programa académico','major','curso'],
  interes:     ['ultimo interes','último interés','ultimo_interes',
                'interes cierre','interés cierre','interes','interés'],
  citas:       ['citas','cita','appointment','reuniones'],
  fecha:       ['fecha de cracion','fecha de cración','fecha creacion','fecha_creacion',
                'fecha de creacion','fecha','createdate','created','creado'],
  campus:      ['campus'],
  equipo:      ['marketing5','equipo','team','marketing'],
  origen:      ['primer sub origen','primer_sub_origen','sub origen',
                'suborigen','origen','source'],
  semana:      ['semana','week'],
  mes:         ['mes','month'],
  regimen:     ['regimen interes 1','régimen interés 1','regimen_interes_1',
                'regimen','régimen','modalidad','jornada'],
  seguimiento: ['seguimiento cierre','seguimiento_cierre','seguimiento'],
  llamadas:    ['cont. llamadas','cont llamadas','cont_llamadas',
                'llamadas','num llamadas','cantidad llamadas'],
}

// ── Normalización ───────────────────────────────────────────────────────────
export function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normHeader(s: string): string {
  return norm(s).replace(/[_()]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function detectCol(headers: string[], aliases: string[]): string | null {
  const hn = headers.map(h => ({ original: h, n: normHeader(h) }))
  for (const a of aliases) {
    const an = normHeader(a)
    const found = hn.find(({ n }) => n === an || n.includes(an) || an.includes(n))
    if (found) return found.original
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

// ── Fechas ──────────────────────────────────────────────────────────────────
export function parseDate(str: string | null): Date | null {
  if (!str) return null
  if (/^\d{5}$/.test(str)) {
    const d = new Date((parseInt(str) - 25569) * 86400 * 1000)
    return isNaN(d.getTime()) ? null : d
  }
  // ISO datetime from Supabase / XLSX
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function fmtMonth(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

// ── Colores ──────────────────────────────────────────────────────────────────
export const PALETTE = [
  '#F4721E','#2B2D42','#F9A36A','#6B7280','#FBCDA0',
  '#4B5563','#FDE8D0','#9CA3AF','#D45E0A','#1E2033',
  '#FDA97B','#374151','#FEE6CE','#8890A4','#F87337',
]

// Colores específicos para los estados del Call Center UDLA
export const STATUS_COLORS: Record<string, string> = {
  'matriculada':              '#F4721E',
  'matriculado':              '#F4721E',
  'viene':                    '#22C55E',
  'afluencia':                '#16A34A',
  'indeciso':                 '#F59E0B',
  'volver a llamar':          '#3B82F6',
  'devolver llamado':         '#60A5FA',
  'lo esta evaluando':        '#F59E0B',
  'gestion whatsapp':         '#8B5CF6',
  'espera documentacion':     '#06B6D4',
  'enviara documentos':       '#10B981',
  'solicita informacion':     '#84CC16',
  'no viene':                 '#EF4444',
  'no contactado':            '#9CA3AF',
  'no contesta':              '#D1D5DB',
  'no califica':              '#6B7280',
  'evalua otra':              '#A855F7',
  'fono fuera de servicio':   '#6B7280',
  'buzon de voz':             '#9CA3AF',
  'corta llamado':            '#DC2626',
  'molesto':                  '#B91C1C',
  'gratuidad':                '#64748B',
  'otro proceso':             '#78716C',
  'en proceso convalidacion': '#0EA5E9',
}

export function colorForStatus(s: string): string {
  if (!s) return '#D1D5DB'
  const k = norm(s)
  for (const [pat, col] of Object.entries(STATUS_COLORS)) {
    if (k.includes(pat)) return col
  }
  return PALETTE[Math.abs(s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTE.length]
}

// ── Funnel de conversión ─────────────────────────────────────────────────────
export interface FunnelStage {
  label: string
  count: number
  pct: number
  color: string
}

export function computeFunnel(data: LeadRow[], cols: Record<string, string | null>): FunnelStage[] {
  const total = data.length
  if (!total) return []
  const counts = {
    total,
    contactados: 0,
    con_interes: 0,
    comprometidos: 0,
    matriculadas: 0,
  }
  data.forEach(row => {
    const e = norm(getVal(row, 'estado', cols) || '')
    if (!e.includes('no contactado')) counts.contactados++
    if (['matriculad','indeciso','volver a llamar','viene','afluencia','evalua'].some(t => e.includes(t))) counts.con_interes++
    if (['matriculad','viene','afluencia'].some(t => e.includes(t))) counts.comprometidos++
    if (e.includes('matriculad')) counts.matriculadas++
  })
  const stages: Array<{ label: string; key: keyof typeof counts; color: string }> = [
    { label: 'Total Citas',     key: 'total',         color: '#2B2D42' },
    { label: 'Contactados',     key: 'contactados',   color: '#4B4E68' },
    { label: 'Con Interés',     key: 'con_interes',   color: '#D45E0A' },
    { label: 'Comprometidos',   key: 'comprometidos', color: '#E86810' },
    { label: 'Matriculadas',    key: 'matriculadas',  color: '#F4721E' },
  ]
  return stages.map(s => ({
    label: s.label,
    count: counts[s.key],
    pct: total > 0 ? Math.round((counts[s.key] / total) * 100) : 0,
    color: s.color,
  }))
}

// ── Demo data ────────────────────────────────────────────────────────────────
export function generateDemoData(): LeadRow[] {
  const estados = ['Matriculada','Indeciso','Volver a Llamar','No Viene','No Contactado','Viene']
  const consultores = ['Ana García','Carlos López','María Torres','Rodrigo Pérez','Valentina Ruiz']
  const carreras = ['Ingeniería Civil Industrial - Continuidad de Estudios','Psicología','Ingeniería Industrial','Ingeniería Comercial','Medicina Veterinaria','TNS en Administración de Empresas']
  const campus = ['Online','Santiago Centro','Providencia','Viña del Mar','Concepción']
  const regimenes = ['A DISTANCIA ASINCRÓNICO','DIURNO','SEMIPRESENCIAL DIURNO','VESPERTINO']
  const origenes = ['LANDING ONLINE','MALLA FLEX LANDING ONLINE','LANDING SEMIPRESENCIAL','MALLA FLEX']
  const semanas = ['Semana 1','Semana 2','Semana 3','Semana 4','Semana 5','Semana 6']
  const meses = ['marzo','abril','mayo','junio']
  const now = new Date()

  return Array.from({ length: 380 }, (_, i) => {
    const offset = Math.floor(Math.random() * 120)
    const d = new Date(now); d.setDate(d.getDate() - offset)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const r = Math.random()
    const estado = r < .09 ? 'Matriculada' : r < .22 ? 'Viene' : r < .42 ? 'Indeciso' : r < .60 ? 'Volver a Llamar' : r < .80 ? 'No Viene' : 'No Contactado'
    return {
      'RUT':             `${10000000 + i}-${i % 9}`,
      'Llamada a':       consultores[Math.floor(Math.random() * consultores.length)],
      'Ultimo Interés Cierre (Referente a) (Contacto)': estado,
      'Carrera de interés': carreras[Math.floor(Math.random() * carreras.length)],
      'Campus':          campus[Math.floor(Math.random() * campus.length)],
      'Régimen Interés 1': regimenes[Math.floor(Math.random() * regimenes.length)],
      'Primer Sub Origen (Referente a) (Contacto)': origenes[Math.floor(Math.random() * origenes.length)],
      'Cont. Llamadas (Referente a) (Contacto)': Math.floor(Math.random() * 25) + 1,
      'Seguimiento Cierre': ['No Contesta','Lo está evaluando','Devolver Llamado','Gestión WhatsApp','Enviara documentos para Matrícula'][Math.floor(Math.random() * 5)],
      'Marketing5':      ['Equipo Online VL','Equipo Online RM',null][Math.floor(Math.random() * 3)],
      'Semana':          semanas[Math.floor(Math.random() * semanas.length)],
      'Mes':             meses[Math.floor(Math.random() * meses.length)],
      'Fecha de cración': `${d.getFullYear()}-${mm}-${dd}`,
    }
  })
}
