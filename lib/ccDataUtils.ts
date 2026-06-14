import { LeadRow, getVal, norm, detectCol, PALETTE } from './dataUtils'

// ── CC Column Aliases ────────────────────────────────────────────────────────
export const CC_COL_ALIASES: Record<string, string[]> = {
  ejecutivo:           ['ejecutivo','consultor','asesor','agente','llamada a','llamada_a','propietario'],
  contactado:          ['contactado','contactada','fue contactado','es contactado','contacto'],
  cita:                ['cita','tiene cita','agendo cita','agendo','agendó','appointment','cita agendada'],
  matricula:           ['matricula','matrícula','matriculado','matriculada','enrollment','inscrito'],
  base:                ['tipo base','tipo_base','base','fuente','tipo lead','origen base'],
  intentos:            ['intentos','cont. llamadas','cont llamadas','cont_llamadas','llamadas','num llamadas','cantidad llamadas','num_llamadas'],
  estado:              ['estado','status','resultado','resultado llamada','resultado_llamada','ultimo interes cierre','último interés cierre','ultimo_interes_cierre'],
  seguimiento:         ['seguimiento','seguimiento cierre','seguimiento_cierre','causa no cita','motivo no cita','razon'],
  regimen:             ['regimen','régimen','modalidad','jornada','regimen interes 1','régimen interés 1','regimen_interes_1'],
  carrera:             ['carrera','programa','carrera de interes','carrera de interés','carrera_de_interes'],
  campus:              ['campus','sede'],
  suborigen:           ['suborigen','sub origen','primer sub origen','primer_sub_origen','origen'],
  fecha:               ['fecha','fecha llamada','fecha_llamada','fecha de cracion','fecha de cración','fecha_creacion','fecha de creacion','fecha creacion','fecha compromiso','createdate'],
  semana:              ['semana','week'],
  mes:                 ['mes','month'],
  equipo:              ['equipo','marketing5','team'],
}

export type CCColMap = Record<string, string | null>

export function mapCCColumns(headers: string[]): CCColMap {
  const cols: CCColMap = {}
  for (const [key, aliases] of Object.entries(CC_COL_ALIASES)) {
    cols[key] = detectCol(headers, aliases)
  }
  return cols
}

// ── Helpers de estado ────────────────────────────────────────────────────────
// Determinar si una fila fue contactada
export function isContactado(row: LeadRow, cols: CCColMap): boolean {
  // Columna dedicada tiene prioridad
  const colVal = getVal(row, 'contactado', cols)
  if (colVal) {
    const n = norm(colVal)
    if (n === 'si' || n === 'sí' || n === 'yes' || n === '1' || n === 'true') return true
    if (n === 'no' || n === '0' || n === 'false') return false
  }
  // Derivar del estado
  const estado = norm(getVal(row, 'estado', cols) || '')
  const NO_CONTACTADO = ['no contesta','no contactado','no_contactado','buzon','buzón','fono fuera','sin respuesta','no responde']
  return !NO_CONTACTADO.some(t => estado.includes(t))
}

// Determinar si se agendó cita
export function tieneCita(row: LeadRow, cols: CCColMap): boolean {
  const colVal = getVal(row, 'cita', cols)
  if (colVal) {
    const n = norm(colVal)
    if (n === 'si' || n === 'sí' || n === 'yes' || n === '1' || n === 'true') return true
    if (n === 'no' || n === '0' || n === 'false') return false
  }
  // Derivar: si hay estado que implica cita agendada o matrícula, asumimos cita
  const estado = norm(getVal(row, 'estado', cols) || '')
  const CON_CITA = ['matriculad','viene','afluencia','indeciso','volver a llamar','devolver llamado',
                    'lo esta evaluando','espera documentacion','enviara documentos','gestion whatsapp']
  return CON_CITA.some(t => estado.includes(t))
}

