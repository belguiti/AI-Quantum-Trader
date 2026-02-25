# AI-Quantum Trader Startup Script

# Load env for this process
. "$PSScriptRoot\load-env.ps1"

# Env-loading snippet to inject into sub-processes
$loadEnvCmd = "Get-Content '$PSScriptRoot\.env' -ErrorAction SilentlyContinue | ForEach-Object { if (`$_ -match '^\s*([^#][^=]+)=(.*)$') { [System.Environment]::SetEnvironmentVariable(`$matches[1].Trim(), `$matches[2].Trim(), 'Process') } };"

Write-Host "Starting AI-Quantum Trader Environment..." -ForegroundColor Green

# 1. Start Docker Containers
Write-Host "Checking Docker Containers..."
docker compose up -d
if ($?) { Write-Host "Docker Containers Started." -ForegroundColor Green } else { Write-Host "Failed to start Docker." -ForegroundColor Red; exit }

# Function to start a service in a new window
function Start-ServiceWindow {
    param (
        [string]$Title,
        [string]$Command,
        [string]$Path
    )
    Write-Host "Starting $Title..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $loadEnvCmd $Command" -WindowStyle Normal
}

# 2. Start Discovery Service
Start-ServiceWindow -Title "Discovery Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\discovery-service"
Start-Sleep -Seconds 10 # Wait for Eureka to initialize

# 3. Start API Gateway
Start-ServiceWindow -Title "API Gateway" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\api-gateway"

# 4. Start Trade Service
Start-ServiceWindow -Title "Trade Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\trade-service"

# 4.1 Start Auth Service
Start-ServiceWindow -Title "Auth Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\auth-service"

# 4.2 Start News Service
Start-ServiceWindow -Title "News Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\news-service"

# 5. Start AI Engine
Start-ServiceWindow -Title "AI Engine" -Command ".\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000" -Path "$PSScriptRoot\ai-engine"

# 6. Start Frontend
Start-ServiceWindow -Title "Frontend" -Command "npm start" -Path "$PSScriptRoot\frontend"

Write-Host "All services have been triggered to start in separate windows." -ForegroundColor Green
Write-Host "Discovery: http://localhost:8761"
Write-Host "Gateway:   http://localhost:8080"
Write-Host "Frontend:  http://localhost:4200"

