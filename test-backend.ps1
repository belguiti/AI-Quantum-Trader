# Backend Test Script
$BaseUrl = "http://localhost:8080/api/trades" # Via Gateway
# $BaseUrl = "http://localhost:8081/api/trades" # Direct if Gateway issues

Write-Host "Testing Backend Endpoints..." -ForegroundColor Cyan

# 1. Place a Trade
Write-Host "`n1. Placing a new trade (POST $BaseUrl)..."
$Body = @{
    symbol = "BTC/USD"
    action = "BUY"
    price = 50000.00
    quantity = 0.5
    status = "PENDING"
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri $BaseUrl -Method Post -Body $Body -ContentType "application/json" -ErrorAction Stop
    Write-Host "Success! Created Trade ID: $($Response.id)" -ForegroundColor Green
    Write-Host $Response
} catch {
    Write-Host "Failed to place trade. Ensure services are running." -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# 2. Get All Trades
Write-Host "`n2. Fetching all trades (GET $BaseUrl)..."
try {
    $Trades = Invoke-RestMethod -Uri $BaseUrl -Method Get -ErrorAction Stop
    Write-Host "Success! Retrieved $($Trades.Count) trades." -ForegroundColor Green
    $Trades | Format-Table id, symbol, action, price, quantity, status
} catch {
    Write-Host "Failed to fetch trades." -ForegroundColor Red
    Write-Host $_.Exception.Message
}