// Determinar si hubo matrícula
export function esMatricula(row: LeadRow, cols: CCColMap): boolean {
  const colVal = getVal(row, 'matricula', cols)
  if (colVal) {
    const n = norm(colVal)
    if (n === 'si' || n === 'sí' || n === 'yes' || n === '1' || n === 'true') return true
    if (n === 'no' || n === '0' || n === 'false') return false
  }
  const estado = norm(getVal(row, 'estado', cols) || '')
  return estado.includes('matriculad')
}

// ── KPIs ─────────────────────────────────────────────────────────────────────
export interface CCKpiResult {
  total:           number
  contactados:     number
  noContactados:   number
  contactabilidad: number
  citas:           number
  convContCita:    number
  matriculas:      number
  convCitaMat:     number
  convLeadMat:     number
  promedioIntentos: number
  ejecutivos:      number
}

export function computeCCKpis(data: LeadRow[], cols: CCColMap): CCKpiResult {
  let contactados = 0, citas = 0, matriculas = 0, sumIntentos = 0, intentosCnt = 0
  const ejecutivosSet = new Set<string>()

  data.forEach(row => {
    const cont = isContactado(row, cols)
    const cita = tieneCita(row, cols)
    const mat  = esMatricula(row, cols)
    if (cont)  contactados++
    if (cita)  citas++
    if (mat)   matriculas++
    const intCol = cols['intentos']
    if (intCol) {
      const v = parseFloat(String(row[intCol] ?? ''))
      if (!isNaN(v) && v > 0) { sumIntentos += v; intentosCnt++ }
    }
    const ej = getVal(row, 'ejecutivo', cols)
    if (ej) ejecutivosSet.add(ej)
  })

  const total = data.length
  const noContactados = total - contactados

  return {
    total,
    contactados,
    noContactados,
    contactabilidad:  total   > 0 ? (contactados / total   * 100) : 0,
    citas,
    convContCita:     contactados > 0 ? (citas / contactados * 100) : 0,
    matriculas,
    convCitaMat:      citas > 0 ? (matriculas / citas  * 100) : 0,
    convLeadMat:      total > 0 ? (matriculas / total   * 100) : 0,
    promedioIntentos: intentosCnt > 0 ? sumIntentos / intentosCnt : 0,
    ejecutivos:       ejecutivosSet.size,
  }
}

// ── Semáforo ──────────────────────────────────────────────────────────────────
export interface MetaCC {
  contactabilidad: number   // %
  convContCita:    number   // %
  convCitaMat:     number   // %
}

