$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$port = 8787
$inUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($inUse) {
  Write-Host "Novel Idle is already available at http://localhost:$port"
  return
}

Write-Host "Starting Novel Idle at http://localhost:$port"
npm run dev
