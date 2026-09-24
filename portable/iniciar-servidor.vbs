'=============================================================================
'  Lanzador oculto del servidor (sin ventana de consola).
'  Es ejecutado por la tarea programada "SanJose-Servidor" al iniciar sesion
'  de Windows.
'=============================================================================
Option Explicit

Dim fso, shell, scriptDir
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' Carpeta donde vive este script = raiz de la aplicacion instalada
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = scriptDir

' 0 = oculto (sin ventana), False = no esperar a que termine
shell.Run "node.exe src/server.js", 0, False