# Registers a Windows Task Scheduler job that runs the research pipeline daily at 7:00 AM.
# Run from an elevated or normal PowerShell:  .\scripts\register_task.ps1
# Remove with:  Unregister-ScheduledTask -TaskName "ContentSystem Daily Research" -Confirm:$false

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"
$python = Join-Path $backendDir ".venv\Scripts\python.exe"
$script = Join-Path $backendDir "run_research.py"

if (-not (Test-Path $python)) {
    Write-Error "Backend venv not found at $python. Create it first: cd backend; python -m venv .venv; .venv\Scripts\pip install -r requirements.txt"
}

$action = New-ScheduledTaskAction -Execute $python -Argument "`"$script`"" -WorkingDirectory $backendDir
$trigger = New-ScheduledTaskTrigger -Daily -At 7:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName "ContentSystem Daily Research" `
    -Action $action -Trigger $trigger -Settings $settings `
    -Description "Runs the Phase 1 AI Research Intelligence pipeline daily" -Force

Write-Host "Registered 'ContentSystem Daily Research' (daily 7:00 AM)."
Write-Host "Test it now with: Start-ScheduledTask -TaskName 'ContentSystem Daily Research'"
