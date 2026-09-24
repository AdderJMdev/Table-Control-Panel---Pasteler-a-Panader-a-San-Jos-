=============================================================================
  PASTELERIA SAN JOSE - PANEL DE CONTROL DE MESAS (PORTABLE WINDOWS)
=============================================================================

Version portable para Windows 10 / 11. No requiere instalacion de Node.js
ni de ningun otro programa: todo vive en una carpeta y los datos se guardan
junto a la aplicacion. Una vez instalado, el servidor se inicia solo al
encender Windows.

-----------------------------------------------------------------------------
1) INSTALACION (una sola vez)
-----------------------------------------------------------------------------
   a) Copia la carpeta "SanJose-Portable" a tu PC (desde una USB o red) o
      descomprime SanJose-Portable.zip en cualquier carpeta, por ejemplo:
         C:\SanJose  o  el Escritorio
   b) Haz doble clic en:   Instalar-SanJose.bat
      (No hace falta ejecutarlo como administrador.)
   c) Que hace el instalador?
        - Copia la aplicacion a:  %LOCALAPPDATA%\SanJose
          (eso es: C:\Users\<tu-usuario>\AppData\Local\SanJose)
        - Crea una tarea programada "SanJose-Servidor" que arranca el
          servidor automaticamente al iniciar sesion de Windows.
        - Crea un acceso directo "San Jose - Panel" en el Escritorio.
        - Inicia el servidor y abre el navegador en http://localhost:3000
   d) IMPORTANTE - Instalar la APP:
        En el navegador que se abrio (Chrome o Edge), usa el boton
        "Instalar app" (icono de monitor con flecha, junto a la barra de
        direcciones) o el menu del navegador:
           Chrome:  menu (3 puntos) -> "Instalar Pasteleria San Jose..."
           Edge:    menu (3 puntos) -> "Aplicaciones" -> "Instalar esta
                    aplicacion como..."
        La app quedara en el Escritorio / Menu Inicio con su propio icono.
        Use SIEMPRE esa app para trabajar, no una pestana normal.
   e) Ya puedes cerrar la ventana del servidor que el instalador abrio.
      El USB o la carpeta original ya no hacen falta: la app instalada
      trabaja contra el servidor de disco.

-----------------------------------------------------------------------------
2) USO DIARIO
-----------------------------------------------------------------------------
   Al encender/reiniciar Windows:
       - El servidor arranca solo (tarea programada, sin ventanas visibles).
       - Abre la app "Pasteleria San Jose" (instalada en el paso 1d).
   El panel exige el PIN (por defecto 123456).
   La app necesita el servidor local corriendo: los datos y la sincronizacion
   en tiempo real viven en el servidor. El servidor se inicia solo con Windows.

-----------------------------------------------------------------------------
3) BASE DE DATOS Y DATOS
-----------------------------------------------------------------------------
   Todos los datos se guardan en la carpeta de la aplicacion:
       %LOCALAPPDATA%\SanJose\san_jose.db
   Para hacer una copia de seguridad: copia ese archivo (y, si tenes los
   archivos "-shm"/"-wal", el .db final) a otro lugar. Para restaurar en
   otro PC: reemplaza el san_jose.db por la copia.
   NOTA: la instalacion funciona en modo portátil: si mueves la carpeta de
   %LOCALAPPDATA%\SanJose, vuelve a ejecutar Instalar-SanJose.bat.

-----------------------------------------------------------------------------
4) CONFIGURACION AVANZADA (config.local.json)
-----------------------------------------------------------------------------
   Junto a la aplicacion hay un archivo  config.local.json  con:

       {
         "port": 3000,           <- puerto del servidor (cambiarlo solo si
                                    el 3000 esta ocupado por otro programa)
         "host": "0.0.0.0",      <- escucha en todas las interfaces de red
                                    (permite multi-pantalla en el local)
         "autoOpenBrowser": false <- true = abrir el navegador solo al
                                    arrancar el servidor con Windows
       }

   IMPORTANTE: si cambias el puerto DESPUES de haber instalado la app del
   navegador, la app ya no encontrara el servidor (la URL queda fija).
   Cambia el puerto solo ANTES de instalar la app, o reinstala la app.
   Si cambias el port, actualiza tambien el acceso directo del Escritorio
   (San Jose - Panel.url) con la nueva direccion.

   Si el puerto 3000 esta ocupado al iniciar: revisa %LOCALAPPDATA%\SanJose
   \server.log para ver el mensaje de error.

-----------------------------------------------------------------------------
5) MULTI-PANTALLA EN RED (otras tablets/PC del local)
-----------------------------------------------------------------------------
   - La primera vez que el servidor escuche en 0.0.0.0, Windows Firewall
     preguntara si permitir el acceso. Marca "Redes privadas" -> Permitir.
     (Si no aparece, crea una regla de entrada para node.exe / puerto 3000).
   - Desde otro dispositivo abre:  http://IP-DEL-PC:3000
     (la IP aparece en server.log al iniciar el servidor).

-----------------------------------------------------------------------------
6) DESINSTALAR
-----------------------------------------------------------------------------
   a) Doble clic en  Desinstalar-SanJose.bat
      (se detiene el servidor, se borra la tarea programada, la carpeta y
       el acceso directo del Escritorio)
   b) Quita la app instalada del navegador:
        Chrome: chrome://apps  -> boton derecho sobre "Mesas San Jose" -> Eliminar
        Edge:   edge://apps   -> boton derecho sobre "Mesas San Jose" -> Eliminar

-----------------------------------------------------------------------------
7) PROBLEMAS FRECUENTES
-----------------------------------------------------------------------------
   * "El puerto 3000 ya esta en uso": otro programa usa ese puerto.
     Cambialo en config.local.json (seccion 4) ANTES de instalar la app.
   * La app no abre / "Servidor Local Desconectado":
     revisa si el servidor esta corriendo (Administrador de tareas debe
     mostrar un proceso node.exe). Mira %LOCALAPPDATA%\SanJose\server.log.
   * Quiero que arranque sin iniciar sesion (toda la noche):
     ejecuta como administrador:
       schtasks /create /f /tn "SanJose-Servidor" /sc onstart /ru SYSTEM /rl highest /tr "\"wscript.exe\" \"%LOCALAPPDATA%\SanJose\iniciar-servidor.vbs\""

=============================================================================