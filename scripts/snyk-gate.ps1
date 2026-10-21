# Runs both Snyk scans and records each exit code. Used by the deploy gate
# (see CLAUDE.md): both must exit 0 before anything is pushed to main.
# Output goes to $env:TEMP\snyk-gate.txt so long scans can run in the background.
$out = Join-Path $env:TEMP "snyk-gate.txt"
Set-Location (Split-Path $PSScriptRoot -Parent)
$lines = @()
$lines += (snyk test 2>&1 | Out-String)
$lines += "SNYK_TEST_EXIT=$LASTEXITCODE"
$lines += (snyk code test 2>&1 | Out-String)
$lines += "SNYK_CODE_EXIT=$LASTEXITCODE"
$lines | Set-Content -Path $out -Encoding utf8
