# VSCode API Navigator Installation Script
# Author: Dankit
# Description: Package and install VSCode extension

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  VSCode API Navigator Installer" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check VSCode
Write-Host "Checking VSCode..." -ForegroundColor Yellow
try {
    $codeVersion = code --version 2>&1 | Select-Object -First 1
    Write-Host "VSCode installed: $codeVersion" -ForegroundColor Green
} catch {
    Write-Host "VSCode CLI not found." -ForegroundColor Red
    Write-Host "Please install 'code' command in PATH from VSCode." -ForegroundColor Yellow
    exit 1
}

# Check vsce
Write-Host "Checking vsce..." -ForegroundColor Yellow
try {
    $vsceVersion = vsce --version 2>&1
    Write-Host "vsce installed: $vsceVersion" -ForegroundColor Green
} catch {
    Write-Host "vsce not found. Installing..." -ForegroundColor Yellow
    npm install -g @vscode/vsce
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install vsce" -ForegroundColor Red
        exit 1
    }
    Write-Host "vsce installed successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green

# Compile
Write-Host "Compiling..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "Compilation successful" -ForegroundColor Green

# Package
Write-Host "Packaging extension..." -ForegroundColor Yellow
vsce package
if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed" -ForegroundColor Red
    exit 1
}
Write-Host "Packaging successful" -ForegroundColor Green

# # Find .vsix file
# $vsixFile = Get-ChildItem -Filter "*.vsix" | Sort-Object { 
#     if ($_ -match "\d+\.\d+\.\d+") {
#         [version]($matches[0]) 
#     } else {
#         [version]"0.0.0" 
#     } 
# } -Descending | Select-Object -First 1

# if (-not $vsixFile) {
#     Write-Host ".vsix file not found" -ForegroundColor Red
#     exit 1
# }

# Write-Host "Extension file: $($vsixFile.Name)" -ForegroundColor Cyan

# # Uninstall old version
# $extensionId = "dankit.vscode-api-navigator"
# Write-Host "Uninstalling old version..." -ForegroundColor Yellow
# code --uninstall-extension $extensionId | Out-Null
# Start-Sleep -Seconds 1

# # Install extension
# Write-Host "Installing extension..." -ForegroundColor Yellow
# code --install-extension $vsixFile.FullName
# if ($LASTEXITCODE -ne 0) {
#     Write-Host "Installation failed" -ForegroundColor Red
#     exit 1
# }

# Write-Host ""
# Write-Host "=====================================" -ForegroundColor Green
# Write-Host "  Installation successful!" -ForegroundColor Green
# Write-Host "=====================================" -ForegroundColor Green
# Write-Host ""
# Write-Host "Please restart VSCode to load the extension" -ForegroundColor Yellow
# Write-Host ""

# Ask to restart VSCode
# $restart = Read-Host "Restart VSCode now? (Y/N)"
# if ($restart -eq 'Y' -or $restart -eq 'y') {
#     Write-Host "Restarting VSCode..." -ForegroundColor Yellow
#     Get-Process code -ErrorAction SilentlyContinue | Stop-Process -Force
#     Start-Sleep -Seconds 2
#     code .
# }

Write-Host "Done" -ForegroundColor Cyan
