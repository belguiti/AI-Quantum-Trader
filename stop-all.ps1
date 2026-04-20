# ==============================================================================
# AI-Quantum Trader -- Stop All Services
# Usage: .\stop-all.ps1
#        .\stop-all.ps1 -KeepDocker
# ==============================================================================
param([switch]$KeepDocker)
$ROOT = $PSScriptRoot

$ports = @(
    @{ Port = 8761; Name = "Eureka (Discovery)" },
    @{ Port = 8080; Name = "API Gateway" },
    @{ Port = 8085; Name = "Auth Service" },
    @{ Port = 8081; Name = "Trade Service" },
    @{ Port = 8086; Name = "News Service" },
    @{ Port = 8000; Name = "AI Engine" },
    @{ Port = 8002; Name = "AI Lab" },
    @{ Port = 5005; Name = "MT5 Connector" },
    @{ Port = 8006; Name = "Fincept Service" },
    @{ Port = 4200; Name = "Frontend" }
)

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host "    AI-QUANTUM TRADER -- Stopping All Services" -ForegroundColor Magenta
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  [Services]" -ForegroundColor White

foreach ($svc in $ports) {
    $port = $svc.Port
    $name = $svc.Name
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid_ = $conn.OwningProcess | Select-Object -First 1
        try {
            $proc = Get-Process -Id $pid_ -ErrorAction Stop
            $procName = $proc.Name
            Stop-Process -Id $pid_ -Force -ErrorAction Stop
            Write-Host ("  {0,-22} STOPPED  (PID {1} / {2})" -f $name, $pid_, $procName) -ForegroundColor Green
        } catch {
            Write-Host ("  {0,-22} ERROR: {1}" -f $name, $_.Exception.Message) -ForegroundColor Yellow
        }
    } else {
        Write-Host ("  {0,-22} not running" -f $name) -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "  [PowerShell windows]" -ForegroundColor White
$windowTags = @("1-Discovery","2-Gateway","3-Auth","4-Trade","5-News","6-AIEngine","7-AILab","8-MT5","10-Fincept","11-Frontend")
foreach ($tag in $windowTags) {
    $procs = Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
        try { $_.MainWindowTitle -like "*$tag*" } catch { $false }
    }
    foreach ($p in $procs) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Closed: $tag" -ForegroundColor DarkGray
    }
}

Write-Host ""
if ($KeepDocker) {
    Write-Host "  [Docker] Kept running (-KeepDocker)" -ForegroundColor DarkGray
} else {
    Write-Host "  [Docker]" -ForegroundColor White
    docker compose -f "$ROOT\docker-compose.yml" stop 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SQL Server / Redis / Kafka / Vault  STOPPED" -ForegroundColor Green
    } else {
        Write-Host "  Docker stop failed -- run manually: docker compose stop" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host "  Done. Run .\start-all.ps1 to restart." -ForegroundColor White
Write-Host "  ======================================================" -ForegroundColor Magenta
Write-Host ""
