# ============================================
# Backup de Base de Datos Supabase
# Ejecutar: .\backup-db.ps1
# Requiere: pg_dump (viene con PostgreSQL)
# ============================================

$DB_HOST     = "db.qfvdawqnfxoxzmpgqhaa.supabase.co"
$DB_NAME     = "postgres"
$DB_USER     = "postgres"
$DB_PORT     = "5432"
$BACKUP_DIR  = "backups"
$DATE        = Get-Date -Format "yyyy-MM-dd_HH-mm"

# Verificar que pg_dump existe
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "`nERROR: pg_dump no encontrado." -ForegroundColor Red
    Write-Host "Instala PostgreSQL desde: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Durante la instalacion, asegurate de incluir 'Command Line Tools'.`n"
    exit 1
}

if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "`n=== Backup Supabase - $DATE ===" -ForegroundColor Cyan
Write-Host "Se te pedira la contrasena de tu base de datos Supabase.`n"

Write-Host "[1/2] Descargando schema (estructura de tablas)..." -ForegroundColor Yellow
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --schema-only -f "$BACKUP_DIR/schema_$DATE.sql"

Write-Host "[2/2] Descargando datos..." -ForegroundColor Yellow
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --data-only -f "$BACKUP_DIR/data_$DATE.sql"

# Verificar que los archivos tienen contenido
$schemaSize = (Get-Item "$BACKUP_DIR/schema_$DATE.sql" -ErrorAction SilentlyContinue).Length
$dataSize   = (Get-Item "$BACKUP_DIR/data_$DATE.sql" -ErrorAction SilentlyContinue).Length

if ($schemaSize -gt 0 -and $dataSize -gt 0) {
    Write-Host "`n=== Backup completado ===" -ForegroundColor Green
    Write-Host "  - schema_$DATE.sql ($([math]::Round($schemaSize/1KB,1)) KB)"
    Write-Host "  - data_$DATE.sql ($([math]::Round($dataSize/1KB,1)) KB)`n"
} else {
    Write-Host "`nERROR: Los archivos estan vacios. Verifica tu contrasena.`n" -ForegroundColor Red
    exit 1
}

# Limpiar backups viejos (mantener ultimos 10)
$files = Get-ChildItem "$BACKUP_DIR/*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10
if ($files) {
    $files | Remove-Item -Force -Confirm:$false
    Write-Host "Se eliminaron $($files.Count) backups antiguos.`n" -ForegroundColor DarkGray
}