export const META_DEFAULT: MetaCC = {
  contactabilidad: 60,
  convContCita:    20,
  convCitaMat:     30,
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo'

export function semaforo(value: number, meta: number): Semaforo {
  if (value >= meta)           return 'verde'
  if (value >= meta * 0.80)    return 'amarillo'
  return 'rojo'
}

export const SEMAFORO_COLORS: Record<Semaforo, { bg: string; text: string; label: string }> = {
  verde:    { bg: '#DCFCE7', text: '#16A34A', label: '🟢 Sobre meta' },
  amarillo: { bg: '#FEF9C3', text: '#CA8A04', label: '🟡 Cerca de meta' },
  rojo:     { bg: '#FEE2E2', text: '#DC2626', label: '🔴 Bajo desempeño' },
}

// ── Análisis por Ejecutivo ───────────────────────────────────────────────────
export interface EjecutivoStats {
  nombre:          string
  recorridos:      number
  contactados:     number
  noContactados:   number
  citas:           number
  matriculas:      number
  contactabilidad: number
  convContCita:    number
  convCitaMat:     number
  promedioIntentos: number
  semCont:         Semaforo
  semConv:         Semaforo
  semMat:          Semaforo
}

export function computeByEjecutivo(data: LeadRow[], cols: CCColMap, meta: MetaCC = META_DEFAULT): EjecutivoStats[] {
  const pivot: Record<string, { recorridos: number; contactados: number; citas: number; matriculas: number; intentos: number; intentosCnt: number }> = {}

  data.forEach(row => {
    const ej = getVal(row, 'ejecutivo', cols) || 'Sin asignar'
    if (!pivot[ej]) pivot[ej] = { recorridos: 0, contactados: 0, citas: 0, matriculas: 0, intentos: 0, intentosCnt: 0 }
    pivot[ej].recorridos++
    if (isContactado(row, cols)) pivot[ej].contactados++
    if (tieneCita(row, cols))    pivot[ej].citas++
    if (esMatricula(row, cols))  pivot[ej].matriculas++
    const intCol = cols['intentos']
    if (intCol) {
      const v = parseFloat(String(row[intCol] ?? ''))
      if (!isNaN(v) && v > 0) { pivot[ej].intentos += v; pivot[ej].intentosCnt++ }
    }
  })

  return Object.entries(pivot)
    .map(([nombre, v]) => {
      const contactabilidad = v.recorridos > 0 ? (v.contactados / v.recorridos * 100) : 0
      const convContCita    = v.contactados > 0 ? (v.citas / v.contactados * 100) : 0
      const convCitaMat     = v.citas > 0 ? (v.matriculas / v.citas * 100) : 0
      return {
        nombre,
        recorridos:       v.recorridos,
        contactados:      v.contactados,
        noContactados:    v.recorridos - v.contactados,
        citas:            v.citas,
        matriculas:       v.matriculas,
        contactabilidad,
        convContCita,
        convCitaMat,
        promedioIntentos: v.intentosCnt > 0 ? v.intentos / v.intentosCnt : 0,
        semCont:          semaforo(contactabilidad, meta.contactabilidad),
        semConv:          semaforo(convContCita, meta.convContCita),
        semMat:           semaforo(convCitaMat, meta.convCitaMat),
      }
    })
    .sort((a, b) => b.matriculas - a.matriculas)
}

// ── Análisis por Régimen ─────────────────────────────────────────────────────
export interface RegimenStats {
  regimen:         string
  recorridos:      number
  contactados:     number
  citas:           number
  matriculas:      number
  contactabilidad: number
  convContCita:    number
  convCitaMat:     number
  convFinal:       number
}

export function computeByRegimen(data: LeadRow[], cols: CCColMap): RegimenStats[] {
  const pivot: Record<string, { recorridos: number; contactados: number; citas: number; matriculas: number }> = {}
  data.forEach(row => {
    const r = getVal(row, 'regimen', cols) || 'Sin régimen'
    if (!pivot[r]) pivot[r] = { recorridos: 0, contactados: 0, citas: 0, matriculas: 0 }
    pivot[r].recorridos++
    if (isContactado(row, cols)) pivot[r].contactados++
    if (tieneCita(row, cols))    pivot[r].citas++
    if (esMatricula(row, cols))  pivot[r].matriculas++
  })
  return Object.entries(pivot)
    .map(([regimen, v]) => ({
      regimen,
      recorridos:      v.recorridos,
      contactados:     v.contactados,
      citas:           v.citas,
      matriculas:      v.matriculas,
      contactabilidad: v.recorridos   > 0 ? v.contactados / v.recorridos * 100 : 0,
      convContCita:    v.contactados  > 0 ? v.citas / v.contactados * 100 : 0,
      convCitaMat:     v.citas        > 0 ? v.matriculas / v.citas * 100 : 0,
      convFinal:       v.recorridos   > 0 ? v.matriculas / v.recorridos * 100 : 0,
    }))
    .sort((a, b) => b.citas - a.citas)
}

// ── Análisis por Carrera ─────────────────────────────────────────────────────
export interface CarreraStats {
  carrera:         string
  recorridos:      number
  contactados:     number
  citas:           number
  matriculas:      number
  contactabilidad: number
  convContCita:    number
  convCitaMat:     number
  convFinal:       number
}

export function computeByCarrera(data: LeadRow[], cols: CCColMap): CarreraStats[] {
  const pivot: Record<string, { recorridos: number; contactados: number; citas: number; matriculas: number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'carrera', cols) || 'Sin carrera'
    if (!pivot[c]) pivot[c] = { recorridos: 0, contactados: 0, citas: 0, matriculas: 0 }
    pivot[c].recorridos++
    if (isContactado(row, cols)) pivot[c].contactados++
    if (tieneCita(row, cols))    pivot[c].citas++
    if (esMatricula(row, cols))  pivot[c].matriculas++
  })
  return Object.entries(pivot)
    .map(([carrera, v]) => ({
      carrera,
      recorridos:      v.recorridos,
      contactados:     v.contactados,
      citas:           v.citas,
      matriculas:      v.matriculas,
      contactabilidad: v.recorridos   > 0 ? v.contactados / v.recorridos * 100 : 0,
      convContCita:    v.contactados  > 0 ? v.citas / v.contactados * 100 : 0,
      convCitaMat:     v.citas        > 0 ? v.matriculas / v.citas * 100 : 0,
      convFinal:       v.recorridos   > 0 ? v.matriculas / v.recorridos * 100 : 0,
    }))
    .sort((a, b) => b.citas - a.citas)
}

