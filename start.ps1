# Kill any existing Node processes on ports 3000 or 5000
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start backend on port 5000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\aegis-backend'; node server.js"

# Give backend a moment to bind
Start-Sleep -Seconds 2

# Start frontend on port 3000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\dashboard-1'; npm run dev"

Write-Host ""
Write-Host "Both servers starting..."
Write-Host "  Backend  -> http://localhost:5000"
Write-Host "  Dashboard -> http://localhost:3000"
