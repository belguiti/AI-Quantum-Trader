Write-Host "Fixing Maven Build for AI Quantum Trader..." -ForegroundColor Cyan

# 1. Install Parent POM
Write-Host "Step 1: Installing Parent POM..."
mvn -N clean install
if ($LASTEXITCODE -eq 0) {
    Write-Host "Parent POM Installed Successfully." -ForegroundColor Green
} else {
    Write-Host "Parent POM Install Failed. Please check errors above." -ForegroundColor Red
    Pause
    exit
}

# 2. Install News Service Dependencies
Write-Host "Step 2: Building News Service..."
mvn clean install -pl news-service -DskipTests
if ($LASTEXITCODE -eq 0) {
    Write-Host "News Service Built Successfully!" -ForegroundColor Green
} else {
    Write-Host "News Service Build Failed. Please check errors above." -ForegroundColor Red
    Pause
    exit
}

Write-Host "Build Complete. You can now run the service." -ForegroundColor Green
Pause
