const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const PG_URL = 'postgres://postgres.leputhlygxdxheayzpit:mTQ4zqojkd9BDdlR@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
const TABLE  = 'citas_callcenter'
const CHUNK  = 100

// CSV puede estar en outputs de Claude o en la misma carpeta
const CSV_PATHS = [
  path.join(__dirname, 'citas_callcenter.csv'),
  path.join(process.env.APPDATA || '', 'Claude', 'local-agent-mode-sessions',
    '0b7dc915-a8cd-42fa-ae9b-7b1976a9782d',
    '35e8531f-0476-4ad4-8244-ec3b01c4c174',
    'local_575df501-60a7-4beb-a66a-b6500e51a676',
    'outputs', 'citas_callcenter.csv'),
]

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id                    BIGSERIAL PRIMARY KEY,
  rut                   TEXT,
  asunto                TEXT,
  equipo                TEXT,
  cont_llamadas         INTEGER,
  fecha_creacion        DATE,
  fecha_compromiso      DATE,
  primer_sub_origen     TEXT,
  telefono              TEXT,
  propietario           TEXT,
  campus                TEXT,
  regimen               TEXT,
  carrera               TEXT,
  consultor             TEXT,
  propietario_contacto  TEXT,
  ultimo_interes_cierre TEXT,
  seguimiento_cierre    TEXT,
  interes               TEXT,
  interes_cierre        TEXT,
  prioridad             TEXT,
  semana                TEXT,
  mes                   TEXT,
  banner                TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_${TABLE}_consultor ON ${TABLE}(consultor);
CREATE INDEX IF NOT EXISTS idx_${TABLE}_campus    ON ${TABLE}(campus);
CREATE INDEX IF NOT EXISTS idx_${TABLE}_carrera   ON ${TABLE}(carrera);
CREATE INDEX IF NOT EXISTS idx_${TABLE}_estado    ON ${TABLE}(ultimo_interes_cierre);
CREATE INDEX IF NOT EXISTS idx_${TABLE}_equipo    ON ${TABLE}(equipo);
CREATE INDEX IF NOT EXISTS idx_${TABLE}_mes       ON ${TABLE}(mes);
CREATE INDEX IF NOT EXISTS idx_${TABLE}_fecha     ON ${TABLE}(fecha_creacion);
`

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = []
    let headers = null
    const rl = readline.createInterface({ input: fs.createReadStream(filePath, 'utf8'), crlfDelay: Infinity })
    rl.on('line', line => {
      if (!line.trim()) return
      const cols = line.split(',').map(c => c.trim())
      if (!headers) { headers = cols; return }
      const row = {}
      headers.forEach((h, i) => { row[h] = cols[i] === '' ? null : cols[i] })
      rows.push(row)
    })
    rl.on('close', () => resolve({ headers, rows }))
    rl.on('error', reject)
  })
}

function cleanVal(v, col) {
  if (v === null || v === undefined || v === '') return null
  if (col === 'cont_llamadas') { const n = parseInt(v); return isNaN(n) ? null : n }
  if (col === 'fecha_creacion' || col === 'fecha_compromiso') {
    if (!v || v.length < 8) return null
    const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10)
  }
  return String(v).trim() || null
}

async function main() {
  console.log('\n=== Inyector UDLA Call Center → Supabase ===\n')

  // Encontrar CSV
  let csvPath = null
  for (const p of CSV_PATHS) {
    if (fs.existsSync(p)) { csvPath = p; break }
  }
  if (!csvPath) {
    console.error('ERROR: No se encontró citas_callcenter.csv')
    console.error('Busqué en:', CSV_PATHS.join('\n'))
    process.exit(1)
  }
  console.log('CSV:', csvPath)

  // Conectar a PostgreSQL
  console.log('[1/4] Conectando a Supabase...')
  const client = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('  ✓ Conectado\n')

  // Crear tabla
  console.log('[2/4] Creando tabla e índices...')
  await client.query(CREATE_SQL)
  console.log('  ✓ Tabla lista\n')

  // Limpiar datos previos
  console.log('  Limpiando datos previos...')
  await client.query(`TRUNCATE TABLE ${TABLE} RESTART IDENTITY`)

  // Leer CSV
  console.log('[3/4] Leyendo CSV...')
  const { headers, rows } = await parseCSV(csvPath)
  console.log(`  ✓ ${rows.length} filas · ${headers.length} columnas\n`)

  // Insertar en batches
  console.log('[4/4] Insertando datos...')
  const cols     = headers
  const colList  = cols.map(c => `"${c}"`).join(', ')
  let inserted   = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch  = rows.slice(i, i + CHUNK)
    const values = []
    const params = []
    let   pidx   = 1

    batch.forEach(row => {
      const rowVals = cols.map(c => cleanVal(row[c], c))
      values.push(...rowVals)
      params.push(`(${cols.map(() => `$${pidx++}`).join(', ')})`)
    })

    await client.query(`INSERT INTO ${TABLE} (${colList}) VALUES ${params.join(', ')}`, values)
    inserted += batch.length
    process.stdout.write(`  → ${inserted}/${rows.length} filas\r`)
  }

  await client.end()

  console.log(`\n\n=== ¡LISTO! ===`)
  console.log(`✓ ${inserted} registros en '${TABLE}'`)
  console.log(`✓ Ver tabla: https://supabase.com/dashboard/project/leputhlygxdxheayzpit/editor`)
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1) })
