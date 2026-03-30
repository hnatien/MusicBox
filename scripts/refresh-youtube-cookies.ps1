param(
    [string]$Browser = "brave",
    [string]$CookieFile = "./secrets/youtube-cookies.txt",
    [string]$ProbeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
)

$ErrorActionPreference = "Stop"

$cookieDir = Split-Path -Parent $CookieFile
if (-not (Test-Path $cookieDir)) {
    New-Item -ItemType Directory -Path $cookieDir -Force | Out-Null
}

Write-Host "Exporting YouTube cookies from browser profile: $Browser"

$env:MUSICBOX_COOKIE_BROWSER = $Browser
$rawCookieFile = "$CookieFile.raw"
$env:MUSICBOX_COOKIE_FILE = $rawCookieFile
$env:MUSICBOX_COOKIE_PROBE_URL = $ProbeUrl

node .\scripts\refresh-youtube-cookies.mjs

if ($LASTEXITCODE -ne 0) {
    throw "Failed to refresh cookies with exit code $LASTEXITCODE"
}

if (-not (Test-Path $rawCookieFile)) {
    throw "Cookie file was not created: $rawCookieFile"
}

# Keep only youtube.com cookies to avoid leaking unrelated sessions.
$lines = Get-Content $rawCookieFile
$filtered = @()
foreach ($line in $lines) {
    if ($line.StartsWith("#")) {
        $filtered += $line
        continue
    }

    if ([string]::IsNullOrWhiteSpace($line)) {
        continue
    }

    $parts = $line -split "`t"
    if ($parts.Length -lt 7) {
        continue
    }

    $domain = $parts[0].Trim()
    if ($domain -eq "youtube.com" -or $domain -eq ".youtube.com" -or $domain -eq "www.youtube.com") {
        $filtered += $line
    }
}

if ($filtered.Count -lt 3) {
    Remove-Item $rawCookieFile -ErrorAction SilentlyContinue
    throw "No YouTube cookies were extracted"
}

Set-Content -Path $CookieFile -Value $filtered -Encoding UTF8
Remove-Item $rawCookieFile -ErrorAction SilentlyContinue

Write-Host "Cookie file refreshed: $CookieFile"
