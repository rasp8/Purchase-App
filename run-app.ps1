[CmdletBinding()]
param(
    [ValidateSet('local', 'cloud')]
    [string]$Mode = 'local',
    [string]$PublicHost = '192.168.1.59'
)

$ErrorActionPreference = 'Stop'

function Start-LocalMode {
    $publicAppUrl = "http://$($PublicHost):3000"

    Write-Host "Starting Supabase local services..." -ForegroundColor Cyan
    npx supabase start

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Supabase failed to start. If another local Supabase project is already using the default ports, stop it first and retry." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "Collecting local Supabase environment..." -ForegroundColor Cyan
    $statusOutput = npx supabase status -o env

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Unable to read local Supabase environment from the CLI." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    $statusVars = @{}

    foreach ($line in $statusOutput) {
        if ($line -notmatch '^([A-Z0-9_]+)=(.*)$') {
            continue
        }

        $name = $Matches[1]
        $value = $Matches[2].Trim()

        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $statusVars[$name] = $value
    }

    $publishableKey = if ($statusVars.ContainsKey('PUBLISHABLE_KEY')) {
        $statusVars['PUBLISHABLE_KEY']
    } else {
        $statusVars['ANON_KEY']
    }

    $serviceRoleKey = if ($statusVars.ContainsKey('SECRET_KEY')) {
        $statusVars['SECRET_KEY']
    } else {
        $statusVars['SERVICE_ROLE_KEY']
    }

    $requiredValues = @{
        API_URL = $statusVars['API_URL']
        NUXT_PUBLIC_SUPABASE_ANON_KEY = $publishableKey
        NUXT_SUPABASE_SERVICE_ROLE_KEY = $serviceRoleKey
    }

    $missingValues = $requiredValues.GetEnumerator() |
        Where-Object { [string]::IsNullOrWhiteSpace($_.Value) } |
        ForEach-Object { $_.Key }

    if ($missingValues.Count -gt 0) {
        Write-Host ("Missing local Supabase values: " + ($missingValues -join ', ')) -ForegroundColor Red
        exit 1
    }

    $dockerSupabaseUrl = $requiredValues.API_URL `
        -replace '^http://127\.0\.0\.1', "http://$PublicHost" `
        -replace '^http://localhost', "http://$PublicHost"

    $dockerEnvPath = Join-Path $PSScriptRoot '.env.docker'

    @(
        "NUXT_PUBLIC_SUPABASE_URL=$dockerSupabaseUrl"
        "NUXT_PUBLIC_SUPABASE_ANON_KEY=$publishableKey"
        "NUXT_SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey"
    ) | Set-Content -Path $dockerEnvPath -Encoding ASCII

    Write-Host "Wrote .env.docker for local Docker Compose startup." -ForegroundColor Green
    Write-Host "Open the app at $publicAppUrl" -ForegroundColor Green
    Write-Host "Starting app in local Docker mode..." -ForegroundColor Cyan
    docker compose up --build

    exit $LASTEXITCODE
}

function Start-CloudMode {
    $publicAppUrl = "http://$($PublicHost):3000"

    Write-Host "Starting app in cloud mode using .env..." -ForegroundColor Cyan
    Write-Host "Open the app at $publicAppUrl" -ForegroundColor Green
    npm run dev
    exit $LASTEXITCODE
}

Push-Location $PSScriptRoot

try {
    switch ($Mode) {
        'local' {
            Start-LocalMode
        }
        'cloud' {
            Start-CloudMode
        }
    }
}
finally {
    Pop-Location
}
