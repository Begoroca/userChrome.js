# RemovePrintTime
Dieses Skript sorgt daf�r, dass bei einem Ausdruck die Uhrzeit nicht gedruckt wird, indem die m�glichen about:config-Eintr�ge gescannt und ggf. 
die Einstellung "Uhrzeit/Datum" durch das aktuelle Datum ohne Uhrzeit (also "Benutzerdefiniert") ersetzt werden.

## Installation
Kopiere die uc.js-Datei in den Chromeordner des Profils. Passe den Namen des Druckers in Zeile 12 an. Bei Netzwerkdruckern, die unter about:config 
als `\\Servername\Druckerfreigabe` zu sehen sind, m�ssen die Backslashs verdoppelt werden (`\\\\Servername\\Druckerfreigabe`).