# Stop Java Services
Write-Host "Stopping Java Services..."
Stop-Process -Name "java" -Force -ErrorAction SilentlyContinue

# Stop Docker Containers
Write-Host "Stopping Docker Containers..."
docker compose down

Write-Host "All backend services stopped."
