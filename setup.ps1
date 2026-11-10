# Hygeia - one-time setup (Windows PowerShell). Run from this folder:  .\setup.ps1
# Needs: Python 3.11 (python.org installer, "py launcher" ticked), an NVIDIA GPU with 6 GB+ VRAM and a
# recent driver (CUDA 12.x capable), ~25 GB free disk, internet (Python packages ~5 GB + models ~10 GB).
# Node.js is NOT required: the web UI is pre-built in frontend/dist and served by the backend.
param([switch]$SkipModels, [switch]$WithClip, [switch]$WithMedGemma)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n[1/4] Python environment" -ForegroundColor Cyan
Set-Location backend
if (-not (Test-Path ".venv")) {
  try { py -3.11 -m venv .venv } catch { python -m venv .venv }
}
& ".venv\Scripts\python.exe" -m pip install --upgrade pip
& ".venv\Scripts\python.exe" -m pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124
& ".venv\Scripts\python.exe" -m pip install -r requirements.txt
& ".venv\Scripts\python.exe" -c "import torch; print('torch', torch.__version__, '| cuda available:', torch.cuda.is_available(), '|', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only (the VLM stages will be very slow)')"
Set-Location $PSScriptRoot

Write-Host "`n[2/4] Trained checkpoints" -ForegroundColor Cyan
foreach ($f in "best_T11_dinov2_l14_deep_long_final.pth", "best_T09_dinov2_b14_res336.pth", "best_T05_dinov2_b14_unfreeze4.pth") {
  if (Test-Path "models\checkpoints\$f") { Write-Host "  ok  $f" } else { Write-Error "missing models\checkpoints\$f - the bundle is incomplete" }
}

Write-Host "`n[3/4] Open-source models (downloaded from Hugging Face into models\hf_cache)" -ForegroundColor Cyan
if ($SkipModels) { Write-Host "  skipped (-SkipModels); run  .\backend\.venv\Scripts\python.exe download_models.py  later" }
else {
  $dl = @()
  if ($WithClip) { $dl += "--with-clip" }
  if ($WithMedGemma) { $dl += "--with-medgemma" }
  & ".\backend\.venv\Scripts\python.exe" download_models.py @dl
  if ($LASTEXITCODE -ne 0) { Write-Error "model download did not complete - re-run .\setup.ps1 (it resumes)" }
}

Write-Host "`n[4/4] Self-test (serving preprocessing == training preprocessing)" -ForegroundColor Cyan
Set-Location backend
& ".venv\Scripts\python.exe" -m tests.test_parity
Set-Location $PSScriptRoot

Write-Host "`nSetup complete. Start the app with:  .\run.ps1   then open http://127.0.0.1:8000" -ForegroundColor Green
