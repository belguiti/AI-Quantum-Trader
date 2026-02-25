# Run AI-Quantum Backend Services

# Env-loading snippet to inject into sub-processes
$loadEnvCmd = "Get-Content '$PSScriptRoot\.env' -ErrorAction SilentlyContinue | ForEach-Object { if (`$_ -match '^\s*([^#][^=]+)=(.*)$') { [System.Environment]::SetEnvironmentVariable(`$matches[1].Trim(), `$matches[2].Trim(), 'Process') } };"

function Start-ServiceWindow {

    param (
        [string]$Title,
        [string]$Command,
        [string]$Path
    )
    Write-Host "Starting $Title..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $loadEnvCmd $Command" -WindowStyle Normal
}

# Load env for this process too
. "$PSScriptRoot\load-env.ps1"

Write-Host "Starting Discovery Service..."
Start-ServiceWindow -Title "Discovery Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\discovery-service"

Write-Host "Waiting 10s for Eureka..."
Start-Sleep -Seconds 10

Write-Host "Starting API Gateway..."
Start-ServiceWindow -Title "API Gateway" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\api-gateway"

Write-Host "Starting Trade Service..."
Start-ServiceWindow -Title "Trade Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\trade-service"

Write-Host "Starting Auth Service..."
Start-ServiceWindow -Title "Auth Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\auth-service"

Write-Host "Backend Services Started." -ForegroundColor Green
Write-Host "Gateway running at http://localhost:8080"

