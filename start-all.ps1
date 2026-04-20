# ==============================================================================
# AI-Quantum Trader -- Complete Startup Script
# Order: Docker -> Discovery -> Gateway -> Auth -> Trade -> News -> AI -> Lab -> MT5 -> Frontend
# Usage: .\start-all.ps1
# ==============================================================================

Set-StrictMode -Off
$ErrorActionPreference = "Continue"
$ROOT = $PSScriptRoot

# --- Load .env ----------------------------------------------------------------
$envFile = Join-Path $ROOT ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
    Write-Host "  [OK] .env loaded" -ForegroundColor Green
} else {
    Write-Host "  [!!] .env not found -- copy .env.example and fill in secrets" -ForegroundColor Yellow
}

# --- Helper: open a new PowerShell window -------------------------------------
function Start-Win {
    param(
        [string]$Title,
        [string]$WorkDir,
        [string]$Cmd
    )
    $full = "Set-Location '$WorkDir'; . '$ROOT\load-env.ps1'; $Cmd"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $full -WindowStyle Normal -WorkingDirectory $WorkDir
    Write-Host "  [OK] Window launched: $Title" -ForegroundColor Green
}

# --- Helper: wait for HTTP endpoint -------------------------------------------
function Wait-Http {
    param(
        [string]$Url,
        [string]$Label,
        [int]$TimeoutSec = 90,
        [int]$IntervalSec = 3
    )
    Write-Host "`n  >> Waiting for $Label ($Url) ..." -ForegroundColor Cyan
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -lt 500) {
                Write-Host "  [OK] $Label is UP" -ForegroundColor Green
                return $true
            }
        } catch {
            # not ready yet
        }
        Start-Sleep -Seconds $IntervalSec
        Write-Host "." -NoNewline
    }
    Write-Host "`n  [!!] $Label did not respond in ${TimeoutSec}s -- continuing anyway" -ForegroundColor Yellow
    return $false
}

# ==============================================================================
Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host "    AI-QUANTUM TRADER -- Full Stack Startup" -ForegroundColor Magenta
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host ""

# --- STEP 1: Docker (SQL Server, Redis, Kafka, Vault) -------------------------
Write-Host "`n  >> Starting Docker infrastructure..." -ForegroundColor Cyan
docker compose -f "$ROOT\docker-compose.yml" up -d 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Docker containers started (SQL Server + Redis + Kafka + Vault)" -ForegroundColor Green
} else {
    Write-Host "  [XX] Docker failed -- check: docker compose logs" -ForegroundColor Red
    exit 1
}

Write-Host "`n  >> Waiting 8s for Vault and Kafka to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

# --- STEP 2: Discovery Service (Eureka :8761) ----------------------------------
Write-Host "`n  >> Starting Discovery Service (Eureka :8761)..." -ForegroundColor Cyan
Start-Win -Title "1-Discovery" -WorkDir "$ROOT\discovery-service" -Cmd "mvn spring-boot:run -q"

Wait-Http -Url "http://localhost:8761/actuator/health" -Label "Eureka :8761" -TimeoutSec 90

# --- STEP 3: API Gateway (:8080) ----------------------------------------------
Write-Host "`n  >> Starting API Gateway (:8080)..." -ForegroundColor Cyan
Start-Win -Title "2-Gateway" -WorkDir "$ROOT\api-gateway" -Cmd "mvn spring-boot:run -q"
Start-Sleep -Seconds 5

# --- STEP 4: Auth Service (:8085) ---------------------------------------------
Write-Host "`n  >> Starting Auth Service (:8085)..." -ForegroundColor Cyan
Start-Win -Title "3-Auth" -WorkDir "$ROOT\auth-service" -Cmd "mvn spring-boot:run -q"
Start-Sleep -Seconds 3

