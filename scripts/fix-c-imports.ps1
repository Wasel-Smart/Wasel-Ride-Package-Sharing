$root = "C:\Users\user\Wasel14.online\src"
$files = Get-ChildItem -Recurse -Path $root -Include "*.ts","*.tsx" | Select-Object -ExpandProperty FullName
$fixed = 0

foreach ($f in $files) {
    $content = Get-Content $f -Raw
    $usesC = $content -match '\bC\.(cyan|green|error|gold|text|bg|brand|border|card|overlay|shadow|muted|primary|secondary|lime|on|surface|input|ring|disabled)'
    $importsC = $content -match 'import\s*\{[^}]*\bC\b[^}]*\}'
    if (-not $usesC -or $importsC) { continue }

    # Try to add C to existing wasel-ds import
    if ($content -match "import\s*\{[^}]*\}\s*from\s*['""][^'""]*wasel-ds['""]") {
        $newContent = $content -replace "(import\s*\{)([^}]*?)(\}\s*from\s*['""][^'""]*wasel-ds['""])", '$1 C, $2$3'
        Set-Content -Path $f -Value $newContent -NoNewline
        $fixed++
        continue
    }

    # No wasel-ds import at all — add one after the last import line
    $lines = Get-Content $f
    $lastImport = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^import ') { $lastImport = $i }
    }
    if ($lastImport -lt 0) { continue }

    $fileDir = Split-Path $f
    $dsPath = "C:\Users\user\Wasel14.online\src\utils\wasel-ds.ts"
    $rel = [System.IO.Path]::GetRelativePath($fileDir, $dsPath) -replace '\\','/'
    if (-not $rel.StartsWith('.')) { $rel = './' + $rel }
    $newLines = @($lines[0..$lastImport]) + "import { C } from '$rel';" + @($lines[($lastImport+1)..($lines.Length-1)])
    Set-Content -Path $f -Value ($newLines -join "`n") -NoNewline
    $fixed++
}

Write-Host "Fixed $fixed files"
