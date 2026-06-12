@echo off
echo ============================================
echo  UDLA Call Center - Inyector Supabase
echo ============================================
echo.

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no esta instalado.
    echo Descarga desde https://python.org/downloads
    pause
    exit /b 1
)

REM Instalar dependencias silenciosamente
echo Instalando dependencias...
python -m pip install psycopg2-binary openpyxl --quiet --disable-pip-version-check

REM Ejecutar inyector
echo.
python "%~dp0inject_supabase.py"
