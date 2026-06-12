# run_inject.ps1 — Inyector UDLA Call Center → Supabase
# Corre desde C:\temp\ para evitar que OneDrive congele npm install

$ErrorActionPreference = "Stop"
$TEMP_DIR  = "C:\temp\udla_inject"
$PROJ_DIR  = Split-Path -Parent $MyInvocation.MyCommand.Definition

# CSV generado por Claude (outputs)
$CSV_SRC   = Join-Path $env:APPDATA "Claude\local-agent-mode-sessions\0b7dc915-a8cd-42fa-ae9b-7b1976a9782d\35e8531f-0476-4ad4-8244-ec3b01c4c174\local_575df501-60a7-4beb-a66a-b6500e51a676\outputs\citas_callcenter.csv"

Write-Host ""
Write-Host "=== UDLA Call Center → Supabase ===" -ForegroundColor Cyan
Write-Host ""

# 1. Crear directorio temporal fuera de OneDrive
Write-Host "[1/5] Creando directorio temporal: $TEMP_DIR"
if (Test-Path $TEMP_DIR) { Remove-Item $TEMP_DIR -Recurse -Force }
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null
Write-Host "  OK" -ForegroundColor Green

# 2. Copiar archivos necesarios
Write-Host "[2/5] Copiando archivos..."
Copy-Item "$PROJ_DIR\inject.js"     "$TEMP_DIR\inject.js"
Copy-Item "$PROJ_DIR\package.json"  "$TEMP_DIR\package.json"

# Copiar CSV — buscar en varias ubicaciones
$CSV_FOUND = $false
$CSV_CANDIDATES = @(
    $CSV_SRC,
    "$PROJ_DIR\citas_callcenter.csv",
    (Join-Path (Split-Path $PROJ_DIR -Parent) "citas_callcenter.csv")
)
foreach ($c in $CSV_CANDIDATES) {
    if (Test-Path $c) {
        Copy-Item $c "$TEMP_DIR\citas_callcenter.csv"
        Write-Host "  CSV copiado: $c" -ForegroundColor Green
        $CSV_FOUND = $true
        break
    }
}
if (-not $CSV_FOUND) {
    Write-Host "  ERROR: No se encontró citas_callcenter.csv en ninguna ruta" -ForegroundColor Red
    Write-Host "  Rutas buscadas:" -ForegroundColor Red
    $CSV_CANDIDATES | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    exit 1
}
Write-Host "  Archivos listos" -ForegroundColor Green

# 3. npm install desde directorio temporal
Write-Host "[3/5] Instalando dependencias npm (pg)..."
Set-Location $TEMP_DIR
& npm install --no-fund --no-audit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en npm install" -ForegroundColor Red; exit 1
}
Write-Host "  OK" -ForegroundColor Green

# 4. Ejecutar inyector
Write-Host ""
Write-Host "[4/5] Ejecutando inyector Node.js..."
Write-Host ""
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
& node inject.js
$exitCode = $LASTEXITCODE

# 5. Limpiar
Write-Host ""
Write-Host "[5/5] Limpiando temporal..."
Set-Location $PROJ_DIR
# Remove-Item $TEMP_DIR -Recurse -Force   # descomenta para limpiar automático

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "=== TODO LISTO ===" -ForegroundColor Green
    Write-Host "Verifica en: https://supabase.com/dashboard/project/leputhlygxdxheayzpit/editor" -ForegroundColor Cyan
} else {
    Write-Host "El script terminó con errores (código $exitCode)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Presiona Enter para cerrar"
