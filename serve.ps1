$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8787
$url = "http://localhost:$port/"
$scriptUrl = "https://script.google.com/macros/s/AKfycbyWtZLE8DsQqPj1pAgsdQL2XOrLUzxGUMqC5d66iIREBQcjook0Xgx_XRI7zNQXN08vnw/exec"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try {
  $listener.Start()
} catch {
  Start-Process $url
  Write-Host "MPrint admin is already open at $url"
  return
}
Write-Host "MPrint admin: $url"
Start-Process $url
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
  if ($ctx.Request.HttpMethod -eq "POST" -and $rel -eq "/api/sale") {
    $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, [System.Text.Encoding]::UTF8)
    $body = $reader.ReadToEnd()
    $reader.Close()
    try {
      $remote = Invoke-WebRequest -Method POST -Uri $scriptUrl -Body $body -ContentType "text/plain;charset=utf-8" -MaximumRedirection 5 -UseBasicParsing
      $out = [System.Text.Encoding]::UTF8.GetBytes($remote.Content)
      $ctx.Response.StatusCode = 200
      $ctx.Response.ContentType = "application/json; charset=utf-8"
      $ctx.Response.ContentLength64 = $out.Length
      $ctx.Response.OutputStream.Write($out, 0, $out.Length)
    } catch {
      $out = [System.Text.Encoding]::UTF8.GetBytes('{"ok":false}')
      $ctx.Response.StatusCode = 502
      $ctx.Response.ContentType = "application/json; charset=utf-8"
      $ctx.Response.ContentLength64 = $out.Length
      $ctx.Response.OutputStream.Write($out, 0, $out.Length)
    }
    $ctx.Response.Close()
    continue
  }
  if ($rel -eq "/") { $rel = "/index.html" }
  $file = Join-Path $root ($rel.TrimStart("/") -replace "/", "\")
  $full = [IO.Path]::GetFullPath($file)
  if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($full)
    $ext = [IO.Path]::GetExtension($full).ToLower()
    $type = switch ($ext) {
      ".html" { "text/html; charset=utf-8" }
      ".png" { "image/png" }
      ".css" { "text/css; charset=utf-8" }
      ".js" { "text/javascript; charset=utf-8" }
      default { "application/octet-stream" }
    }
    $ctx.Response.ContentType = $type
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
