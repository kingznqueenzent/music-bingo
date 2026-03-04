# Push Music Bingo to GitHub
# Run this in PowerShell from the project root, or: .\scripts\push-to-github.ps1
# Requires: Git installed (https://git-scm.com/download/win)

$ErrorActionPreference = "Stop"
# Project root = parent of the scripts folder
$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $repoRoot "package.json"))) {
  $repoRoot = Get-Location
}
Set-Location $repoRoot

$remoteUrl = "https://github.com/kingznqueenzent/music-bingo.git"
# If your repo has a different name, edit the line above.

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Git is not installed or not in PATH. Install from https://git-scm.com/download/win then run this script again."
  exit 1
}

if (-not (Test-Path ".git")) {
  git init
  git add .
  git commit -m "Initial commit - Music Bingo"
  git branch -M main
  git remote add origin $remoteUrl
  git push -u origin main
} else {
  git add .
  git status
  $msg = git status --short
  if ($msg) {
    git commit -m "Update - Music Bingo"
  }
  $remotes = git remote -v 2>$null
  if (-not $remotes) {
    git remote add origin $remoteUrl
  }
  git push -u origin main
}

Write-Host "Done. Repo: https://github.com/kingznqueenzent/music-bingo"
