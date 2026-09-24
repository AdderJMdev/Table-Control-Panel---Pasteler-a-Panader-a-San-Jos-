@echo off
setlocal EnableExtensions EnableDelayedExpansion
title San Jose - Instalacion (una sola vez)
chcp 65001 >nul

set "SOURCE=%~dp0"
set "TARGET=%LOCALAPPDATA%\SanJose"
set "TASK=SanJose-Servidor"

echo ============================================================
echo   Pasteleria San Jose - Instalacion del Panel de Mesas
echo   (solo debe ejecutarse UNA vez)
echo ============================================================
echo.
echo   Instalara el servidor en:
echo     %TARGET%
echo.

if /i "%~1"=="/help" goto help

if exist "%TARGET%\node.exe" (
  echo [!] Ya existe una instalacion en esa carpeta.
  set /p REPLACE="Actualizar/reemplazar archivos? (S/N): "
  if /i not "!REPLACE!"=="S" goto end
  echo.
)

echo [1/4] Copiando la aplicacion a %TARGET% ...
if not exist "%TARGET%" mkdir "%TARGET%"
xcopy "%SOURCE%*" "%TARGET%\" /E /I /Y /Q >nul
if errorlevel 1 goto error

echo [2/4] Creando tarea de inicio automatico con Windows ...
schtasks /create /f /tn "%TASK%" /sc onlogon /rl limited /tr "\"wscript.exe\" \"%TARGET%\iniciar-servidor.vbs\"" >nul 2>&1
if errorlevel 1 (
  echo [!] No se pudo crear la tarea programada.
  echo     Prueba ejecutando este .bat con clic derecho -^> "Ejecutar como administrador".
  goto error
)

echo [3/4] Creando acceso directo en el Escritorio ...
(
  echo [InternetShortcut]
  echo URL=http://localhost:3000
  echo IconFile=%SystemRoot%\system32\imageres.dll
  echo IconIndex=248
) > "%USERPROFILE%\Desktop\San Jose - Panel.url"

echo [4/4] Iniciando el servidor y abriendo el navegador ...
start "SanJose-Server" /D "%TARGET%" cmd /k "set SANJOSE_OPEN_BROWSER=1 && node.exe src/server.js"

echo.
echo ============================================================
echo   INSTALACION COMPLETADA
echo ============================================================
echo   * En el navegador que se abrio, instala la app con el
echo     boton "Instalar app" (icono de monitor con flecha) o
echo     desde el menu de Chrome/Edge (Instalar Pasteleria
echo     San Jose...). Quedara en el Escritorio / Menu Inicio.
echo   * El servidor se iniciara solo al encender Windows.
echo   * Puedes cerrar esta ventana del servidor cuando quieras.
echo     Los datos quedan en: %TARGET%\san_jose.db
echo   * Para desinstalar: doble clic en "Desinstalar-SanJose.bat".
echo ============================================================
pause
goto end

:help
echo.
echo   Uso:  Instalar-SanJose.bat
echo   (se ejecuta una sola vez; no requiere permisos de admin)
echo.
goto end

:error
echo.
echo [X] Ocurrio un error durante la instalacion.
echo     Revisa el mensaje anterior e intenta de nuevo.
echo.
pause

:end
endlocal
exit /b 0