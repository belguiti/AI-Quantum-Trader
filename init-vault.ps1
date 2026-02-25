# ================================================================
# Initialize HashiCorp Vault with AI-Quantum-Trader secrets
# ================================================================
# Prerequisites:
#   1. Docker must be running: docker compose up -d
#   2. Vault CLI must be installed OR use the Docker exec approach (used here)
#   3. .env file must exist with your actual secrets
# ================================================================

Write-Host "=== AI-Quantum-Trader Vault Initializer ===" -ForegroundColor Cyan

# Load secrets from .env
. "$PSScriptRoot\load-env.ps1"

# Vault connection
$VAULT_ADDR = "http://localhost:8200"
$VAULT_TOKEN = "ai-quantum-root-token"

# Check Vault is running
Write-Host "`nChecking Vault status..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$VAULT_ADDR/v1/sys/health" -Method Get -ErrorAction Stop
    Write-Host "[OK] Vault is running and unsealed." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Vault is not reachable at $VAULT_ADDR. Make sure to run: docker compose up -d" -ForegroundColor Red
    exit 1
}

# Common headers
$headers = @{
    "X-Vault-Token" = $VAULT_TOKEN
    "Content-Type"  = "application/json"
}

# Function to write secrets to Vault KV v2
function Write-VaultSecret {
    param (
        [string]$Path,
        [hashtable]$Data
    )
    $body = @{ data = $Data } | ConvertTo-Json -Depth 3
    try {
        Invoke-RestMethod -Uri "$VAULT_ADDR/v1/secret/data/$Path" -Method Post -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        Write-Host "  [OK] secret/$Path" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] secret/$Path - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ================================================================
# Seed secrets for each service
# ================================================================

Write-Host "`nSeeding secrets into Vault..." -ForegroundColor Yellow

# Shared secrets (ai-quantum context - read by all services)
Write-Host "`n  -- Shared secrets (ai-quantum) --"
Write-VaultSecret -Path "ai-quantum" -Data @{
    DB_PASSWORD = $env:DB_PASSWORD
}

# Trade Service specific
Write-Host "  -- Trade Service --"
Write-VaultSecret -Path "ai-quantum/trade-service" -Data @{
    DB_PASSWORD        = $env:DB_PASSWORD
    ALPHAVANTAGE_API_KEY = $env:ALPHAVANTAGE_API_KEY
}

# Auth Service specific
Write-Host "  -- Auth Service --"
Write-VaultSecret -Path "ai-quantum/auth-service" -Data @{
    DB_PASSWORD    = $env:DB_PASSWORD
    JWT_SECRET_KEY = $env:JWT_SECRET_KEY
}

# News Service specific
Write-Host "  -- News Service --"
Write-VaultSecret -Path "ai-quantum/news-service" -Data @{
    OPENAI_API_KEY = $env:OPENAI_API_KEY
}

# ================================================================
# Verify
# ================================================================
Write-Host "`nVerifying secrets..." -ForegroundColor Yellow

$paths = @("ai-quantum", "ai-quantum/trade-service", "ai-quantum/auth-service", "ai-quantum/news-service")
foreach ($path in $paths) {
    try {
        $result = Invoke-RestMethod -Uri "$VAULT_ADDR/v1/secret/data/$path" -Method Get -Headers $headers -ErrorAction Stop
        $keys = ($result.data.data | Get-Member -MemberType NoteProperty).Name -join ", "
        Write-Host "  [OK] secret/$path -> keys: [$keys]" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] secret/$path" -ForegroundColor Red
    }
}

Write-Host "`n=== Vault initialization complete! ===" -ForegroundColor Cyan
Write-Host "Vault UI: http://localhost:8200  (token: $VAULT_TOKEN)" -ForegroundColor White
Write-Host "You can now start your services." -ForegroundColor White
