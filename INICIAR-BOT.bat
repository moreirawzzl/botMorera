@echo off
setlocal
title BOT Moreira
cd /d "%~dp0"
set "TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe"
set "REMBG_PATH=%LOCALAPPDATA%\Programs\Python\Python312\Scripts\rembg.exe"
set "LIBRETRANSLATE_URL=http://127.0.0.1:5000"
set "LIBRE_EXE=%USERPROFILE%\libretranslate-env\Scripts\libretranslate.exe"

if not exist "bot.mjs" (
 echo ERRO: bot.mjs nao encontrado. Abra este BAT na pasta do bot.
 goto fail
)
where node >nul 2>&1
if errorlevel 1 (
 echo ERRO: Node.js nao encontrado.
 goto fail
)
if not exist "%TESSERACT_PATH%" echo AVISO: Tesseract nao encontrado. OCR pode falhar.
if not exist "%REMBG_PATH%" echo AVISO: RemBG nao encontrado.

rem Check for a running bot before changing files.
powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match '(?i)\bbot\.mjs\b' }) { exit 0 }; exit 1" >nul 2>&1
if not errorlevel 1 (
 echo Feche a instancia do bot antes de atualizar.
 goto fail
)

echo Verificando atualizacoes na main...
where git >nul 2>&1
if errorlevel 1 goto gitfail
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto gitfail
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "%CURRENT_BRANCH%"=="main" (
 echo ERRO: Branch atual: [%CURRENT_BRANCH%]. Esperado: main.
 goto fail
)
git fetch origin main
if errorlevel 1 goto gitfail
git merge --ff-only FETCH_HEAD
if errorlevel 1 goto gitfail
set "LOCAL_HEAD="
set "REMOTE_HEAD="
for /f "delims=" %%H in ('git rev-parse HEAD') do set "LOCAL_HEAD=%%H"
for /f "delims=" %%H in ('git rev-parse FETCH_HEAD') do set "REMOTE_HEAD=%%H"
if /i not "%LOCAL_HEAD%"=="%REMOTE_HEAD%" (
 echo AVISO: A versao local esta a frente da main remota.
 echo Os commits locais foram preservados; iniciando sem enviar nada ao GitHub.
)
echo Versao atual:
git log -1 --oneline
echo Verificando dependencias...
call npm install --no-save --package-lock=false --no-audit --no-fund qrcode node-webpmux
if errorlevel 1 goto npmfailure

echo Verificando LibreTranslate...
call :health
if not errorlevel 1 goto runbot
if not exist "%LIBRE_EXE%" (
 echo AVISO: LibreTranslate nao encontrado. O bot iniciara sem tradutor.
 goto runbot
)
rem Avoid starting a second server if port 5000 is already occupied.
powershell -NoProfile -Command "if(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue){exit 0};exit 1" >nul 2>&1
if not errorlevel 1 goto waitserver
start "Moreira - LibreTranslate" "%LIBRE_EXE%" --host 127.0.0.1 --port 5000 --load-only pt,en,es --threads 1
:waitserver
echo Aguardando servidor de traducao...
for /L %%i in (1,1,90) do (
 call :health
 if not errorlevel 1 goto runbot
 timeout /t 2 /nobreak >nul
)
echo AVISO: Tradutor ainda nao respondeu. O bot iniciara mesmo assim.
:runbot
echo Iniciando BOT Moreira...
node "%~dp0supervisor.mjs"
echo.
echo O bot foi encerrado. Codigo: %errorlevel%
pause
exit /b
:health
curl.exe --silent --fail --max-time 2 "%LIBRETRANSLATE_URL%/languages" >nul 2>&1
exit /b %errorlevel%
:gitfail
echo ERRO: Nao foi possivel atualizar a main com seguranca.
echo Nenhum reset ou limpeza automatica foi executado.
git status --short
goto fail
:npmfailure
echo ERRO: Falha na instalacao das dependencias.
:fail
pause
exit /b 1
