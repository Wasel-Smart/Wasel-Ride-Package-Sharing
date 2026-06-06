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

Invoke-Step 'type-check:tests' {
  & .\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.tests.json
}

Invoke-Step 'type-check' {
  & .\node_modules\.bin\tsc.cmd --noEmit
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
  & .\node_modules\.bin\vitest.cmd run
}

Invoke-Step 'build' {
  & node scripts/check-build-env.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & .\node_modules\.bin\tsc.cmd --noEmit
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & .\node_modules\.bin\vite.cmd build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node scripts/sync-build-output.mjs
}

Write-Host ""
Write-Host "[verify:ci] all checks passed"
