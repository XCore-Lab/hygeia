# Start Hygeia (API + web UI) - Windows PowerShell.
#   .\run.ps1                                  -> http://127.0.0.1:8000
#   .\run.ps1 -Port 9000 -BindHost 0.0.0.0     (reachable from other machines on the network)
#   .\run.ps1 -Offline                         (never contact Hugging Face; all models must already be in models\hf_cache)
param([int]$Port = 8000, [string]$BindHost = "127.0.0.1", [switch]$Offline)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Test-Path "backend\.venv\Scripts\python.exe")) { Write-Error "Run .\setup.ps1 first." }
$env:HF_HUB_CACHE = Join-Path $PSScriptRoot "models\hf_cache\hub"     # models downloaded by download_models.py
if ($Offline) { $env:HF_HUB_OFFLINE = "1" }
$env:PYTORCH_CUDA_ALLOC_CONF = "expandable_segments:True"
& ".\backend\.venv\Scripts\python.exe" download_models.py --check | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Some models are missing; they will be downloaded now (~10 GB on first run)..." -ForegroundColor Yellow; & ".\backend\.venv\Scripts\python.exe" download_models.py; if ($LASTEXITCODE -ne 0) { Write-Error "model download failed" } }
Write-Host "Starting Hygeia on http://$BindHost`:$Port  (models load in the background for 1-2 minutes; the header dot turns green when ready)" -ForegroundColor Green
Set-Location backend
& ".venv\Scripts\python.exe" -m uvicorn app.main:app --host $BindHost --port $Port --timeout-keep-alive 120
