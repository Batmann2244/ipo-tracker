# Load environment variables from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
            Write-Host "Loaded: $name" -ForegroundColor Green
        }
    }
}

# Run the development server
Write-Host "`nStarting IPO Analyzer Server..." -ForegroundColor Cyan
npx tsx server/index.ts
