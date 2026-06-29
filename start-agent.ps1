$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$port = if ($env:AGENT_PORT) { [int]$env:AGENT_PORT } else { 8788 }
$inUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($inUse) {
  Write-Host "Novel Idle agent server is already available at http://127.0.0.1:$port"
  return
}

Write-Host "Starting Novel Idle agent server at http://127.0.0.1:$port"
npm run agent
