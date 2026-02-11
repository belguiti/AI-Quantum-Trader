# AI-Quantum Trader Startup Script

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
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command" -WindowStyle Normal
}

# 2. Start Discovery Service
Start-ServiceWindow -Title "Discovery Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\discovery-service"
Start-Sleep -Seconds 10 # Wait for Eureka to initialize

# 3. Start API Gateway
Start-ServiceWindow -Title "API Gateway" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\api-gateway"

# 4. Start Trade Service
Start-ServiceWindow -Title "Trade Service" -Command "mvn spring-boot:run" -Path "$PSScriptRoot\trade-service"

# 5. Start AI Engine
Start-ServiceWindow -Title "AI Engine" -Command ".\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000" -Path "$PSScriptRoot\ai-engine"

# 6. Start Frontend
Start-ServiceWindow -Title "Frontend" -Command "npm start" -Path "$PSScriptRoot\frontend"

Write-Host "All services have been triggered to start in separate windows." -ForegroundColor Green
Write-Host "Discovery: http://localhost:8761"
Write-Host "Gateway:   http://localhost:8080"
Write-Host "Frontend:  http://localhost:4200"
