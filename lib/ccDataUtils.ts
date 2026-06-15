import { LeadRow, getVal, norm, detectCol, PALETTE } from './dataUtils'

// ── CC Column Aliases ─────────────────────────────────────────────────────────
// Basado en la BBDD real: "Gestion Call center Admision Directa.xlsx"
export const CC_COL_ALIASES: Record<string, string[]> = {
  ejecutivo:    ['agente','ejecutivo','consultor','asesor','llamada a','llamada_a','propietario'],
  conecta:      ['conecta','conectado','contactado','fue contactado','contacto'],
  interesa:     ['interesa','interés','interes'],
  matricula:    ['matricula','matrícula','enrollment','inscrito'],
  base:         ['tipo base','tipo_base','base','tipo lead','origen base'],
  intentos:     ['intentos','cont. llamadas','cont llamadas','num llamadas','cantidad llamadas'],
  estado:       ['estado','status','resultado','resultado llamada'],
  seguimiento:  ['seguimiento','causa no cita','motivo no cita','razon'],
  regimen:      ['regimen','régimen','modalidad','jornada','regimen interes 1','régimen interés 1'],
  carrera:      ['carrera','programa','carrera de interes','carrera de interés'],
  campus:       ['campus','sede'],
  suborigen:    ['sub origen','suborigen','primer sub origen','origen'],
  fecha:        ['fecha gestion','fecha_gestion','fecha llamada','fecha de cracion','fecha de creacion','fecha','createdate'],
  semana:       ['semana','week'],
  mes:          ['mes','month'],
  equipo:       ['equipo','marketing5','team'],
}

export type CCColMap = Record<string, string | null>

export function mapCCColumns(headers: string[]): CCColMap {
  const cols: CCColMap = {}
  for (const [key, aliases] of Object.entries(CC_COL_ALIASES)) {
    cols[key] = detectCol(headers, aliases)
  }
  return cols
}

// ── Helpers de clasificación (reglas oficiales UDLA) ─────────────────────────

/**
 * CONTACTADO (Método Operacional):
 * Columna "Conecta" == "Conecta"
 * Si no existe la columna, se deriva: Interesa != "No Contactado"
 */
export function isContactado(row: LeadRow, cols: CCColMap): boolean {
  const conectaVal = getVal(row, 'conecta', cols)
  if (conectaVal !== null) {
    return norm(conectaVal) === 'conecta'
  }
  // Fallback: si existe columna interesa, No Contactado = no contactado
  const interesaVal = getVal(row, 'interesa', cols)
  if (interesaVal !== null) {
    return norm(interesaVal) !== 'no contactado'
  }
  // Último fallback: derivar del estado
  const estado = norm(getVal(row, 'estado', cols) || '')
  const NO_CONTACT = ['no contesta','no contactado','buzon','buzón','fono fuera','sin respuesta','no responde','numero incorrecto','fuera de servicio']
  return !NO_CONTACT.some(t => estado.includes(t))
}

/**
 * CITA (Viene):
 * Columna "Interesa" == "Viene"
 * Si no existe la columna, se deriva del estado/seguimiento
 */
export function tieneCita(row: LeadRow, cols: CCColMap): boolean {
  const interesaVal = getVal(row, 'interesa', cols)
  if (interesaVal !== null) {
    return norm(interesaVal) === 'viene'
  }
  // Fallback: columna cita explícita (Si/No)
  const estado = norm(getVal(row, 'estado', cols) || '')
  const seg    = norm(getVal(row, 'seguimiento', cols) || '')
  const CON_CITA = ['viene a matricula','viene a cita','agenda cita','tiene cita']
  return CON_CITA.some(t => estado.includes(t) || seg.includes(t))
}

/**
 * AFLUENCIA (A + M + MC):
 * Columna "Matricula" IN ['A', 'M', 'MC']
 * Toda matrícula es también una afluencia.
 */
export function esAfluencia(row: LeadRow, cols: CCColMap): boolean {
  const v = (getVal(row, 'matricula', cols) || '').trim().toUpperCase()
  return v === 'A' || v === 'M' || v === 'MC'
}

/**
 * MATRÍCULA (M + MC):
 * Columna "Matricula" IN ['M', 'MC']
 */
export function esMatricula(row: LeadRow, cols: CCColMap): boolean {
  const v = (getVal(row, 'matricula', cols) || '').trim().toUpperCase()
  return v === 'M' || v === 'MC'
}

