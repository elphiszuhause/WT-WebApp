# WT Baustellenformulare

Mobile, installierbare Web-App für Baustellenprotokolle von WAGNER Building Systems S.A.

## Funktionen

- zentrale, einheitliche Navigation zu allen produktiven Formularen
- automatische lokale Entwurfssicherung je Benutzer, Formular und Gerät
- touchfähige Unterschriftsfelder mit Sicherung bei Größenänderungen
- einheitlicher PDF-Export mit Browserdruck als Rückfalloption
- installierbare Bedienoberfläche; geschützte Formulare benötigen aus Sicherheitsgründen eine Verbindung
- responsive Darstellung für Smartphone, Tablet und Desktop
- vorhandene Word-, Excel- und PDF-Vorlagen bleiben verfügbar
- Wartungsanweisungen für Gas- und Öl-Heizungen können online ausgefüllt oder als PDF- und Word-Vorlage heruntergeladen werden

## Datenschutz

Formulardaten werden ausschließlich im lokalen Speicher des verwendeten Browsers und getrennt nach Benutzerkonto gesichert. Es gibt derzeit keine Übertragung an einen Server und keine zentrale Ablage. Fertige Protokolle müssen vom Benutzer als PDF gespeichert und nach dem betrieblichen Ablageprozess weitergegeben werden.

## Veröffentlichung

Die App ist für statisches Hosting ausgelegt. Alle internen Links sind relativ und funktionieren dadurch sowohl auf einer eigenen Domain als auch in einem GitHub-Pages-Unterverzeichnis.

## Test- und Produktivumgebung

- `elphiszuhause.github.io` verwendet ausschließlich das produktive Supabase-Projekt.
- Cloudflare-Vorschauen und lokale Entwicklungsadressen verwenden das Supabase-Testprojekt.
- Die Testumgebung ist in der Oberfläche deutlich als solche gekennzeichnet.
- Neue produktive Hostnamen müssen vor der Freigabe ausdrücklich in `PRODUCTION_HOSTNAMES` in `assets/auth.js` aufgenommen werden.

### Serverseitiger Zugriffsschutz auf Cloudflare

Cloudflare-Preview-Bereitstellungen schützen Formulare und Downloads über Pages Functions. Die Supabase-Sitzung liegt dort in `HttpOnly`-Cookies und ist nicht durch JavaScript auslesbar. Nicht angemeldete Direktaufrufe werden zur Anmeldung umgeleitet. Geschützte Inhalte werden weder vom Service Worker noch vom Browser zwischengespeichert.

Für Einladungen muss die **Site URL** des Supabase-Testprojekts auf die öffentliche Loginseite zeigen:

`https://upgrade-professionalisierung.wt-webapp.pages.dev/login`

Die Cloudflare-Fassung muss vor einer Übernahme nach `main` vollständig getestet werden. GitHub Pages kann keine Pages Functions ausführen und bleibt bis zur späteren Hosting-Umstellung beim bisherigen clientseitigen Login.

## Bedienhinweise

1. Formular auf der Startseite öffnen.
2. Daten eintragen; der Entwurf wird automatisch gespeichert.
3. Unterschriften direkt auf dem Touchscreen erfassen.
4. Mit **PDF speichern** das Protokoll erzeugen.
5. Nach erfolgreicher Ablage das Formular über **Formular leeren** zurücksetzen.

## Technischer Hinweis

Prüfdrücke, Prüfzeiten und fachliche Vorgaben müssen vor der betrieblichen Freigabe durch eine verantwortliche Fachkraft gegen die aktuell geltenden Regeln und die jeweiligen Herstellerangaben geprüft werden.
