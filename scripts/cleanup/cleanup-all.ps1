# FoodieHub Full Cleanup Script (PowerShell)
# Wipes all MySQL tables and MongoDB collections.
# Run from the project root: .\scripts\cleanup\cleanup-all.ps1

param(
    [string]$MysqlUser     = "root",
    [string]$MysqlPassword = "root",
    [string]$MysqlDb       = "foodiehub",
    [string]$MongoHost     = "localhost:27017",
    [string]$MongoDb       = "foodiehub_food"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  FoodieHub -- Full Database Cleanup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "WARNING: This will delete ALL data from:" -ForegroundColor Red
Write-Host "  MySQL   -> $MysqlDb" -ForegroundColor Red
Write-Host "  MongoDB -> $MongoDb" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Type YES to continue"
if ($confirm -ne "YES") {
    Write-Host "Cancelled." -ForegroundColor Cyan
    exit 0
}

# --- MySQL ---
Write-Host ""
Write-Host "Running MySQL cleanup..." -ForegroundColor Cyan
mysql -u $MysqlUser "-p$MysqlPassword" $MysqlDb `
    "--execute=source $scriptDir\cleanup-mysql.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  MySQL: done." -ForegroundColor Green
} else {
    Write-Host "  MySQL: FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
}

# --- MongoDB ---
Write-Host ""
Write-Host "Running MongoDB cleanup..." -ForegroundColor Cyan
mongosh "mongodb://${MongoHost}/${MongoDb}" "$scriptDir\cleanup-mongodb.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  MongoDB: done." -ForegroundColor Green
} else {
    Write-Host "  MongoDB: FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Cleanup finished." -ForegroundColor Green
