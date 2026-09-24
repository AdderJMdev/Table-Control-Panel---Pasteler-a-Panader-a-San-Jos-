@echo off
setlocal EnableExtensions EnableDelayedExpansion
title San Jose - Desinstalacion
chcp 65001 >nul

set "TARGET=%LOCALAPPDATA%\SanJose"
set "TASK=SanJose-Servidor"

echo ============================================================
echo   Desinstalacion del Panel de Mesas - Pasteleria San Jose
echo ============================================================
echo.
echo   Se eliminara:
echo     - Tarea programada : %TASK%
echo     - Carpeta          : %TARGET%
echo     - Acceso directo del Escritorio
echo.
set /p CONFIRM="Seguro de desinstalar? (S/N): "
if /i not "!CONFIRM!"=="S" goto end

echo [1/3] Deteniendo el servidor si esta corriendo ...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'server\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [2/3] Eliminando la tarea programada ...
schtasks /delete /tn "%TASK%" /f >nul 2>&1

echo [3/3] Eliminando carpeta y accesos directos ...
if exist "%TARGET%" rmdir /s /q "%TARGET%"
if exist "%USERPROFILE%\Desktop\San Jose - Panel.url" del "%USERPROFILE%\Desktop\San Jose - Panel.url" >nul
if exist "%USERPROFILE%\Desktop\San José - Panel.url" del "%USERPROFILE%\Desktop\San José - Panel.url" >nul

echo.
echo   Desinstalacion completada.
echo   Nota: la app instalada del navegador se elimina desde el propio
echo   navegador (chrome://apps o edge://apps -^> boton derecho -^> Eliminar).
echo.
pause

:end
endlocal
exit /b 0