// ── KPIs (10 KPIs oficiales UDLA) ────────────────────────────────────────────
export interface CCKpiResult {
  // Volúmenes del embudo
  total:             number   // 1. Recorridos
  contactados:       number   // 2. Contactados
  noContactados:     number
  citas:             number   // 3. Citas (Viene)
  afluencias:        number   // 4. Afluencia (A+M+MC)
  matriculas:        number   // 5. Matrículas (M+MC)
  // Tasas de conversión
  contactabilidad:   number   // 2b. Contactados / Recorridos
  convContCita:      number   // 4. Citas / Contactados
  convCitaAf:        number   // 6. Afluencia / Citas
  convAfMat:         number   // 8. Matrículas / Afluencia
  convLeadMat:       number   // 9. Matrículas / Recorridos
  // Productividad
  promedioIntentos:  number
  ejecutivos:        number   // 10. Productividad (recorridos / ejecutivos)
  productividad:     number   // recorridos / ejecutivos
}

export function computeCCKpis(data: LeadRow[], cols: CCColMap): CCKpiResult {
  let contactados = 0, citas = 0, afluencias = 0, matriculas = 0
  let sumIntentos = 0, intentosCnt = 0
  const ejecutivosSet = new Set<string>()

  data.forEach(row => {
    if (isContactado(row, cols)) contactados++
    if (tieneCita(row, cols))    citas++
    if (esAfluencia(row, cols))  afluencias++
    if (esMatricula(row, cols))  matriculas++

    const intCol = cols['intentos']
    if (intCol) {
      const v = parseFloat(String(row[intCol] ?? ''))
      if (!isNaN(v) && v > 0) { sumIntentos += v; intentosCnt++ }
    }
    const ej = getVal(row, 'ejecutivo', cols)
    if (ej) ejecutivosSet.add(ej)
  })

  const total         = data.length
  const noContactados = total - contactados
  const numEjecutivos = ejecutivosSet.size || 1

  return {
    total,
    contactados,
    noContactados,
    citas,
    afluencias,
    matriculas,
    contactabilidad:   total      > 0 ? contactados / total      * 100 : 0,
    convContCita:      contactados > 0 ? citas       / contactados * 100 : 0,
    convCitaAf:        citas       > 0 ? afluencias  / citas       * 100 : 0,
    convAfMat:         afluencias  > 0 ? matriculas  / afluencias  * 100 : 0,
    convLeadMat:       total       > 0 ? matriculas  / total       * 100 : 0,
    promedioIntentos:  intentosCnt > 0 ? sumIntentos / intentosCnt : 0,
    ejecutivos:        numEjecutivos,
    productividad:     numEjecutivos > 0 ? total / numEjecutivos : 0,
  }
}

// ── Semáforo ──────────────────────────────────────────────────────────────────
export interface MetaCC {
  contactabilidad: number   // % default 50
  convContCita:    number   // % default 22
  convCitaAf:      number   // % default 20
  convAfMat:       number   // % default 50
}

