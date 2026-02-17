# Run MT5 Connector
$env:PYTHONPATH = ".\mt5-connector"
cd mt5-connector

# Detect Python 3.14 and clean up if needed
if (Test-Path "venv") {
    $venvPy = ".\venv\Scripts\python.exe"
    if (Test-Path $venvPy) {
        $ver = & $venvPy --version 2>&1
        if ($ver -match "3.14") {
            Write-Host "Detected Python 3.14 in venv. Removing to switch to 3.12 for compatibility..."
            Remove-Item -Recurse -Force "venv"
        }
    }
}

# Create venv if missing
if (-not (Test-Path "venv")) {
    $pyCmd = "python"
    # Prefer py launcher with 3.12
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $list = py --list
        if ($list -match "3.12") {
            $pyCmd = "py -3.12"
        }
    }
    Write-Host "Creating venv using: $pyCmd"
    Invoke-Expression "$pyCmd -m venv venv"
}

# Install dependencies
Write-Host "Installing dependencies..."
.\venv\Scripts\python -m pip install --upgrade pip
.\venv\Scripts\pip install -r requirements.txt

# Run
Write-Host "Starting MT5 Connector..."
.\venv\Scripts\python main.py