// ── Análisis por Tipo Base ───────────────────────────────────────────────────
export interface BaseStats {
  base:            string
  recorridos:      number
  contactados:     number
  citas:           number
  matriculas:      number
  contactabilidad: number
  convContCita:    number
  convFinal:       number
}

export function computeByBase(data: LeadRow[], cols: CCColMap): BaseStats[] {
  const pivot: Record<string, { recorridos: number; contactados: number; citas: number; matriculas: number }> = {}
  data.forEach(row => {
    const b = getVal(row, 'base', cols) || getVal(row, 'suborigen', cols) || 'Otro'
    if (!pivot[b]) pivot[b] = { recorridos: 0, contactados: 0, citas: 0, matriculas: 0 }
    pivot[b].recorridos++
    if (isContactado(row, cols)) pivot[b].contactados++
    if (tieneCita(row, cols))    pivot[b].citas++
    if (esMatricula(row, cols))  pivot[b].matriculas++
  })
  return Object.entries(pivot)
    .map(([base, v]) => ({
      base,
      recorridos:      v.recorridos,
      contactados:     v.contactados,
      citas:           v.citas,
      matriculas:      v.matriculas,
      contactabilidad: v.recorridos   > 0 ? v.contactados / v.recorridos * 100 : 0,
      convContCita:    v.contactados  > 0 ? v.citas / v.contactados * 100 : 0,
      convFinal:       v.recorridos   > 0 ? v.matriculas / v.recorridos * 100 : 0,
    }))
    .sort((a, b) => b.recorridos - a.recorridos)
}

// ── Causa Raíz ───────────────────────────────────────────────────────────────
export interface CausaStats { causa: string; count: number; pct: number }

