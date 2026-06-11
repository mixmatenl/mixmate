# MIXMATE OS — Changelog

## [4.0.1] - 2026-06-11
### Gefixt
- Thema-wisseling verwijderd — alleen donker thema beschikbaar
- Installer: Python venv aanmaken met --without-pip + get-pip.py om PEP 668 conflict op Debian trixie te vermijden

## [4.0.0] - 2026-06-11
### Nieuw
- Testversie — alleen beschikbaar voor MATE.1 PRO

## [3.0.0] - 2026-06-11
### Nieuw
- Testversie — alleen beschikbaar voor MATE.1 CO₂ en MATE.1 PRO

## [2.1.0] - 2026-06-10
### Nieuw
- Machine model instelling in backoffice (MATE.1 / MATE.1 CO₂ / MATE.1 PRO)
- Versie-compatibiliteit: updates die niet geschikt zijn voor het model worden geblokkeerd
- CO₂ en valve-functies worden automatisch zichtbaar op geschikte modellen

## [2.0.0] - 2026-06-10
### Nieuw
- Volledig nieuw design voor dashboard, login en standby-scherm
- Twee thema's: donker (warm goud accent) en licht — instelbaar via de zon/maan-knop in de sidebar, keuze wordt onthouden
- Favorieten: tik op het hartje op een cocktailkaart; favorieten verschijnen bovenaan de sidebar
- Gietgeschiedenis: elk gemaakt drankje wordt geregistreerd
- Nieuwe backoffice-tab "Geschiedenis" met statistieken (totaal, vandaag, populairst), een top 5-grafiek en een lijst met recente gietsels
- Zoekbalk in het dashboard die real-time filtert op naam én ingrediënt

### Verbeterd
- Grotere, beeldvullende cocktailkaarten met naam over de foto en een statusbadge
- Sidebar met MIXMATE-logo en accentkleur voor de actieve categorie

## [1.2.2] - 2026-06-10
### Verbeterd
- Update-pagina toont nu alleen de release notes van de versie die je installeert

## [1.2.1] - 2026-06-10
### Verbeterd
- Update-pagina toont nu release notes in de backoffice ook vóór installeren
- Versienummer toont nu correct "v1.2.1" in plaats van git-hash

## [1.2.0] - 2026-06-10
### Gefixt
- Recepten met niet-geladen pompen werden ten onrechte als beschikbaar getoond
- Categorie-filter werkte niet (getal vs. tekst vergelijking)
- `/api/pumps/simple` endpoint gaf altijd 404 terug (route-volgorde conflict)
- PIN-wijziging ging verloren na herstart van de service
- Foto van nieuw recept werd niet getoond na opslaan (race condition)
- Login-knop bleef uitgeschakeld bij netwerkfout
- Calibratie crashte als pomp tussentijds verwijderd was
- Scrollen werkt nu ook op echte touchscreens (naast Pi muis-emulatie)
- Uploadlimiet voor receptfoto's: max 8MB

## [1.1.3] - 2026-06-10
### Nieuw
- Update-pagina toont nu release notes voordat je een update installeert
- Changelog wordt automatisch opgehaald van de nieuwste versie

### Verbeterd
- MIXMATE OS branding correct op alle relevante plekken

## [1.1.2] - 2026-06-10
### Verbeterd
- Branding: update-pagina toont nu "MIXMATE OS" met correct versienummer
- Versienummer wordt nu uit package.json gelezen in plaats van git hash

## [1.1.1] - 2026-06-10
### Verbeterd
- Paginaovergangen verwijderd (voelden traag aan)
- Naamgeving gecorrigeerd in update-pagina

## [1.1.0] - 2026-06-10
### Nieuw
- Recepten bewerken na aanmaken
- Foto uploaden vanuit computer bij recept
- Drag-to-scroll op touchscreen (geen scrollbalk meer)
- Virtueel toetsenbord verbeterd
- Cinematic standby-animatie (paneel schuift omhoog/omlaag)
- Splash screen met logo-animatie
- Skeleton loading cards bij het laden van recepten
- Schuivende categorie-indicator in de zijbalk
- Pour modal volledig vernieuwd (huidig ingrediënt groot in beeld)
- Kaarten reageren op aanraking (press-effect)
- Ambient achtergrond op dashboard

### Verbeterd
- Tekst nergens meer selecteerbaar tijdens scrollen
- Standby/uitloggen altijd zichtbaar onderaan zijbalk
- Contrast verbeterd in alle backoffice-tabs
- Recepten kunnen niet per ongeluk worden geopend tijdens scrollen

### Gefixt
- OTA update hervatte niet correct na service restart
- Logo.png werd niet correct geserveerd
- Witte tekst in witte invoervelden
- Database migratie voor ontbrekende kolommen

## [1.0.0] - 2026-05-01
### Nieuw
- Eerste release van MIXMATE OS
- Dashboard met cocktail-overzicht
- Automatisch gieten via pompen
- Backoffice voor beheer van recepten, pompen en ingrediënten
- OTA updates via backoffice
- PIN-beveiliging
- Weegschaal-integratie
