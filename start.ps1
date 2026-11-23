# Starts both the FastAPI backend (port 8000) and Vite frontend (port 5173)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting YouTube Music Stats Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
$backend = Start-Process -FilePath "$root\backend\.venv\Scripts\uvicorn.exe" `
    -ArgumentList "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload" `
    -WorkingDirectory "$root\backend" `
    -PassThru

Write-Host "Starting Frontend on http://localhost:5173 ..." -ForegroundColor Green
try {
    Push-Location "$root\frontend"
    npm run dev
} finally {
    Pop-Location
    if ($backend -and !$backend.HasExited) {
        Stop-Process -Id $backend.Id -Force
    }
}
