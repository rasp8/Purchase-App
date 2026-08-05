[CmdletBinding()]
param(
    [string]$PublicHost = '192.168.1.59',
    [switch]$Rebuild,
    [switch]$RestartSupabase,
    [ValidateRange(10, 600)]
    [int]$DockerTimeoutSeconds = 120,
    [ValidateRange(10, 600)]
    [int]$AppTimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'

function Test-DockerEngine {
    & docker info *> $null
    return $LASTEXITCODE -eq 0
}

function Wait-DockerEngine {
    if (Test-DockerEngine) {
        Write-Host 'Docker engine is already running.' -ForegroundColor Green
        return
    }

    $currentUser = $env:USERNAME
    $dockerProcesses = @(
        Get-Process 'Docker Desktop' -IncludeUserName -ErrorAction SilentlyContinue
    )
    $otherOwners = @(
        $dockerProcesses |
            ForEach-Object { ($_.UserName -split '\\')[-1] } |
            Where-Object { $_ -and $_ -ne $currentUser } |
            Sort-Object -Unique
    )

    if ($otherOwners.Count -gt 0) {
        throw "Docker Desktop is running for another Windows user: $($otherOwners -join ', '). Sign that user out or stop Docker Desktop manually."
    }

    if ($dockerProcesses.Count -eq 0) {
        $dockerDesktopPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

        if (-not (Test-Path -LiteralPath $dockerDesktopPath)) {
            throw "Docker Desktop was not found at '$dockerDesktopPath'."
        }

        Write-Host "Launching Docker Desktop for $currentUser..." -ForegroundColor Cyan
        Start-Process -FilePath $dockerDesktopPath
    } else {
        Write-Host 'Waiting for the existing Docker Desktop process...' -ForegroundColor Yellow
    }

    $timer = [System.Diagnostics.Stopwatch]::StartNew()

    while ($timer.Elapsed.TotalSeconds -lt $DockerTimeoutSeconds) {
        if (Test-DockerEngine) {
            Write-Host 'Docker engine is online.' -ForegroundColor Green
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "Docker did not become ready within $DockerTimeoutSeconds seconds."
}

function Get-SupabaseProjectId {
    $configPath = Join-Path $PSScriptRoot 'supabase\config.toml'
    $projectIdMatch = Select-String -LiteralPath $configPath -Pattern '^\s*project_id\s*=\s*"([^"]+)"'

    if (-not $projectIdMatch) {
        throw "Unable to read project_id from '$configPath'."
    }

    return $projectIdMatch.Matches[0].Groups[1].Value
}

function Assert-NoOtherSupabaseProject {
    param(
        [Parameter(Mandatory)]
        [string]$ProjectId
    )

    $runningContainerLabels = @(
        & docker ps `
            --filter 'label=com.supabase.cli.project' `
            --format '{{.Labels}}'
    )

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to inspect running Docker containers.'
    }

    $runningProjects = @(
        $runningContainerLabels | ForEach-Object {
            if ($_ -match '(?:^|,)com\.supabase\.cli\.project=([^,]+)') {
                $Matches[1]
            }
        }
    ) | Sort-Object -Unique

    $otherProjects = @($runningProjects | Where-Object { $_ -ne $ProjectId })

    if ($otherProjects.Count -gt 0) {
        throw "Another local Supabase project is already running: $($otherProjects -join ', '). Stop it manually before starting '$ProjectId'."
    }
}

function Get-SupabaseCliPath {
    $supabaseCli = Join-Path $PSScriptRoot 'node_modules\.bin\supabase.cmd'

    if (-not (Test-Path -LiteralPath $supabaseCli)) {
        throw "The local Supabase CLI was not found. Run 'npm install' first."
    }

    return $supabaseCli
}

function Start-LocalSupabase {
    param(
        [Parameter(Mandatory)]
        [string]$SupabaseCli
    )

    $projectId = Get-SupabaseProjectId
    Assert-NoOtherSupabaseProject -ProjectId $projectId

    if ($RestartSupabase) {
        Write-Host "Restarting Supabase project '$projectId' while preserving its local data..." -ForegroundColor Yellow
        & $SupabaseCli stop --project-id $projectId

        if ($LASTEXITCODE -ne 0) {
            throw "Unable to stop Supabase project '$projectId'."
        }
    }

    Write-Host "Starting or reusing Supabase project '$projectId'..." -ForegroundColor Cyan
    & $SupabaseCli start

    if ($LASTEXITCODE -ne 0) {
        throw "Supabase failed to start. Check whether ports 54321-54329 are already in use. No other project was stopped."
    }
}

function Write-DockerEnvironment {
    param(
        [Parameter(Mandatory)]
        [string]$SupabaseCli
    )

    Write-Host 'Collecting local Supabase environment...' -ForegroundColor Cyan
    $statusOutput = & $SupabaseCli status -o env

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to read the local Supabase environment.'
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
    $serviceRoleKey = if ($statusVars.ContainsKey('SERVICE_ROLE_KEY')) {
        $statusVars['SERVICE_ROLE_KEY']
    } else {
        ''
    }
    $requiredValues = @{
        API_URL                         = $statusVars['API_URL']
        NUXT_PUBLIC_SUPABASE_ANON_KEY   = $publishableKey
        NUXT_SUPABASE_SERVICE_ROLE_KEY  = $serviceRoleKey
    }
    $missingValues = @(
        $requiredValues.GetEnumerator() |
            Where-Object { [string]::IsNullOrWhiteSpace($_.Value) } |
            ForEach-Object { $_.Key }
    )

    if ($missingValues.Count -gt 0) {
        throw "Missing local Supabase values: $($missingValues -join ', ')"
    }

    $dockerSupabaseUrl = $requiredValues.API_URL `
        -replace '^http://127\.0\.0\.1', "http://$PublicHost" `
        -replace '^http://localhost', "http://$PublicHost"
    $dockerEnvPath = Join-Path $PSScriptRoot '.env.docker'

    @(
        "NUXT_PUBLIC_SUPABASE_URL=$dockerSupabaseUrl"
        "NUXT_PUBLIC_SUPABASE_ANON_KEY=$publishableKey"
        "NUXT_SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey"
    ) | Set-Content -LiteralPath $dockerEnvPath -Encoding ASCII
}

function Start-AppContainer {
    Write-Host 'Starting the Nuxt development container...' -ForegroundColor Cyan

    if ($Rebuild) {
        & docker compose up -d --build --remove-orphans
    } else {
        & docker compose up -d --remove-orphans
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose failed to start. Retry with '-Rebuild' if the dependencies or Dockerfile changed."
    }
}

function Wait-App {
    $healthUrl = 'http://127.0.0.1:3000'
    $timer = [System.Diagnostics.Stopwatch]::StartNew()

    Write-Host 'Waiting for the Nuxt development server...' -ForegroundColor Yellow

    while ($timer.Elapsed.TotalSeconds -lt $AppTimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3

            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Host 'Nuxt development server is ready.' -ForegroundColor Green
                return
            }
        } catch {
            # The container is still compiling or has not bound its port yet.
        }

        Start-Sleep -Seconds 2
    }

    & docker compose logs --tail 50 app
    throw "The app did not respond at '$healthUrl' within $AppTimeoutSeconds seconds."
}

