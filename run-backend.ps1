# Run AI-Quantum Backend Services
function Start-ServiceWindow {
    $env:ALPHA_VANTAGE_API_KEY = "LJXEPM4T9RH5MY1H"
    param (
        [string]$Title,
        [string]$Command,
        [string]$Path
    )
    Write-Host "Starting $Title..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command" -WindowStyle Normal
}

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
