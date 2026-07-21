# Builds a production package (UI + API on one port) and zips it for the server.
# The zip contains NO nginx config and NO Dockerfiles — you front it with your own nginx.
#
#   powershell -ExecutionPolicy Bypass -File scripts/package.ps1
#
# Output: dist-package/shelfpilot-<version>-<timestamp>.zip
#requires -Version 5
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot   # scripts/ -> codebase/
Set-Location $RepoRoot

$pkg = Get-Content (Join-Path $RepoRoot "package.json") -Raw | ConvertFrom-Json
$version = $pkg.version
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$name = "shelfpilot-$version-$stamp"

$build = Join-Path $RepoRoot ".package"
$stage = Join-Path $build $name
$distDir = Join-Path $RepoRoot "dist-package"

Write-Host "==> Cleaning staging"
if (Test-Path $build) { Remove-Item $build -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

if (-not $env:VITE_BASE_PATH) { $env:VITE_BASE_PATH = "/shelfpilot/" }

Write-Host "==> Installing workspace dependencies (npm ci)"
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

Write-Host "==> Building web UI (base $env:VITE_BASE_PATH)"
npm run build -w web
if ($LASTEXITCODE -ne 0) { throw "web build failed" }

$webDist = Join-Path $RepoRoot "web/dist"
if (-not (Test-Path (Join-Path $webDist "index.html"))) { throw "web build missing web/dist/index.html" }

Write-Host "==> Staging package files"
# API: source + manifest only (no tests, no node_modules — installed on the server)
New-Item -ItemType Directory -Force -Path (Join-Path $stage "api") | Out-Null
Copy-Item (Join-Path $RepoRoot "api/src") (Join-Path $stage "api/src") -Recurse
Copy-Item (Join-Path $RepoRoot "api/package.json") (Join-Path $stage "api/package.json")

# Built UI
New-Item -ItemType Directory -Force -Path (Join-Path $stage "web") | Out-Null
Copy-Item $webDist (Join-Path $stage "web/dist") -Recurse

# Deploy scripts + env sample + Docker production files
Copy-Item (Join-Path $RepoRoot "deploy/deploy.sh") $stage
Copy-Item (Join-Path $RepoRoot "deploy/start.sh") $stage
Copy-Item (Join-Path $RepoRoot "deploy/ecosystem.config.cjs") $stage
Copy-Item (Join-Path $RepoRoot "deploy/.env.example") $stage
Copy-Item (Join-Path $RepoRoot "deploy/README.md") (Join-Path $stage "README.md")
Copy-Item (Join-Path $RepoRoot "deploy/Dockerfile") (Join-Path $stage "Dockerfile")
Copy-Item (Join-Path $RepoRoot "deploy/docker-compose.yml") (Join-Path $stage "docker-compose.yml")

"$version`n$stamp" | Set-Content (Join-Path $stage "VERSION")

# Lock API deps for reproducible installs (used inside the Docker image build)
Write-Host "==> Generating api/package-lock.json"
Push-Location (Join-Path $stage "api")
npm install --omit=dev --package-lock-only --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "api package-lock generation failed" }
Pop-Location

# Normalize shell scripts + Dockerfile to LF (CRLF from Windows breaks bash / Docker RUN on Linux)
foreach ($f in @("deploy.sh", "start.sh", "Dockerfile", "docker-compose.yml")) {
  $p = Join-Path $stage $f
  $text = (Get-Content $p -Raw) -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host "==> Creating zip"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$zip = Join-Path $distDir "$name.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip

Remove-Item $build -Recurse -Force
Write-Host ""
Write-Host "==> Package ready: $zip"
Write-Host "    Copy to the server, unzip into a folder, then run ./deploy.sh"
