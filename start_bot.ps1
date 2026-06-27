# 5minuate_study Telegram 개발 봇 실행
Set-Location $PSScriptRoot

# python-dotenv 없으면 설치
python -c "import dotenv" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[bot] python-dotenv 설치 중..."
    pip install python-dotenv
}

Write-Host "[bot] Telegram 개발 봇 시작..."
python telegram_dev_listener.py
