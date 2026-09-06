#!/usr/bin/env pwsh

Write-Host "========================================="
Write-Host "Running SIH ETA Pipeline Quality Checks"
Write-Host "========================================="

# Run tests
Write-Host "`n[1/2] Running Unit Tests (pytest)..."
.\.venv\Scripts\Activate.ps1
pytest tests/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Unit tests failed! Stopping pipeline check." -ForegroundColor Red
    exit 1
}

# Run Integrity
Write-Host "`n[2/2] Running Data Integrity Checks..."
python src/validation/data_integrity.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Data integrity checks failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All pipeline quality checks passed successfully." -ForegroundColor Green
