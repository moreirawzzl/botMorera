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
git symbolic-ref --quiet --short HEAD | findstr /x /c:"main" >nul
if errorlevel 1 (
 echo ERRO: A pasta nao esta na branch main. Confira com git status.
 goto fail
)
git fetch origin main
if errorlevel 1 goto gitfail
git merge --ff-only FETCH_HEAD
if errorlevel 1 goto gitfail
git merge-base --is-ancestor HEAD FETCH_HEAD
if errorlevel 1 (
 echo AVISO: Existem commits locais que nao estao na main remota.
 echo Confira git status antes de iniciar.
 goto fail
)
echo Versao atual:
git log -1 --oneline
echo Verificando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 goto npmfailure
if not exist "node_modules\qrcode" goto optionaldeps
if not exist "node_modules\node-webpmux" goto optionaldeps
goto depsdone
:optionaldeps
call npm install --no-save --package-lock=false qrcode node-webpmux
if errorlevel 1 goto npmfailure
:depsdone

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
node "%~dp0bot.mjs"
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
