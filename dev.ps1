[CmdletBinding()]
param(
    [string]$PublicHost = '192.168.1.59'
)

& (Join-Path $PSScriptRoot 'run-app.ps1') -Mode local -PublicHost $PublicHost
exit $LASTEXITCODE