# --- STEP 5: Trade Service (:8081) --------------------------------------------
Write-Host "`n  >> Starting Trade Service (:8081)..." -ForegroundColor Cyan
Start-Win -Title "4-Trade" -WorkDir "$ROOT\trade-service" -Cmd "mvn spring-boot:run -q"
Start-Sleep -Seconds 3

# --- STEP 6: News Service (:8086) ---------------------------------------------
Write-Host "`n  >> Starting News Service (:8086)..." -ForegroundColor Cyan
Start-Win -Title "5-News" -WorkDir "$ROOT\news-service" -Cmd "mvn spring-boot:run -q"
Start-Sleep -Seconds 3

# --- STEP 7: AI Engine (FastAPI :8000) ----------------------------------------
Write-Host "`n  >> Starting AI Engine (:8000)..." -ForegroundColor Cyan
$pyAI = if (Test-Path "$ROOT\ai-engine\venv\Scripts\python.exe") { ".\venv\Scripts\python.exe" } else { "python" }
Start-Win -Title "6-AIEngine" -WorkDir "$ROOT\ai-engine" -Cmd "$pyAI -m uvicorn main:app --reload --port 8000"

# --- STEP 8: AI Lab (FastAPI :8002) -------------------------------------------
Write-Host "`n  >> Starting AI Lab (:8002)..." -ForegroundColor Cyan
$pyLab = if (Test-Path "$ROOT\service-ai-lab\venv\Scripts\python.exe") { ".\venv\Scripts\python.exe" } else { "python" }
Start-Win -Title "7-AILab" -WorkDir "$ROOT\service-ai-lab" -Cmd "$pyLab -m uvicorn main:app --reload --port 8002"

# --- STEP 9: MT5 Connector (:5005) --------------------------------------------
Write-Host "`n  >> Starting MT5 Connector (:5005)..." -ForegroundColor Cyan
$pyMT5 = if (Test-Path "$ROOT\mt5-connector\venv\Scripts\python.exe") { ".\venv\Scripts\python.exe" } else { "python" }
Start-Win -Title "8-MT5" -WorkDir "$ROOT\mt5-connector" -Cmd "$pyMT5 -m uvicorn main:app --reload --port 5005"

# --- STEP 10: Fincept Integration Service (FastAPI :8006) ---------------------
Write-Host "`n  >> Starting Fincept Integration Service (:8006)..." -ForegroundColor Cyan
$pyFincept = if (Test-Path "$ROOT\fincept-service\venv\Scripts\python.exe") { ".\venv\Scripts\python.exe" } else { "python" }
Start-Win -Title "10-Fincept" -WorkDir "$ROOT\fincept-service" -Cmd "$pyFincept -m uvicorn main:app --reload --port 8006"

# --- STEP 11: Frontend Angular (:4200) ----------------------------------------
Write-Host "`n  >> Starting Angular Frontend (:4200)..." -ForegroundColor Cyan
Start-Win -Title "11-Frontend" -WorkDir "$ROOT\frontend" -Cmd "npm start"

# --- Summary ------------------------------------------------------------------
Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host "    All services launched in separate windows" -ForegroundColor Green
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Eureka        http://localhost:8761" -ForegroundColor Cyan
Write-Host "  API Gateway   http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Auth Service  http://localhost:8085" -ForegroundColor Cyan
Write-Host "  Trade Service http://localhost:8081" -ForegroundColor Cyan
Write-Host "  News Service  http://localhost:8086" -ForegroundColor Cyan
Write-Host "  AI Engine     http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  AI Lab        http://localhost:8002/docs" -ForegroundColor Cyan
Write-Host "  MT5 Connector http://localhost:5005/docs" -ForegroundColor Cyan
Write-Host "  Fincept       http://localhost:8006/docs" -ForegroundColor Cyan
Write-Host "  Frontend      http://localhost:4200" -ForegroundColor Green
Write-Host ""
Write-Host "  TIP: Java services take 30-60s to register in Eureka after window opens." -ForegroundColor DarkGray
Write-Host ""
