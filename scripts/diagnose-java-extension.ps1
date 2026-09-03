<#
.SYNOPSIS
Diagnoses Red Hat Java extension crash loops and applies recommended mitigations.

.DESCRIPTION
Parses the redhat.java client log, classifies the failure mode, and writes
recommended VS Code settings for java.import.generatesMetadataFilesAtProjectRoot,
java.jdt.ls.javaagent.lombok, and java.telemetry.enabled.

.NOTES
Run from the workspace root. Does not modify source code.
#>

param(
  [string]$LogPath = "$env:APPDATA\Code - Insiders\User\workspaceStorage\ae1d4a1a6b607c61519677ff5a74a8f9\redhat.java\client.log.2026-09-03",
  [switch]$Apply
)

if (-not (Test-Path $LogPath)) {
  Write-Error "Log file not found: $LogPath"
  exit 1
}

$content = Get-Content -Path $LogPath -Raw
$crashCount = ([regex]::Matches($content, 'crashed and will restart')).Count
$pipeTimeouts = ([regex]::Matches($content, 'Starting pipe transport timed out after 30000ms')).Count
$epipeErrors = ([regex]::Matches($content, 'write EPIPE')).Count
$streamDestroyed = ([regex]::Matches($content, 'Cannot call write after a stream was destroyed')).Count
$disposed = ([regex]::Matches($content, 'Connection is disposed')).Count

Write-Host "`n=== Red Hat Java Log Analysis ===" -ForegroundColor Cyan
Write-Host "Log: $LogPath`n"
Write-Host ("Crash count      : {0}" -f $crashCount)
Write-Host ("Pipe timeouts    : {0}" -f $pipeTimeouts)
Write-Host ("EPIPE errors     : {0}" -f $epipeErrors)
Write-Host ("Stream destroyed : {0}" -f $streamDestroyed)
Write-Host ("Disposed conn.   : {0}" -f $disposed)

$rootCause = 'unknown'
if ($pipeTimeouts -gt 0 -and $crashCount -ge 5) {
  $rootCause = 'pipe_transport_timeout'
} elseif ($epipeErrors -gt 0 -or $streamDestroyed -gt 0) {
  $rootCause = 'stream_lifecycle'
} elseif ($disposed -gt 0 -and $crashCount -ge 5) {
  $rootCause = 'connection_disposed'
}

Write-Host ("`nProbable root cause: {0}`n" -f $rootCause)

$settings = @{
  'java.import.generatesMetadataFilesAtProjectRoot' = 'false'
  'java.jdt.ls.javaagent.lombok'                    = 'C:\\Users\\user\\.vscode-insiders\\extensions\\redhat.java-1.56.2026090208-win32-x64\\lombok\\lombok-1.18.39-4050.jar'
  'java.telemetry.enabled'                          = 'false'
  'java.jdt.ls.vmargs' = '--add-modules=ALL-SYSTEM --add-opens java.base/java.util=ALL-UNNAMED --add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/sun.nio.fs=ALL-UNNAMED -Declipse.application=org.eclipse.jdt.ls.core.id1 -Dosgi.bundles.defaultStartLevel=4 -Declipse.product=org.eclipse.jdt.ls.core.product -Djava.import.generatesMetadataFilesAtProjectRoot=false -DDetectVMInstallationsJob.disabled=true -Dfile.encoding=utf8 -XX:+UseParallelGC -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -Dsun.zip.disableMemoryMapping=true -Xmx2G -Xms100m -Xlog:disable'
} | ConvertTo-Json -Compress

Write-Host "Recommended VS Code settings (User or Workspace):`n"
Write-Host $settings

if ($Apply) {
  $vscodeJsonPath = Join-Path (Get-Location) '.vscode' | Join-Path -ChildPath 'settings.json'
  if (-not (Test-Path $vscodeJsonPath)) {
    New-Item -Path $vscodeJsonPath -ItemType File -Force | Out-Null
  }
  $existing = Get-Content -Path $vscodeJsonPath -Raw | ConvertFrom-Json
  foreach ($key in $settings.PSObject.Properties.Name) {
    $existing | Add-Member -NotePropertyName $key -NotePropertyValue $settings.$key -Force
  }
  $existing | ConvertTo-Json -Depth 10 | Set-Content -Path $vscodeJsonPath -Encoding UTF8
  Write-Host "`nSettings written to $vscodeJsonPath" -ForegroundColor Green
}