export const META_DEFAULT: MetaCC = {
  contactabilidad: 50,
  convContCita:    22,
  convCitaAf:      20,
  convAfMat:       50,
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo'

export function semaforo(value: number, meta: number): Semaforo {
  if (value >= meta)        return 'verde'
  if (value >= meta * 0.80) return 'amarillo'
  return 'rojo'
}

export const SEMAFORO_COLORS: Record<Semaforo, { bg: string; text: string; label: string }> = {
  verde:    { bg: '#DCFCE7', text: '#16A34A', label: '🟢 Sobre meta' },
  amarillo: { bg: '#FEF9C3', text: '#CA8A04', label: '🟡 Cerca de meta' },
  rojo:     { bg: '#FEE2E2', text: '#DC2626', label: '🔴 Bajo desempeño' },
}

// ── Análisis por Ejecutivo ────────────────────────────────────────────────────
export interface EjecutivoStats {
  nombre:           string
  recorridos:       number
  contactados:      number
  noContactados:    number
  citas:            number
  afluencias:       number
  matriculas:       number
  contactabilidad:  number
  convContCita:     number
  convCitaAf:       number
  convAfMat:        number
  convFinal:        number
  promedioIntentos: number
  semCont:          Semaforo
  semConv:          Semaforo
  semMat:           Semaforo
}

export function computeByEjecutivo(data: LeadRow[], cols: CCColMap, meta: MetaCC = META_DEFAULT): EjecutivoStats[] {
  const pivot: Record<string, {
    recorridos: number; contactados: number; citas: number
    afluencias: number; matriculas: number
    intentos: number; intentosCnt: number
  }> = {}

  data.forEach(row => {
    const ej = getVal(row, 'ejecutivo', cols) || 'Sin asignar'
    if (!pivot[ej]) pivot[ej] = { recorridos:0, contactados:0, citas:0, afluencias:0, matriculas:0, intentos:0, intentosCnt:0 }
    pivot[ej].recorridos++
    if (isContactado(row, cols)) pivot[ej].contactados++
    if (tieneCita(row, cols))    pivot[ej].citas++
    if (esAfluencia(row, cols))  pivot[ej].afluencias++
    if (esMatricula(row, cols))  pivot[ej].matriculas++
    const intCol = cols['intentos']
    if (intCol) {
      const v = parseFloat(String(row[intCol] ?? ''))
      if (!isNaN(v) && v > 0) { pivot[ej].intentos += v; pivot[ej].intentosCnt++ }
    }
  })

  return Object.entries(pivot)
    .map(([nombre, v]) => {
      const contactabilidad = v.recorridos   > 0 ? v.contactados / v.recorridos   * 100 : 0
      const convContCita    = v.contactados  > 0 ? v.citas       / v.contactados  * 100 : 0
      const convCitaAf      = v.citas        > 0 ? v.afluencias  / v.citas        * 100 : 0
      const convAfMat       = v.afluencias   > 0 ? v.matriculas  / v.afluencias   * 100 : 0
      const convFinal       = v.recorridos   > 0 ? v.matriculas  / v.recorridos   * 100 : 0
      return {
        nombre,
        recorridos:       v.recorridos,
        contactados:      v.contactados,
        noContactados:    v.recorridos - v.contactados,
        citas:            v.citas,
        afluencias:       v.afluencias,
        matriculas:       v.matriculas,
        contactabilidad,
        convContCita,
        convCitaAf,
        convAfMat,
        convFinal,
        promedioIntentos: v.intentosCnt > 0 ? v.intentos / v.intentosCnt : 0,
        semCont: semaforo(contactabilidad, meta.contactabilidad),
        semConv: semaforo(convContCita,    meta.convContCita),
        semMat:  semaforo(convAfMat,       meta.convAfMat),
      }
    })
    .sort((a, b) => b.matriculas - a.matriculas)
}

// ── Análisis por Régimen ──────────────────────────────────────────────────────
export interface RegimenStats {
  regimen:         string
  recorridos:      number
  contactados:     number
  citas:           number
  afluencias:      number
  matriculas:      number
  contactabilidad: number
  convContCita:    number
  convCitaAf:      number
  convAfMat:       number
  convFinal:       number
}

export function computeByRegimen(data: LeadRow[], cols: CCColMap): RegimenStats[] {
  const pivot: Record<string, { recorridos:number; contactados:number; citas:number; afluencias:number; matriculas:number }> = {}
  data.forEach(row => {
    const r = getVal(row, 'regimen', cols) || 'Sin régimen'
    if (!pivot[r]) pivot[r] = { recorridos:0, contactados:0, citas:0, afluencias:0, matriculas:0 }
    pivot[r].recorridos++
    if (isContactado(row, cols)) pivot[r].contactados++
    if (tieneCita(row, cols))    pivot[r].citas++
    if (esAfluencia(row, cols))  pivot[r].afluencias++
    if (esMatricula(row, cols))  pivot[r].matriculas++
  })
  return Object.entries(pivot)
    .map(([regimen, v]) => ({
      regimen,
      recorridos:      v.recorridos,
      contactados:     v.contactados,
      citas:           v.citas,
      afluencias:      v.afluencias,
      matriculas:      v.matriculas,
      contactabilidad: v.recorridos  > 0 ? v.contactados / v.recorridos  * 100 : 0,
      convContCita:    v.contactados > 0 ? v.citas       / v.contactados * 100 : 0,
      convCitaAf:      v.citas       > 0 ? v.afluencias  / v.citas       * 100 : 0,
      convAfMat:       v.afluencias  > 0 ? v.matriculas  / v.afluencias  * 100 : 0,
      convFinal:       v.recorridos  > 0 ? v.matriculas  / v.recorridos  * 100 : 0,
    }))
    .sort((a, b) => b.citas - a.citas)
}

// ── Análisis por Carrera ──────────────────────────────────────────────────────
export interface CarreraStats {
  carrera:         string
  recorridos:      number
  contactados:     number
  citas:           number
  afluencias:      number
  matriculas:      number
  contactabilidad: number
  convContCita:    number
  convCitaAf:      number
  convAfMat:       number
  convFinal:       number
}

export function computeByCarrera(data: LeadRow[], cols: CCColMap): CarreraStats[] {
  const pivot: Record<string, { recorridos:number; contactados:number; citas:number; afluencias:number; matriculas:number }> = {}
  data.forEach(row => {
    const c = getVal(row, 'carrera', cols) || 'Sin carrera'
    if (!pivot[c]) pivot[c] = { recorridos:0, contactados:0, citas:0, afluencias:0, matriculas:0 }
    pivot[c].recorridos++
    if (isContactado(row, cols)) pivot[c].contactados++
    if (tieneCita(row, cols))    pivot[c].citas++
    if (esAfluencia(row, cols))  pivot[c].afluencias++
    if (esMatricula(row, cols))  pivot[c].matriculas++
  })
  return Object.entries(pivot)
    .map(([carrera, v]) => ({
      carrera,
      recorridos:      v.recorridos,
      contactados:     v.contactados,
      citas:           v.citas,
      afluencias:      v.afluencias,
      matriculas:      v.matriculas,
      contactabilidad: v.recorridos  > 0 ? v.contactados / v.recorridos  * 100 : 0,
      convContCita:    v.contactados > 0 ? v.citas       / v.contactados * 100 : 0,
      convCitaAf:      v.citas       > 0 ? v.afluencias  / v.citas       * 100 : 0,
      convAfMat:       v.afluencias  > 0 ? v.matriculas  / v.afluencias  * 100 : 0,
      convFinal:       v.recorridos  > 0 ? v.matriculas  / v.recorridos  * 100 : 0,
    }))
    .sort((a, b) => b.citas - a.citas)
}

// ── Análisis por Tipo Base ────────────────────────────────────────────────────
export interface BaseStats {
  base:            string
  recorridos:      number
  contactados:     number
  citas:           number
  afluencias:      number
  matriculas:      number
  contactabilidad: number
  convContCita:    number
  convCitaAf:      number
  convFinal:       number
}

export function computeByBase(data: LeadRow[], cols: CCColMap): BaseStats[] {
  const pivot: Record<string, { recorridos:number; contactados:number; citas:number; afluencias:number; matriculas:number }> = {}
  data.forEach(row => {
    const b = getVal(row, 'base', cols) || getVal(row, 'suborigen', cols) || 'Otro'
    if (!pivot[b]) pivot[b] = { recorridos:0, contactados:0, citas:0, afluencias:0, matriculas:0 }
    pivot[b].recorridos++
    if (isContactado(row, cols)) pivot[b].contactados++
    if (tieneCita(row, cols))    pivot[b].citas++
    if (esAfluencia(row, cols))  pivot[b].afluencias++
    if (esMatricula(row, cols))  pivot[b].matriculas++
  })
  return Object.entries(pivot)
    .map(([base, v]) => ({
      base,
      recorridos:      v.recorridos,
      contactados:     v.contactados,
      citas:           v.citas,
      afluencias:      v.afluencias,
      matriculas:      v.matriculas,
      contactabilidad: v.recorridos  > 0 ? v.contactados / v.recorridos  * 100 : 0,
      convContCita:    v.contactados > 0 ? v.citas       / v.contactados * 100 : 0,
      convCitaAf:      v.citas       > 0 ? v.afluencias  / v.citas       * 100 : 0,
      convFinal:       v.recorridos  > 0 ? v.matriculas  / v.recorridos  * 100 : 0,
    }))
    .sort((a, b) => b.recorridos - a.recorridos)
}

// ── Causa Raíz ────────────────────────────────────────────────────────────────
export interface CausaStats { causa: string; count: number; pct: number }

export function computeCausaRaiz(data: LeadRow[], cols: CCColMap): { noCita: CausaStats[]; noMat: CausaStats[] } {
  const noCitaCounts: Record<string, number> = {}
  const noMatCounts:  Record<string, number> = {}

  data.forEach(row => {
    const seg    = norm(getVal(row, 'seguimiento', cols) || getVal(row, 'estado', cols) || '')
    const isCita = tieneCita(row, cols)
    const isMat  = esMatricula(row, cols)

    if (!isCita) {
      const causa = clasificarCausaNoCita(seg)
      noCitaCounts[causa] = (noCitaCounts[causa] || 0) + 1
    }
    if (isCita && !isMat) {
      const causa = clasificarCausaNoMat(seg)
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

function clasificarCausaNoCita(s: string): string {
  if (s.includes('no contesta'))                               return 'No Contesta'
  if (s.includes('buzon') || s.includes('buzón'))             return 'Buzón de Voz'
  if (s.includes('corta'))                                     return 'Corta Llamado'
  if (s.includes('sin planes'))                                return 'Sin Planes de Estudio'
  if (s.includes('equivocado'))                                return 'Número Equivocado'
  if (s.includes('no disponible') || s.includes('no imparte') || s.includes('carrera no')) return 'Carrera No Disponible'
  if (s.includes('otro proceso'))                              return 'Otro Proceso'
  if (s.includes('vigente'))                                   return 'Estudiante Vigente UDLA'
  if (s.includes('no califica'))                               return 'No Califica'
  if (s.includes('molesto'))                                   return 'Molesto'
  if (s.includes('problemas personales'))                      return 'Problemas Personales'
  if (s.includes('gratuidad'))                                 return 'Gratuidad'
  if (s.includes('cae'))                                       return 'CAE'
  if (s.includes('preparacion') || s.includes('preuniversitaria')) return 'Preuniversitaria'
  return 'Otros'
}

function clasificarCausaNoMat(s: string): string {
  if (s.includes('indeciso'))                                  return 'Indeciso'
  if (s.includes('evaluando'))                                 return 'Evaluando otra opción'
  if (s.includes('documentacion') || s.includes('documentos')) return 'Falta Documentación'
  if (s.includes('no viene') || s.includes('no asistio'))     return 'No Vino a Cita'
  if (s.includes('economico') || s.includes('precio'))        return 'Motivo Económico'
  if (s.includes('otro proceso'))                              return 'Otro Proceso'
  if (s.includes('volver'))                                    return 'Volver a Llamar'
  return 'Otros'
}

// ── Temporal ──────────────────────────────────────────────────────────────────
export interface TemporalPoint {
  label:           string
  recorridos:      number
  contactados:     number
  citas:           number
  afluencias:      number
  matriculas:      number
  contactabilidad: number
}

export function computeTemporal(
  data: LeadRow[],
  cols: CCColMap,
  granularity: 'dia' | 'semana' | 'mes' = 'semana'
): TemporalPoint[] {
  const pivot: Record<string, { recorridos:number; contactados:number; citas:number; afluencias:number; matriculas:number }> = {}
  const MES_ORDER = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

  data.forEach(row => {
    let label: string | null = null
    if (granularity === 'semana') {
      label = getVal(row, 'semana', cols)
      if (!label) {
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
    if (!pivot[label]) pivot[label] = { recorridos:0, contactados:0, citas:0, afluencias:0, matriculas:0 }
    pivot[label].recorridos++
    if (isContactado(row, cols)) pivot[label].contactados++
    if (tieneCita(row, cols))    pivot[label].citas++
    if (esAfluencia(row, cols))  pivot[label].afluencias++
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

// ── Proyecciones (nuevo embudo completo) ──────────────────────────────────────
export interface Proyeccion {
  tipo:        'Conservador' | 'Esperado' | 'Optimista'
  recorridos:  number
  citas:       number
  afluencias:  number
  matriculas:  number
  convFinal:   number
}

export function computeProyecciones(kpis: CCKpiResult, diasRestantes = 20): Proyeccion[] {
  const diasTranscurridos = Math.max(1, 30 - diasRestantes)
  const ritmo     = kpis.total       / diasTranscurridos
  const tasaCont  = kpis.total       > 0 ? kpis.contactados / kpis.total       : 0.50
  const tasaCita  = kpis.contactados > 0 ? kpis.citas       / kpis.contactados : 0.22
  const tasaAf    = kpis.citas       > 0 ? kpis.afluencias  / kpis.citas       : 0.20
  const tasaMat   = kpis.afluencias  > 0 ? kpis.matriculas  / kpis.afluencias  : 0.50

  return ([0.85, 1.0, 1.20] as const).map((factor, i) => {
    const tipo       = i === 0 ? 'Conservador' : i === 1 ? 'Esperado' : 'Optimista'
    const extRec     = ritmo * diasRestantes * factor
    const extCitas   = extRec * tasaCont * tasaCita
    const extAf      = extCitas * tasaAf
    const extMat     = extAf * tasaMat
    const proyRec    = kpis.total      + Math.round(extRec)
    const proyCitas  = kpis.citas      + Math.round(extCitas)
    const proyAf     = kpis.afluencias + Math.round(extAf)
    const proyMat    = kpis.matriculas + Math.round(extMat)
    return {
      tipo,
      recorridos:  proyRec,
      citas:       proyCitas,
      afluencias:  proyAf,
      matriculas:  proyMat,
      convFinal:   proyRec > 0 ? proyMat / proyRec * 100 : 0,
    }
  }) as Proyeccion[]
}

// ── Insights automáticos ──────────────────────────────────────────────────────
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

  // Contactabilidad
  if (kpis.contactabilidad >= meta.contactabilidad)
    insights.push({ tipo: 'hallazgo', titulo: 'Contactabilidad sobre meta', detalle: `${kpis.contactabilidad.toFixed(1)}% supera la meta de ${meta.contactabilidad}%.` })
  else
    insights.push({ tipo: 'riesgo', titulo: 'Contactabilidad bajo meta', detalle: `${kpis.contactabilidad.toFixed(1)}% vs meta ${meta.contactabilidad}%. Revisar calidad de base y horarios.` })

  // Conversión cita → afluencia
  if (kpis.convCitaAf < meta.convCitaAf * 0.8)
    insights.push({ tipo: 'riesgo', titulo: 'Baja conversión Cita → Afluencia', detalle: `${kpis.convCitaAf.toFixed(1)}% (meta: ${meta.convCitaAf}%). Muchos prospectos no llegan a la cita confirmada.` })

  // Conversión afluencia → matrícula
  if (kpis.convAfMat >= meta.convAfMat)
    insights.push({ tipo: 'hallazgo', titulo: 'Excelente cierre de matrícula', detalle: `${kpis.convAfMat.toFixed(1)}% de afluencias se convierten en matrícula. Sobre la meta de ${meta.convAfMat}%.` })
  else if (kpis.convAfMat < meta.convAfMat * 0.8)
    insights.push({ tipo: 'riesgo', titulo: 'Pérdida en cierre Afluencia → Matrícula', detalle: `${kpis.convAfMat.toFixed(1)}% (meta: ${meta.convAfMat}%). Reforzar seguimiento post-cita y discurso de cierre.` })

  // Top ejecutivo
  if (ejecutivos.length > 0) {
    const top = ejecutivos[0]
    insights.push({ tipo: 'hallazgo', titulo: `Top ejecutivo: ${top.nombre}`, detalle: `${top.matriculas} matrículas · ${top.contactabilidad.toFixed(0)}% contactabilidad · ${top.convAfMat.toFixed(0)}% conv. AF→Mat.` })
  }

  // Ejecutivos bajo rendimiento
  const rojos = ejecutivos.filter(e => e.semCont === 'rojo' || e.semMat === 'rojo')
  if (rojos.length > 0)
    insights.push({ tipo: 'riesgo', titulo: `${rojos.length} ejecutivo(s) bajo meta crítica`, detalle: rojos.slice(0, 3).map(e => e.nombre).join(', ') + ' requieren coaching inmediato.' })

  // Carreras alta demanda / baja conversión
  const altasBajas = carreras.filter(c => c.recorridos > kpis.total * 0.05 && c.convFinal < 0.5)
  if (altasBajas.length > 0)
    insights.push({ tipo: 'oportunidad', titulo: 'Carreras con alta demanda y baja conversión', detalle: altasBajas.slice(0, 3).map(c => c.carrera.substring(0, 30)).join(', ') + '. Revisar argumentario de venta.' })

  // Mejor régimen
  const topReg = [...regimenes].sort((a, b) => b.convFinal - a.convFinal)[0]
  if (topReg)
    insights.push({ tipo: 'oportunidad', titulo: `Régimen con mayor conversión: ${topReg.regimen}`, detalle: `${topReg.convFinal.toFixed(2)}% conv. final. Priorizar en próximas campañas.` })

  // Recomendaciones
  if (kpis.convContCita < meta.convContCita * 0.8)
    insights.push({ tipo: 'recomendacion', titulo: 'Mejorar conversión Contactado → Cita', detalle: `${kpis.convContCita.toFixed(1)}% (meta: ${meta.convContCita}%). Revisar discurso de llamada y training de ejecutivos.` })
  insights.push({ tipo: 'recomendacion', titulo: 'Productividad por ejecutivo', detalle: `Promedio de ${kpis.productividad.toFixed(0)} recorridos por ejecutivo. Benchmark para redistribución de carga.` })

  return insights
}

// ── Demo data (estructura real BBDD UDLA) ─────────────────────────────────────
export function generateCCDemoData(): LeadRow[] {
  const agentes  = ['PAOLA CARDENAS','MARIA VASQUEZ','GONZALO BUSTAMANTE','RODRIGO PEREZ','VALENTINA RUIZ','DIEGO MUÑOZ','SOFIA VEGA','ANDRES SILVA']
  const carreras = ['Ingeniería Civil Industrial','Psicología','Ingeniería Comercial','Medicina Veterinaria','Derecho','Enfermería','Nutrición y Dietética','Terapia Ocupacional']
  const regimenes = ['DIURNO','SEMIPRESENCIAL VESPERTINO','ONLINE','EXECUTIVE','VESPERTINO']
  const bases    = ['Lead','Stock','Inbound','C2C','WhatsApp']
  const semanas  = ['Semana 1','Semana 2','Semana 3','Semana 4','Semana 5','Semana 6']
  const meses    = ['marzo','abril','mayo','junio']
  const seguimientos = ['No Contesta','Buzón de Voz','Corta Llamado','Sin Planes de Estudio','Equivocado','Otro Proceso','Carrera No Disponible UDLA','Viene a Matrícula','Volver a Llamar']
  const suborigen = ['POSTULACION ADMISION DIRECTA SAC','SOLICITA INFORMACIÓN FLEX','MALLA FLEX','LEAD ORGANICO','REFERIDO']

  const now = new Date()

  return Array.from({ length: 500 }, (_, i) => {
    const offset = Math.floor(Math.random() * 90)
    const d = new Date(now); d.setDate(d.getDate() - offset)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')

    const base   = bases[Math.floor(Math.random() * bases.length)]
    const contRate = base === 'Inbound' ? 0.85 : base === 'WhatsApp' ? 0.75 : 0.50
    const contactado = Math.random() < contRate

    let interesa  = 'No Contactado'
    let conecta   = 'No Conecta'
    let matricula: string | null = null
    let seg = seguimientos[Math.floor(Math.random() * 4)] // No Contesta, Buzon, Corta, Sin planes

    if (contactado) {
      conecta = 'Conecta'
      const r = Math.random()
      if (r < 0.22) {
        interesa = 'Viene'
        seg = 'Viene a Matrícula'
        const r2 = Math.random()
        if (r2 < 0.19)       { matricula = 'A' }
        else if (r2 < 0.19 + 0.49 * 0.19) { matricula = 'MC' }
        else if (r2 < 0.19 + 0.49 * 0.20) { matricula = 'M' }
      } else if (r < 0.22 + 0.70) {
        interesa = 'No Viene'
        seg = seguimientos[4 + Math.floor(Math.random() * 3)]
      } else {
        interesa = 'Volver a llamar '
        seg = 'Volver a Llamar'
      }
    }

    return {
      'Tipo Llamada': 'Outbound',
      'Id':            String(250000 + i),
      'Tipo Base':     base,
      'Fecha Gestion': `${d.getFullYear()}-${mm}-${dd}`,
      'Agente':        agentes[Math.floor(Math.random() * agentes.length)],
      'Estado':        'Terminado',
      'Intentos':      Math.floor(Math.random() * 8) + 1,
      'Conecta':       conecta,
      'No Conecta':    conecta === 'No Conecta' ? seguimientos[Math.floor(Math.random() * 3)] : null,
      'Interesa':      interesa,
      'Seguimiento':   seg,
      'SUB ORIGEN':    suborigen[Math.floor(Math.random() * suborigen.length)],
      'Semana':        semanas[Math.floor(Math.random() * semanas.length)],
      'Mes':           meses[Math.floor(Math.random() * meses.length)],
      'Carrera':       carreras[Math.floor(Math.random() * carreras.length)],
      'Regimen':       regimenes[Math.floor(Math.random() * regimenes.length)],
      'Matricula':     matricula,
    }
  })
}

export { PALETTE }
