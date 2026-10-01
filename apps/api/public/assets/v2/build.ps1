param(
  [string]$Out = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "index.html")
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$assets = Split-Path $here -Parent
$shell = Get-Content -LiteralPath (Join-Path $here "shell.html") -Raw -Encoding UTF8
$fonts = Get-Content -LiteralPath (Join-Path $here "fonts.css") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $here "styles.css") -Raw -Encoding UTF8
$data = Get-Content -LiteralPath (Join-Path $assets "data.js") -Raw -Encoding UTF8
$scene = Get-Content -LiteralPath (Join-Path $here "scene.js") -Raw -Encoding UTF8
$app = Get-Content -LiteralPath (Join-Path $here "app.js") -Raw -Encoding UTF8
$built = $shell.Replace("<!--STYLES-->", ($fonts + "`r`n" + $css)).Replace("<!--SCENE-->", $scene).Replace("<!--DATA-->", $data).Replace("<!--APP-->", $app)
Set-Content -LiteralPath $Out -Value $built -Encoding UTF8 -NoNewline
Write-Output ("built: " + $Out)
Write-Output ("bytes: " + (Get-Item -LiteralPath $Out).Length)
