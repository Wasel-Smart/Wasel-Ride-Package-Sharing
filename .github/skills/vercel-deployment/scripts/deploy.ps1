# Deploy to Vercel with deployment confirmation and health checks
# Usage: .\deploy.ps1 -Prod -Force

param(
    [switch]$Prod,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Vercel deployment..." -ForegroundColor Cyan

# Check if Vercel CLI is installed
$vercelExists = $null -ne (Get-Command vercel -ErrorAction SilentlyContinue)
if (-not $vercelExists) {
    Write-Host "❌ Vercel CLI not found. Install with: npm install -g vercel" -ForegroundColor Red
    exit 1
}

# Check if logged in
try {
    $projects = vercel projects list 2>&1 | Out-Null
} catch {
    Write-Host "❌ Not logged into Vercel. Run: vercel login" -ForegroundColor Red
    exit 1
}

# Build locally first
Write-Host "📦 Building locally..." -ForegroundColor Yellow
try {
    vercel build
} catch {
    Write-Host "❌ Local build failed. Fix errors and try again." -ForegroundColor Red
    exit 1
}

# Deploy
if ($Prod) {
    Write-Host "⚠️  Deploying to PRODUCTION" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? Type 'yes' to continue"
    if ($confirm -ne "yes") {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
    
    $deployCmd = "vercel --prod"
    if ($Force) {
        $deployCmd += " --force"
    }
} else {
    Write-Host "📤 Deploying to preview environment..." -ForegroundColor Yellow
    $deployCmd = "vercel"
}

# Run deployment
try {
    Invoke-Expression $deployCmd
} catch {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

# Get the latest deployment URL
$deploymentInfo = vercel ls | Select-Object -First 2 | Select-Object -Last 1
$deploymentUrl = $deploymentInfo -split '\s+' | Select-Object -Index 1

Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host "🔗 URL: $deploymentUrl" -ForegroundColor Cyan

# Wait for deployment to be ready
Write-Host "⏳ Waiting for deployment to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $deploymentUrl -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Deployment is live" -ForegroundColor Green
            break
        }
    } catch {
        if ($i -eq $maxAttempts) {
            Write-Host "⚠️  Deployment took longer than expected, but may be live" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
}

# Health check
Write-Host "🏥 Running health checks..." -ForegroundColor Yellow
$healthFiles = @("api/health.ts", "api/health.js")
$healthFileExists = $healthFiles | Where-Object { Test-Path $_ }

if ($healthFileExists) {
    $healthUrl = "$deploymentUrl/api/health"
    try {
        $healthResponse = Invoke-WebRequest -Uri $healthUrl -ErrorAction SilentlyContinue
        if ($healthResponse.Content -match "operational") {
            Write-Host "✓ Health check passed" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Health check returned unexpected status" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Health check endpoint unreachable" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
Write-Host "📊 View logs: vercel logs --follow --tail" -ForegroundColor Cyan
Write-Host "📈 View analytics: $deploymentUrl" -ForegroundColor Cyan
