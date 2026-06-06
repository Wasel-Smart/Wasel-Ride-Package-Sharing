$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [string] $Name,
    [scriptblock] $Script
  )

  Write-Host ""
  Write-Host "[verify:ci] $Name"

  & $Script
  if ($LASTEXITCODE -ne 0) {
    throw "[verify:ci] $Name failed with exit code $LASTEXITCODE"
  }
}

Invoke-Step 'type-check' {
  & .\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.tests.json
}

Invoke-Step 'lint' {
  & .\node_modules\.bin\eslint.cmd src --ext .ts,.tsx --max-warnings 0
}

Invoke-Step 'verify:contracts' {
  & node scripts/validate-openapi.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node scripts/validate-infra.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node scripts/validate-topology.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node scripts/validate-env-example.mjs
}

Invoke-Step 'test:unit' {
  $testFiles = @(Get-ChildItem -Path tests -Recurse -File |
    Where-Object { $_.Name -match '\.test\.tsx?$' } |
    Sort-Object FullName |
    ForEach-Object {
      $_.FullName.Replace((Get-Location).Path + '\', '')
    })

  $chunkSize = 4
  for ($index = 0; $index -lt $testFiles.Count; $index += $chunkSize) {
    $end = [Math]::Min($index + $chunkSize - 1, $testFiles.Count - 1)
    $chunk = @($testFiles[$index..$end])
    Write-Host "[verify:ci] vitest files $($index + 1)-$($end + 1) of $($testFiles.Count)"
    & .\node_modules\.bin\vitest.cmd run @chunk
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
}

Invoke-Step 'build' {
  & node scripts/check-build-env.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & .\node_modules\.bin\vite.cmd build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node scripts/sync-build-output.mjs
}

Write-Host ""
Write-Host "[verify:ci] all checks passed"
