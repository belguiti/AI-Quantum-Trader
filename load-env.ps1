# =============================================================
# Load environment variables from .env file
# Source this at the top of any PowerShell script that needs secrets
# Usage: . "$PSScriptRoot\load-env.ps1"
# =============================================================

$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
    Write-Host "[OK] Secrets loaded from .env" -ForegroundColor Green
} else {
    Write-Host "[WARN] No .env file found! Copy .env.example to .env and fill in your secrets." -ForegroundColor Yellow
}
