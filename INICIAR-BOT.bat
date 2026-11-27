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
if not exist "node_modules\@whiskeysockets\baileys" (
 echo ERRO: Dependencias do bot ausentes. Execute npm install.
 goto fail
)
if not exist "%TESSERACT_PATH%" echo AVISO: Tesseract nao encontrado. OCR pode falhar.
if not exist "%REMBG_PATH%" echo AVISO: RemBG nao encontrado.
if not exist "node_modules\qrcode" echo AVISO: Execute npm install qrcode.
if not exist "node_modules\node-webpmux" echo AVISO: Execute npm install node-webpmux.

rem Check for an existing bot window/process launched by this script.
powershell -NoProfile -Command "$p=Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue; if($p | Where-Object {$_.CommandLine -match 'bot\.mjs' -and $_.CommandLine -like ('*'+(Get-Location).Path+'*')}){exit 0}; exit 1" >nul 2>&1
if not errorlevel 1 (
 echo O BOT Moreira ja parece estar aberto.
 goto fail
)

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
:fail
pause
exit /b 1
