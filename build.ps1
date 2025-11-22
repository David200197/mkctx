# build.ps1 - Build script for Windows PowerShell

Write-Host "Building mkctx for all platforms..." -ForegroundColor Green

# Create directory structure
$platforms = @("win32", "darwin", "linux")
$archs = @("x64", "arm64")

foreach ($platform in $platforms) {
    foreach ($arch in $archs) {
        $dir = "bin/$platform/$arch"
        Write-Host "Creating directory: $dir"
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

# Build for each platform
Write-Host "Building for Windows x64..." -ForegroundColor Yellow
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -o bin/win32/x64/mkctx.exe main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build for Windows x64" -ForegroundColor Red
}

Write-Host "Building for Windows ARM64..." -ForegroundColor Yellow
$env:GOOS = "windows"
$env:GOARCH = "arm64"
go build -o bin/win32/arm64/mkctx.exe main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build for Windows ARM64" -ForegroundColor Red
}

Write-Host "Building for macOS x64..." -ForegroundColor Yellow
$env:GOOS = "darwin"
$env:GOARCH = "amd64"
go build -o bin/darwin/x64/mkctx main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build for macOS x64" -ForegroundColor Red
}

Write-Host "Building for macOS ARM64..." -ForegroundColor Yellow
$env:GOOS = "darwin"
$env:GOARCH = "arm64"
go build -o bin/darwin/arm64/mkctx main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build for macOS ARM64" -ForegroundColor Red
}

Write-Host "Building for Linux x64..." -ForegroundColor Yellow
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -o bin/linux/x64/mkctx main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build for Linux x64" -ForegroundColor Red
}

Write-Host "Building for Linux ARM64..." -ForegroundColor Yellow
$env:GOOS = "linux"
$env:GOARCH = "arm64"
go build -o bin/linux/arm64/mkctx main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build for Linux ARM64" -ForegroundColor Red
}

Write-Host "Build completed!" -ForegroundColor Green

# Verify created files
Write-Host "Files created:" -ForegroundColor Cyan
if (Test-Path "bin") {
    Get-ChildItem -Recurse "bin" | ForEach-Object { Write-Host "   - $($_.FullName)" }
} else {
    Write-Host "   No bin directory found" -ForegroundColor Red
}