function Open-DevelopmentTools {
    $currentUser = $env:USERNAME
    $userCodeProcesses = @(
        Get-Process 'code' -IncludeUserName -ErrorAction SilentlyContinue |
            Where-Object { $_.UserName -like "*\$currentUser" }
    )

    if ($userCodeProcesses.Count -eq 0) {
        Write-Host 'Opening VS Code...' -ForegroundColor Cyan
        Start-Process -FilePath 'code' -ArgumentList $PSScriptRoot
    }

    $publicAppUrl = "http://$($PublicHost):3000"
    Write-Host "Opening the development environment at $publicAppUrl" -ForegroundColor Cyan
    Start-Process -FilePath 'chrome.exe' -ArgumentList @(
        '--new-window'
        $publicAppUrl
        'http://localhost:54324'
        'http://127.0.0.1:54323'
    )
}

Push-Location $PSScriptRoot

try {
    Wait-DockerEngine
    $supabaseCli = Get-SupabaseCliPath
    Start-LocalSupabase -SupabaseCli $supabaseCli
    Write-DockerEnvironment -SupabaseCli $supabaseCli
    Start-AppContainer
    Wait-App
    Open-DevelopmentTools

    Write-Host 'Development environment is ready.' -ForegroundColor Green
    Write-Host "Use '.\run-app.ps1 -Rebuild' after dependency or Dockerfile changes." -ForegroundColor DarkGray
    Write-Host "Use '.\run-app.ps1 -RestartSupabase' to safely restart Supabase and apply config changes." -ForegroundColor DarkGray
} finally {
    Pop-Location
}