export function computeCausaRaiz(data: LeadRow[], cols: CCColMap): { noCita: CausaStats[]; noMat: CausaStats[] } {
  const noCitaCounts: Record<string, number> = {}
  const noMatCounts:  Record<string, number> = {}

  data.forEach(row => {
    const estado = norm(getVal(row, 'estado', cols) || '')
    const seg    = norm(getVal(row, 'seguimiento', cols) || estado)

    const isCita = tieneCita(row, cols)
    const isMat  = esMatricula(row, cols)

    if (!isCita) {
      const causa = clasificarCausa(estado, seg)
      noCitaCounts[causa] = (noCitaCounts[causa] || 0) + 1
    }
    if (isCita && !isMat) {
      const causa = clasificarCausaMat(estado, seg)
      noMatCounts[causa] = (noMatCounts[causa] || 0) + 1
    }
  })

  const toArr = (counts: Record<string, number>): CausaStats[] => {
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    return Object.entries(counts)
      .map(([causa, count]) => ({ causa, count, pct: total > 0 ? count / total * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
  }

  return { noCita: toArr(noCitaCounts), noMat: toArr(noMatCounts) }
}

function clasificarCausa(estado: string, seg: string): string {
  const s = estado + ' ' + seg
  if (s.includes('no contesta') || s.includes('sin respuesta'))    return 'No contesta'
  if (s.includes('buzon') || s.includes('buzón'))                  return 'Buzón de voz'
  if (s.includes('corta') || s.includes('cuelga'))                 return 'Corta llamado'
  if (s.includes('no interesado') || s.includes('no le interesa')) return 'No interesado'
  if (s.includes('no disponible') || s.includes('no imparte'))     return 'Carrera no disponible'
  if (s.includes('evaluando') || s.includes('evaluarlo'))          return 'Lo está evaluando'
  if (s.includes('documentacion') || s.includes('documentación'))  return 'Espera documentación'
  if (s.includes('fono fuera') || s.includes('fuera de servicio')) return 'Fono fuera de servicio'
  if (s.includes('no contactado'))                                  return 'No contactado'
  return 'Otros'
}

function clasificarCausaMat(estado: string, seg: string): string {
  const s = estado + ' ' + seg
  if (s.includes('indeciso'))                                       return 'Indeciso'
  if (s.includes('evaluando'))                                      return 'Evaluando otra opción'
  if (s.includes('documentacion') || s.includes('documentación'))  return 'Falta documentación'
  if (s.includes('no viene') || s.includes('no asistio'))          return 'No vino a cita'
  if (s.includes('economico') || s.includes('económico') || s.includes('precio')) return 'Motivo económico'
  if (s.includes('otro proceso'))                                   return 'Otro proceso'
  return 'Otros'
}

// ── Temporal (día/semana/mes) ────────────────────────────────────────────────
export interface TemporalPoint {
  label: string
  recorridos: number
  contactados: number
  citas: number
  matriculas: number
  contactabilidad: number
}

export function computeTemporal(
  data: LeadRow[],
  cols: CCColMap,
  granularity: 'dia' | 'semana' | 'mes' = 'semana'
): TemporalPoint[] {
  const pivot: Record<string, { recorridos: number; contactados: number; citas: number; matriculas: number }> = {}
  const MES_ORDER = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

  data.forEach(row => {
    let label: string | null = null
    if (granularity === 'semana') {
      label = getVal(row, 'semana', cols)
      if (!label) {
        // Intentar derivar desde fecha
        const fStr = getVal(row, 'fecha', cols)
        if (fStr) {
          const d = new Date(fStr)
          if (!isNaN(d.getTime())) {
            const start = new Date(d); start.setDate(d.getDate() - d.getDay())
            label = `Sem ${start.toISOString().slice(0, 10)}`
          }
        }
      }
    } else if (granularity === 'mes') {
      label = getVal(row, 'mes', cols)
      if (!label) {
        const fStr = getVal(row, 'fecha', cols)
        if (fStr) {
          const d = new Date(fStr)
          if (!isNaN(d.getTime())) label = MES_ORDER[d.getMonth()] || d.toISOString().slice(0, 7)
        }
      }
    } else {
      const fStr = getVal(row, 'fecha', cols)
      if (fStr) {
        const d = new Date(fStr)
        if (!isNaN(d.getTime())) label = d.toISOString().slice(0, 10)
      }
    }
    if (!label) return
    if (!pivot[label]) pivot[label] = { recorridos: 0, contactados: 0, citas: 0, matriculas: 0 }
    pivot[label].recorridos++
    if (isContactado(row, cols)) pivot[label].contactados++
    if (tieneCita(row, cols))    pivot[label].citas++
    if (esMatricula(row, cols))  pivot[label].matriculas++
  })

  const sorted = Object.keys(pivot).sort((a, b) => {
    if (granularity === 'mes') {
      const ai = MES_ORDER.indexOf(norm(a)), bi = MES_ORDER.indexOf(norm(b))
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    }
    return a.localeCompare(b)
  })

  return sorted.map(label => ({
    label,
    ...pivot[label],
    contactabilidad: pivot[label].recorridos > 0 ? pivot[label].contactados / pivot[label].recorridos * 100 : 0,
  }))
}

// ── Proyecciones ─────────────────────────────────────────────────────────────
export interface Proyeccion {
  tipo:       'Conservador' | 'Esperado' | 'Optimista'
  citas:      number
  matriculas: number
  conversion: number
}

export function computeProyecciones(kpis: CCKpiResult, diasRestantes = 20): Proyeccion[] {
  const diasTranscurridos = Math.max(1, 30 - diasRestantes)
  const ritmoRecorridos   = kpis.total / diasTranscurridos
  const tasaContact       = kpis.total > 0 ? kpis.contactados / kpis.total : 0.6
  const tasaCita          = kpis.contactados > 0 ? kpis.citas / kpis.contactados : 0.2
  const tasaMat           = kpis.citas > 0 ? kpis.matriculas / kpis.citas : 0.3

  return ([0.85, 1.0, 1.20] as const).map((factor, i) => {
    const tipo = i === 0 ? 'Conservador' : i === 1 ? 'Esperado' : 'Optimista'
    const recExtra    = ritmoRecorridos * diasRestantes * factor
    const extraCitas  = recExtra * tasaContact * tasaCita
    const extraMats   = extraCitas * tasaMat
    const proyCitas   = Math.round(kpis.citas + extraCitas)
    const proyMats    = Math.round(kpis.matriculas + extraMats)
    const proyTotal   = kpis.total + Math.round(recExtra)
    return {
      tipo,
      citas:      proyCitas,
      matriculas: proyMats,
      conversion: proyTotal > 0 ? (proyMats / proyTotal) * 100 : 0,
    }
  }) as Proyeccion[]
}

// ── Insights automáticos ─────────────────────────────────────────────────────
export interface Insight {
  tipo:    'hallazgo' | 'riesgo' | 'oportunidad' | 'recomendacion'
  titulo:  string
  detalle: string
}

export function computeInsights(
  kpis:       CCKpiResult,
  ejecutivos: EjecutivoStats[],
  carreras:   CarreraStats[],
  regimenes:  RegimenStats[],
  meta:       MetaCC = META_DEFAULT
): Insight[] {
  const insights: Insight[] = []

  // Contactabilidad global
  if (kpis.contactabilidad < meta.contactabilidad * 0.8) {
    insights.push({ tipo: 'riesgo', titulo: 'Contactabilidad crítica', detalle: `Sólo ${kpis.contactabilidad.toFixed(1)}% (meta: ${meta.contactabilidad}%). Revisar calidad de base y horarios de llamada.` })
  } else if (kpis.contactabilidad >= meta.contactabilidad) {
    insights.push({ tipo: 'hallazgo', titulo: 'Contactabilidad sobre meta', detalle: `${kpis.contactabilidad.toFixed(1)}% supera la meta de ${meta.contactabilidad}%.` })
  }

  // Ejecutivos bajo rendimiento
  const rojos = ejecutivos.filter(e => e.semCont === 'rojo' || e.semConv === 'rojo')
  if (rojos.length > 0) {
    insights.push({ tipo: 'riesgo', titulo: `${rojos.length} ejecutivo(s) requieren coaching`, detalle: rojos.slice(0, 3).map(e => e.nombre).join(', ') + ' están bajo meta en contactabilidad o conversión.' })
  }

  // Mejor ejecutivo
  if (ejecutivos.length > 0) {
    const top = ejecutivos[0]
    insights.push({ tipo: 'hallazgo', titulo: `Top ejecutivo: ${top.nombre}`, detalle: `${top.matriculas} matrículas · ${top.contactabilidad.toFixed(0)}% contactabilidad · ${top.convCitaMat.toFixed(0)}% conv. cita→matrícula.` })
  }

  // Carreras con alto recorrido y baja conversión
  const altasBajas = carreras.filter(c => c.recorridos > kpis.total * 0.05 && c.convFinal < 2)
  if (altasBajas.length > 0) {
    insights.push({ tipo: 'oportunidad', titulo: 'Carreras con alto recorrido y baja conversión', detalle: altasBajas.slice(0, 3).map(c => c.carrera.substring(0, 30)).join(', ') + '. Revisar argumentario de venta.' })
  }

  // Mejor régimen por conversión final
  const topReg = [...regimenes].sort((a, b) => b.convFinal - a.convFinal)[0]
  if (topReg) {
    insights.push({ tipo: 'oportunidad', titulo: `Régimen con mayor conversión: ${topReg.regimen}`, detalle: `${topReg.convFinal.toFixed(1)}% conversión final. Enfocar esfuerzos de contacto en este segmento.` })
  }

  // Conversión cita→matrícula
  if (kpis.convCitaMat < meta.convCitaMat * 0.8) {
    insights.push({ tipo: 'recomendacion', titulo: 'Pérdida en cierre de matrícula', detalle: `${kpis.convCitaMat.toFixed(1)}% conversión cita→matrícula (meta: ${meta.convCitaMat}%). Reforzar seguimiento post-cita.` })
  }

  // Conversión contactado→cita
  if (kpis.convContCita < meta.convContCita * 0.8) {
    insights.push({ tipo: 'recomendacion', titulo: 'Baja conversión de contactados a cita', detalle: `${kpis.convContCita.toFixed(1)}% (meta: ${meta.convContCita}%). Revisar el discurso de llamada y training de ejecutivos.` })
  }

  return insights
}

// ── Demo data para CC ─────────────────────────────────────────────────────────
export function generateCCDemoData(): LeadRow[] {
  const ejecutivos = ['Ana García','Carlos López','María Torres','Rodrigo Pérez','Valentina Ruiz','Diego Muñoz','Sofía Vega','Andrés Silva']
  const carreras   = [
    'Ingeniería Civil Industrial', 'Psicología', 'Ingeniería Comercial',
    'Medicina Veterinaria', 'Derecho', 'Pedagogía en Educación Básica',
    'TNS Administración de Empresas', 'Nutrición y Dietética'
  ]
  const regimenes  = ['Online','Executive','Semipresencial','Vespertino','Diurno']
  const bases      = ['Lead','Stock','Inbound','C2C','WhatsApp']
  const campus     = ['Online','Santiago Centro','Providencia','Viña del Mar','Concepción']
  const semanas    = ['Semana 1','Semana 2','Semana 3','Semana 4','Semana 5','Semana 6']
  const meses      = ['Marzo','Abril','Mayo','Junio']
  const seguimientos = [
    'No Contesta','Buzón de Voz','Corta Llamado','Lo está evaluando',
    'Espera documentación','Devolver Llamado','Gestión WhatsApp','No interesado'
  ]

  const now = new Date()

  return Array.from({ length: 500 }, (_, i) => {
    const offset = Math.floor(Math.random() * 90)
    const d = new Date(now); d.setDate(d.getDate() - offset)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')

    const ej = ejecutivos[Math.floor(Math.random() * ejecutivos.length)]
    const base = bases[Math.floor(Math.random() * bases.length)]
    const r  = Math.random()

    // Simular contactabilidad diferenciada por base
    const contRate = base === 'Inbound' ? 0.85 : base === 'WhatsApp' ? 0.75 : base === 'Lead' ? 0.60 : base === 'C2C' ? 0.55 : 0.50
    const contactado = r < contRate

    let seg = seguimientos[Math.floor(Math.random() * seguimientos.length)]
    let cita = false, matricula = false

    if (contactado) {
      cita = Math.random() < 0.22
      if (cita) {
        matricula = Math.random() < 0.28
        seg = matricula ? 'Enviara documentos para Matrícula' : (Math.random() < 0.5 ? 'Lo está evaluando' : 'No vino a cita')
      }
    }

    return {
      'Ejecutivo':  ej,
      'Tipo Base':  base,
      'Carrera':    carreras[Math.floor(Math.random() * carreras.length)],
      'Régimen':    regimenes[Math.floor(Math.random() * regimenes.length)],
      'Campus':     campus[Math.floor(Math.random() * campus.length)],
      'Contactado': contactado ? 'Si' : 'No',
      'Cita':       cita ? 'Si' : 'No',
      'Matrícula':  matricula ? 'Si' : 'No',
      'Seguimiento': seg,
      'Intentos':   Math.floor(Math.random() * 8) + 1,
      'Semana':     semanas[Math.floor(Math.random() * semanas.length)],
      'Mes':        meses[Math.floor(Math.random() * meses.length)],
      'Fecha':      `${d.getFullYear()}-${mm}-${dd}`,
    }
  })
}

export { PALETTE }
