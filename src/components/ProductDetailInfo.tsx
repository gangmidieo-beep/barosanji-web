$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$base = 'https://api.adminplus.co.kr'
$id   = 'ap_mPCWp5eZp2OUZ2doaQ=='
$sec  = '453afb6a1099f907392472924d287197'
$outFile = Join-Path ([Environment]::GetFolderPath('Desktop')) 'neulpureun_API_result.txt'

$script:log = New-Object System.Collections.ArrayList
function Log($m) { Write-Host $m; [void]$script:log.Add([string]$m) }
function ErrBody($e) {
  try {
    $st = $e.Exception.Response.GetResponseStream()
    $rd = New-Object System.IO.StreamReader($st)
    return $rd.ReadToEnd()
  } catch { return '(응답 본문 없음)' }
}
function ErrCode($e) {
  try { return [int]$e.Exception.Response.StatusCode } catch { return 0 }
}

Log "==============================================="
Log " 늘푸른우리 - 어드민플러스 Open API 점검"
Log (" 실행시각 : " + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))
Log "==============================================="
Log ""

# ---------- 1) 토큰 발급 ----------
$access = $null
try {
  $tok = Invoke-RestMethod -Uri "$base/oauth/token" -Method Post `
         -ContentType 'application/x-www-form-urlencoded' `
         -Body @{ client_id = $id; client_secret = $sec }
  if ($tok.data.access_token) { $access = $tok.data.access_token }
  elseif ($tok.access_token)  { $access = $tok.access_token }
  Log "[1] 토큰 발급 : 성공"
  Log ("    토큰 앞자리 : " + $access.Substring(0, [Math]::Min(14, $access.Length)) + "...")
  Log ("    응답 : " + ($tok | ConvertTo-Json -Depth 5 -Compress))
} catch {
  Log "[1] 토큰 발급 : 실패"
  Log ("    상태코드 : " + (ErrCode $_))
  Log ("    응답 : " + (ErrBody $_))
}
Log ""

if ($access) {
  $hdr = @{ Authorization = "Bearer $access" }

  # ---------- 2) 주문 조회 (연결 확인용) ----------
  try {
    $o = Invoke-RestMethod -Uri "$base/v1/seller/orders?limit=1" -Method Get -Headers $hdr
    Log "[2] 주문조회 /v1/seller/orders : 성공 (연결 정상)"
  } catch {
    Log ("[2] 주문조회 /v1/seller/orders : 실패 (" + (ErrCode $_) + ") " + (ErrBody $_))
  }
  Log ""

  # ---------- 3) 상품 조회 엔드포인트 탐색 ----------
  Log "[3] 상품 조회 엔드포인트 탐색  <<< 여기가 핵심 >>>"
  Log ""
  $paths = @(
    '/v1/seller/products?limit=3',
    '/v1/seller/products?per_page=3',
    '/v1/seller/products',
    '/v1/seller/product?limit=3',
    '/v1/seller/goods?limit=3',
    '/v1/seller/items?limit=3',
    '/v1/seller/product-list?limit=3',
    '/v1/seller/product/list?limit=3'
  )
  $found = $false
  foreach ($p in $paths) {
    try {
      $r = Invoke-RestMethod -Uri "$base$p" -Method Get -Headers $hdr
      $found = $true
      Log "-----------------------------------------------"
      Log ("  [성공] GET " + $p)
      Log "-----------------------------------------------"
      Log ($r | ConvertTo-Json -Depth 8)
      Log ""
    } catch {
      Log ("  [실패] GET " + $p + "  ->  " + (ErrCode $_) + " " + (ErrBody $_))
    }
    Start-Sleep -Milliseconds 600
  }
  Log ""
  if ($found) { Log "=> 성공한 주소가 있습니다. 위 JSON 안에 이미지 주소(image/img/thumbnail 등)가 있는지 확인합니다." }
  else { Log "=> 상품 조회 주소를 못 찾았습니다. 구글시트 방식으로 전환합니다." }
}

Log ""
Log "==============================================="
Log (" 결과 파일 : " + $outFile)
Log "==============================================="

$script:log | Out-File -FilePath $outFile -Encoding UTF8
Write-Host ""
Write-Host "완료! 바탕화면의 neulpureun_API_result.txt 파일을 채팅창에 올려주세요." -ForegroundColor Green
Write-Host ""
