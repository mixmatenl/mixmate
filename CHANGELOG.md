## [4.9.17] - 2026-07-23
### Gewijzigd
- Update-melding is nu een iOS-stijl popup bovenin het scherm met "Nu installeren" en "Later" knoppen
- Update-icoontje in de statusbalk verwijderd

## [4.9.16] - 2026-07-23
### Nieuw
- Standby-scherm dimt automatisch na 60 seconden geen beweging (via front-camera)
- Bij beweging wordt het scherm meteen weer helder
- Werkt alleen als de browser cameratoegang heeft (HTTPS vereist)

## [4.9.15] - 2026-07-23
### Gewijzigd
- Update-status wordt elke 10 seconden gepolld i.p.v. elke 60 seconden

## [4.9.14] - 2026-07-23
### Opgelost
- Update-knop in topbalk navigeert nu naar bestaand update-scherm in Instellingen (navigatie werkt weer normaal)
- AppUpdate terug naar originele ingebedde weergave (geen overlay meer)

## [4.9.13] - 2026-07-23
### Nieuw
- Update-icoontje in topbalk zodra er een update beschikbaar is — klik om direct te installeren
- Backend checkt elke 10 minuten automatisch op updates (geen auto-install meer bij opstarten)
### Gewijzigd
- Auto-update bij opstarten verwijderd — updates worden nu handmatig geïnstalleerd via de topbalk
- AppUpdate-scherm opent als overlay en toont direct de beschikbare update

## [4.9.12] - 2026-07-23
### Gewijzigd
- RestartScreen: cocktailglas SVG vervangen door /logo.png (zelfde logo als standby-scherm)

## [4.9.11] - 2026-07-23
### Opgelost
- auto-update.sh herstelt execute-bit van scripts na git reset --hard (permanente fix voor network-setup.sh 203/EXEC)
- setup-service.sh voegt chmod +x en network-setup.sh toe aan systemd service bij installatie

## [4.9.10] - 2026-07-23
### Opgelost
- network-setup.sh execute-bit opnieuw permanent vastgezet in git (was per ongeluk 100644 geworden)

## [4.9.9] - 2026-07-23
### Gewijzigd
- RestartScreen: MIXMATE logo ademt nu altijd (niet alleen in herstart-fase)
- RestartScreen: tekst veranderd naar "De machine wordt opnieuw opgestart." in beide fases
- RestartScreen: na herstart automatisch terug naar dashboard zodra backend weer online is (polling elke 2s na 8s vertraging)

## [4.9.8] - 2026-07-23
### Gewijzigd
- Herstart-animatie toont eerst 2.5s aankondiging, daarna pas echte restart — tablet bevriest mooi op het animatiescherm
- network-setup.sh execute-bit permanent in git opgeslagen (geen chmod meer nodig na git pull)

## [4.9.7] - 2026-07-23
### Nieuw
- Herstart-animatiescherm met MIXMATE logo en spinner bij "Machine herstarten"
### Opgelost
- Herstart-knop werkt nu direct bij eerste klik (wacht niet meer op API-response)

## [4.9.6] - 2026-07-23
### Gewijzigd
- Koppelscherm: URL gewijzigd van mixmate.nl naar portaal.mixmate.nl
- Koppelscherm: stap 3 verduidelijkt naar "Mijn machines → Machine koppelen"
- Koppelscherm: code vernieuwd elke 30 seconden i.p.v. elke 5 seconden

## [4.9.5] - 2026-07-23
### Opgelost
- cloud_client: interne HTTP calls omgezet naar HTTPS na SSL-migratie (koppelcode werkte niet meer)

## [4.9.4] - 2026-07-23
### Nieuw
- cloud_client.py: generieke `http_proxy` message-handler zodat cloud alle REST-calls kan forwarden
- cloud_client.py: `start_pour` / `cancel_pour` handlers voor pour-WS-brug via cloud
- cloud_client.py: heartbeat stuurt pairing_mode=true, lokaal IP en poort mee
- network-setup.sh: automatisch WiFi-hotspot (MIXMATE-Setup / mixmate123) als Pi geen internet heeft

## [4.9.3] - 2026-07-23
### Gewijzigd
- "Wijzig glas" knop in cocktailmodal: standaard glas direct zichtbaar, glas aanpassen zonder extra stap
- Pi stuurt lokaal IP en poort mee in cloud heartbeat (voor machineapp discovery)

## [4.9.2] - 2026-07-23
### Gewijzigd
- Glasselectie overgeslagen bij het starten van een cocktail — modal gaat direct naar bevestiging of handmatige ingrediënten

## [4.9.1] - 2026-07-02
### Opgelost
- Demo exit-slideshow zette `_demo_mode_active` niet uit — machine startte in demo-modus op na tikken op "Probeer het zelf"
- Fix: `POST /api/demo/exit-slideshow` stopt nu ook `_demo_mode_active` zodat de machine normaal opstart

## [4.9.0] - 2026-07-02
### Opgelost
- Kiosk liep vast na tikken op "Probeer het zelf" — poll zag nog `slideshow_active: true` en herstartte demo direct
- Fix: 3 seconden cooldown na exitDemo voordat poll de demo opnieuw kan activeren

## [4.8.9] - 2026-07-02
### Verbeterd
- Backend `/api/demo/status` geeft `slide_index` terug (berekend via servertijd)
- Kiosk DemoMode accepteert `slideIndex` prop van App.jsx — volgt backend ipv eigen klok
- App.jsx pollt elke 800ms als demo actief is, geeft `slide_index` door aan DemoMode
- Portaal gebruikt `slide_index` van Pi backend — gegarandeerd gesynchroniseerd

## [4.8.8] - 2026-07-02
### Verbeterd
- Demo overlay portaal identiek aan kiosk DemoMode: zelfde slides, achtergronden, accentkleuren, watermerk, voortgangsbalk
- Beide schermen wisselen tegelijk van dia via wall-clock sync (elke 5 seconden exact op hetzelfde moment)
- Slide-interval verlaagd van 6s naar 5s op kiosk

## [4.8.7] - 2026-07-02
### Nieuw
- Portal demo modus: aantrekkelijk attractor-scherm met voordelen en "Tik om te proberen" CTA
- Kiosk en portaal synchroniseren demo status via backend — activeren en stoppen tegelijk
- Tapping op kiosk of portaal sluit demo op beide apparaten tegelijk
- Live status-dot in AdminDemo toont wanneer slideshow actief is + "Stoppen" knop

## [4.8.6] - 2026-07-02
### Verbeterd
- Google Fonts verwijderd uit index.html (Inter werd niet gebruikt, blokkeert render op Pi bij netwerk-delay)
- `touch-action: manipulation` op alle buttons — elimineert 300ms tap-delay in Chromium
- `transition-all` overal vervangen door specifieke transitions — scheelt zware stijlherberekeningen op Pi
- Recipe bewerken: bevestiging "✓ Opgeslagen" is nu zichtbaar (1,5s) vóór het formulier sluit

## [4.8.5] - 2026-07-02
### Nieuw
- Dashboard: pijltjes links/rechts naast het swipe-scherm om te klikken naar vorige/volgende pagina
- Demo modus: cocktails worden gesimuleerd in ~4 seconden (geen GPIO), pomp snelheid 25 ml/s
- Demo modus: fake pour via WebSocket met realistische voortgangsbalk
### Verbeterd
- Recepten opslaan: betere foutafhandeling, validatie en gebruikersfeedback (rode/groene balk)

## [4.8.4] - 2026-07-02
### Verbeterd
- Demo slideshow volledig herschreven: geen gradients, geen blur, geen SVG-achtergronden
- Alleen solide kleuren + opacity/transform animaties (compositing-only, nul repaint)
- Watermerk-getal als pure CSS tekst, accent bovenlijn, schone typografie
- Fade-out 280ms, fade-in 420ms — soepel op Pi 4

## [4.8.3] - 2026-07-02
### Gefixt
- Pouring engine herschreven: geen mock-gewicht meer op echte hardware, puur tijdgebaseerd zonder weegcel
- Poll-interval van 100ms naar 50ms voor vloeiendere voortgangsbalk
- Inter-stap vertraging van 200ms naar 50ms
- Pompsnelheid standaard naar 35 ml/s; migratie update alle pompen < 5 ml/s naar 35 ml/s

## [4.8.2] - 2026-07-02
### Nieuw
- Easter egg: klok 1,5 seconden ingedrukt houden start de demo slideshow direct
- Voortgangsbalkje verschijnt onder de klok terwijl je indrukt
### Verbeterd
- Demo slideshow soepeler: achtergrond-gradients crossfaden nu via opacity (geen repaint), FADE_MS van 900 naar 550ms

## [4.8.1] - 2026-07-02
### Gefixt
- Demotimer pauzeert 5 minuten bij interactie met een file-input (foto uploaden), zodat de demo niet aanschiet tijdens het bladeren door bestanden

## [4.8.0] - 2026-07-02
### Nieuw
- Dashboard: swipeable pagina's van 6 cocktails (3×2 grid), vegen van rechts naar links voor volgende pagina
- Pagina-dots onderaan zoals iPhone homescherm, aantikken om direct naar pagina te springen
- Rubber-band effect aan de randen

## [4.7.13] - 2026-07-02
### Gefixt
- Demo slideshow stutter: nextFeature crossfade verwijderd, GPU-compositing geforceerd via will-change + translateZ(0), blur verminderd
- Slide "Beheer": prijzen wijzigen verwijderd (niet ondersteund)
- Slide "Rapporten": omzet verwijderd (wordt niet bijgehouden)

## [4.7.12] - 2026-07-02
### Gefixt
- Pompsnelheid verhoogd van 1.0 naar 20.0 ml/s standaard — cocktail klaar in ~7-8 seconden
- Bestaande pompen in database automatisch bijgewerkt bij herstart

## [4.7.11] - 2026-07-02
### Gefixt
- WiFi verbinden: juiste property naam `802-11-wireless-security.key-mgmt` (lange vorm) voor nmcli op Pi 4

## [4.7.10] - 2026-07-02
### Gefixt
- DemoMode crash opgelost: `useNavigate` was niet geïmporteerd maar wel aangeroepen → demo toonde cocktails ipv slides
- FlushVisual tekst gecorrigeerd

## [4.7.9] - 2026-07-02
### Gefixt
- Schermweergave: terug naar CSS zoom=1.5 (force-device-scale-factor werkt niet met cage)

## [4.7.8] - 2026-07-02
### Gefixt
- Schermweergave: CSS zoom vervangen door Chromium `--force-device-scale-factor=1.5` (correcte 1280×800 viewport op 1920×1200 scherm)

## [4.7.7] - 2026-07-02
### Gefixt
- WiFi verbinden: `wifi-sec.key-mgmt` argument verwijderd (niet ondersteund in nieuwere nmcli versies)

## [4.7.1] - 2026-07-01
### Gefixt
- Demo data seed maakt nu 8 pompslots aan met de meest gebruikte ingrediënten
- Demo activate/deactivate wist ook de Pump-tabel (foreign key volgorde correct)
- Machine ziet er in de admin "volledig ingericht" uit bij demo activatie

## [4.7.0] - 2026-07-01
### Nieuw
- Demo pour: volledig pomprek zichtbaar (8 pompen naast elkaar)
- Actieve pomp bobbert, licht op in eigen kleur met glow-effect
- Vloeistof stroomt zichtbaar door de slang per actieve pomp
- Glas-visualisatie vult zich in realtime terwijl de cocktail wordt gemaakt
- Percentage en "Serveerklaar" label in het glas

## [4.6.0] - 2026-07-01
### Nieuw
- Instellingen > Schermweergave: schaalgrootte instelbaar (75% t/m 200%)
- Backend schrijft sway config en herlaadt via `swaymsg reload` — geen reboot nodig
- Installer gebruikt sway i.p.v. cage: output-scale werkt correct op Pi 5
- Cursor permanent verborgen via `seat * hide_cursor 1` in sway config

## [4.5.0] - 2026-07-01
### Gewijzigd
- Demo slideshow toont alleen feature slides (geen cocktail-slideshow meer)
- 7 USP-slides: snelheid (180/uur), weegplateau, spoelprogramma's, recepten, beheer op afstand, rapporten, consistentie
- Elke slide heeft eigen accentkleur, glow en grote SVG-illustratie
- "Probeer het zelf →" knop opent demo pour met willekeurig recept
- Voortgangsbalk kleurt mee met accentkleur per slide

## [4.4.0] - 2026-07-01
### Nieuw
- Demo modus: tik op een cocktail-slide → gesimuleerde pour opent (geen echte pompen)
- Demo pour toont voortgangscirkel, ingredient-highlighting per stap, druppel-animatie
- Na afloop keert demo automatisch terug naar de attractor slideshow
- Slideshow prompt verandert naar "Tik om te maken" op cocktail-slides

## [4.3.1] - 2026-07-01
### Gefixt
- Installer detecteert Pi 5 automatisch en gebruikt Wayland + cage i.p.v. X11 + openbox
- Pi 5 boot probleem opgelost: blinkend balkje links boven doordat X11 niet kon starten op Pi 5 GPU
- Pi 4 en ouder: X11 stack ongewijzigd (backwards compatible)

## [4.3.0] - 2026-07-01
### Gefixt
- WiFi verbinden werkt nu betrouwbaar: alle nmcli-aanroepen gebruiken sudo (vereist voor NetworkManager-privileges)
- wpa_cli fallback repaired: schrijft nu correct wpa_supplicant.conf via wpa_passphrase
- WiFi wachtwoordveld toont virtueel toetsenbord op touchscreen (inputMode=text)
- sudoers uitgebreid met wpa_cli en wpa_passphrase rechten

## [2.3.0] - 2026-06-16
### Nieuw
- Sessie-tracking: elke keer dat de machine opstart begint een nieuwe dienst
- Uitschakelen-knop sluit de sessie netjes af
- Rapporten toont diensten (machine aan → uitschakelen) met cocktailranglijst per dienst
### Gefixt
- Cocktails aantikken veel responsiever: onTouchEnd zonder 300ms vertraging
- Scroll-detectie drempel verhoogd naar 20px, cooldown verlaagd naar 80ms

## [2.2.2] - 2026-06-16
### Gefixt
- Emoji medailles (🥇🥈🥉) vervangen door gekleurde nummerbadges — emoji's worden niet goed gerenderd door Chromium op de Pi

## [2.2.1] - 2026-06-16
### Gefixt
- Rapporten pagina op de machine nu volledig werkend: datum picker, samenvatting, cocktailranglijst en 30-dagen staafdiagram

## [2.2.0] - 2026-06-16
### Nieuw
- "Populair" badge op top-3 meest gemaakte cocktails in de machine-app
- Pour-data beschikbaar via cloud: portaal kan nu giethistorie per dag ophalen
- Datumfilter toegevoegd aan /api/pours endpoint op de Pi

## [2.1.6] - 2026-06-16
### Gefixt
- OTA-updater patcht nu .xinitrc (de echte Chromium-lanceerder) in plaats van .config/autostart die niet gebruikt wordt

## [2.1.5] - 2026-06-16
### Gefixt
- Dubbele --disable-features vlag samengevoegd (Chromium negeerde de eerste, GPU-fix werkte niet correct)
- Installer detecteert nu zowel /boot/cmdline.txt als /boot/firmware/cmdline.txt (Pi OS Bookworm vs Bullseye)

## [2.1.4] - 2026-06-16
### Gefixt
- GPU-acceleratie flags ook toegevoegd aan install.sh (nieuwe installaties hadden dit nog niet)

## [2.1.3] - 2026-06-16
### Gefixt
- GPU-acceleratie ingeschakeld voor Chromium op de Pi (--use-gl=egl, --enable-gpu-rasterization, --enable-zero-copy)
- Updater past de Chromium autostart automatisch aan bij elke update
- Zonder deze flags renderde alles via de CPU, wat de scroll-stutter veroorzaakte

## [2.1.2] - 2026-06-16
### Gefixt
- Stotterig scrollen definitief opgelost: JS-gebaseerde scroll vervangen door native browser scroll
- DragScrollProvider doet nu alleen click-vs-scroll detectie, geen scrollTop manipulatie meer
- touch-action en will-change opgeschoond — geen onnodige GPU-lagen meer

## [2.1.1] - 2026-06-16
### Gefixt
- Stotterig scrollen opgelost: backdrop-filter blur verwijderd van header, sidebar en overlay (te zwaar voor Pi GPU)
- Modal-animatie vereenvoudigd voor snellere receptopening
- Box-shadow uit card-transitie gehaald (GPU-intensief)

## [2.1.0] - 2026-06-16
### Verbeterd
- Volledig nieuw licht premium thema: Apple-stijl aansluitend bij MIXMATE.NL
- Header en sidebar met frosted glass effect (backdrop-filter blur)
- Cocktailkaarten: witte kaarten met subtiele schaduw, gradient-overlay op foto
- Spoelroutine: lichte kaarten, gekleurde intensiteitsbadges per leiding
- Geblokkeerd-overlay: clean wit frosted-glass design

## [2.0.0] - 2026-06-16
### Nieuw
- Machine blokkeren vanuit portaal: bartender kan machine vergrendelen zodat geen cocktails gemaakt worden
- Spoelschema: wekelijks automatisch spoelmoment instellen per dag via portaal
- Spoelherinnering: oranje badge op dashboard en machinekaart als spoelen te lang geleden is
- BlockedOverlay op machinesch erm: fullscreen vergrendeling zichtbaar bij blokkering
### Verbeterd
- Volledig donker thema op de machine-app met CSS-variabelen
- Nieuwe header met klok, WiFi- en cloudindicator, pill-navigatie
- Cocktailkaarten: gradient-overlay op afbeelding, donkere status-badges
- Spoelroutine-scherm gebruikt nu CSS-variabelen (klopt bij donker thema)
- Portaaldashboard: cache voor directe laadtijd, "Spoelen vereist" badge
- Machinedetailpagina: blokkeerknop altijd zichtbaar naast online-indicator
### Gefixt
- GPIO-methodes hersteld (activate/deactivate in plaats van on/off)
- Machinenaam opslaan werkt nu correct via cloud-API
- Machinestatus toonde altijd offline — online-veld toegevoegd aan lijst

## [1.4.4] - 2026-06-16
### Verbeterd
- Spoelroutine volledig herschreven: geen WebSocket meer, alles via eenvoudige HTTP-polling
- FlushOverlay polt nu /api/pumps/flush-status elke 500ms — geen verbindingsproblemen meer
- flush-all geeft direct terug en start de spoeling als achtergrondtaak op de Pi
- cloud_client vereenvoudigd: geen aparte _run_flush wrapper meer nodig

## [1.4.3] - 2026-06-16
### Gefixt
- Ingredientnamen worden nu correct getoond bij de leidingen in de spoelroutine (was altijd leeg)

## [1.4.2] - 2026-06-16
### Gefixt
- Raceconditie in flush-broadcast opgelost (kon spoelroutine stil laten crashen als overlay net verbond)
- Testknop toegevoegd in Spoelroutine op de machine: overlay simuleren zonder pompen te starten
- Intern: `time.monotonic()` en veilige set-iteratie in broadcast

## [1.4.1] - 2026-06-16
### Nieuw
- Spoelroutine nu ook beschikbaar op het scherm van de machine zelf (Instellingen → Spoelroutine)
### Verbeterd
- Portaal loopt niet meer vast tijdens spoelen — voortgang wordt live getoond (leiding, seconden, blokjes)
- FlushOverlay blijft stabiel door keepalive-ping elke 5 seconden
- Flush-status endpoint toegevoegd zodat portaal de Pi rechtstreeks kan pollen

## [1.4.0] - 2026-06-16
### Nieuw
- Spoelroutine vanuit portaal: selecteer leidingen op water, machine berekent spoelduur automatisch per leiding
- Spoelen toont real-time voortgang op het machinesch erm (fullscreen overlay met circulaire progressie)
- Machine blokkeert cocktails maken tijdens een actieve spoelroutine
- Spoelgeschiedenis bijgehouden per machine in de cloud (datum, leidingen, duur)
- Teambeheer: meerdere accounts koppelen aan één machine (medewerker / beheerder)
- Receptvergrendeling: eigenaar kan recepten vergrendelen zodat medewerkers ze niet kunnen bewerken of verwijderen
- Spoelen is een apart tabblad in het portaal (tussen Pompen en Instellingen)

## [1.3.6] - 2026-06-16
### Verbeterd
- Cloud verbinding bijgewerkt naar portaal.mixmate.nl

## [1.3.5] - 2026-06-16
### Nieuw
- Dashboard sorteert automatisch op meest gemaakte cocktails (pour_count)
- Portaal: recept-editor volledig uitgebreid met ingrediënten, glazen, categorieën en afbeelding-URL
### Verbeterd
- Accidentele tik tijdens scrollen veel beter onderdrukt (threshold 10px + 300ms tijdslot na scroll)

## [1.3.4] - 2026-06-16
### Verbeterd
- Alle emoji's vervangen door SVG-icoontjes (Pi heeft geen emoji-lettertype)
- "Deels handmatig" badge toont nu een hand-SVG
- "Geen cocktails gevonden" toont nu een cocktailglas-SVG
- Hartknop gebruikt nu SVG in plaats van ♥/♡ tekens

## [1.3.3] - 2026-06-16
### Verbeterd
- Status badge (automatisch/deels handmatig) staat nu in de kaart onder de naam in plaats van op de afbeelding — veel beter leesbaar
- Groen badge voor volledig automatische cocktails, geel voor deels handmatig

## [1.3.2] - 2026-06-16
### Verbeterd
- Modal openen soepeler: backdrop-blur en scale-animatie verwijderd van cocktail-popup

## [1.3.1] - 2026-06-16
### Verbeterd
- Scroll-stotteren opgelost op het dashboard (backdrop-blur verwijderd, lazy loading voor afbeeldingen, scroll-layer optimalisatie)
- Afbeeldingen tonen nu altijd een gradient als fallback wanneer een URL niet laadbaar is

## [1.3.0] - 2026-06-15
### Nieuw
- Premium UX redesign: Cloud koppeling op de machine volledig vernieuwd (losse cijferblokjes, account-avatar, groene statusbadge)
- Portaal dashboard opnieuw gebouwd: frosted glass header, machine cards met live groene stip, stap-voor-stap koppelwizard met successanimatie
- Portaal machine-detailpagina: sticky header met breadcrumb-navigatie en verfijnde tabs
- Fabrieksgegevens (GPIO-pinnen, weegschaalconfiguratie, model) worden nu altijd bewaard bij fabrieksreset
- Account naam en e-mail blijven zichtbaar na herstart (persistent in database)
- WiFi verbinden werkt nu betrouwbaarder (bestaand profiel wordt eerst verwijderd)

## [1.2.2] - 2026-06-15
### Nieuw
- Wachtwoord vergeten via de machine: verificatiecode verschijnt op het machinescherm
- Machine toont gekoppeld accountnaam en e-mailadres in Cloud koppeling scherm

## [1.2.1] - 2026-06-15
### Gefixt
- Machine vergeet model, cloud-URL en PIN niet meer na update — database en .env worden nu bewaard tijdens git reset
- Automatische herstart bij major versiesprong (bijv. 1.x → 2.x)

## [1.2.0] - 2026-06-15
### Nieuw
- Cloud koppeling toont welk account gekoppeld is (naam + e-mailadres)
- "Uitloggen" knop vervangt "Koppeling verwijderen" — duidelijkere taal
- Fabrieksinstellingen-knop in Instellingen: wist alle data en ontkoppelt de machine

## [1.1.3] - 2026-06-15
### Gefixt
- Machine vergat model na herstart door verkeerde opstartvolgorde: database werd uitgelezen vóórdat de tabellen aangemaakt waren — nu wordt de database eerst aangemaakt, dan pas uitgelezen
- Config-tabel wordt nu ook aangemaakt als die nog niet bestaat bij het lezen/schrijven, zodat dit nooit meer stil faalt

## [1.1.2] - 2026-06-15
### Nieuw
- Machines updaten zichzelf automatisch bij elke opstart als er nieuwe code beschikbaar is
- Nieuwe versie wordt alleen gebouwd als er daadwerkelijk commits zijn (geen onnodige wachttijd)
- Updater installeert auto-update mechanisme automatisch op bestaande machines

## [1.1.1] - 2026-06-15
### Gefixt
- Cloud-URL ingebakken als fallback in de code — machine maakt altijd verbinding met de cloud ook als .env en database leeg zijn

## [1.1.0] - 2026-06-15
### Gefixt
- Machine vergeet model en cloud-URL niet meer na herstart — beide worden nu opgeslagen in de database (overleeft git-updates en herinstallaties)
- "Over deze machine" pagina toegevoegd in instellingen (serienummer, IP, MAC, uptime, temperatuur, opslag)
- Info-tab toegevoegd in het portaal met live hardware-info van de machine
- WiFi-scan detecteert nu ook persoonlijke hotspots (langere scantijd, betere SSID-parser)
- Machines kunnen verwijderd worden vanuit het portaal

## [1.0.3] - 2026-06-15
### Gefixt
- Reset-knop toegevoegd bij cloud koppeling — herstart de WebSocket-verbinding volledig zonder de machine te herstarten
- Bij "Geen cloudverbinding" staat nu direct een knop om de verbinding te herstellen

## [1.0.2] - 2026-06-15
### Gefixt
- SQLite WAL-mode ingeschakeld — voorkomt "readonly database" fout bij gelijktijdige lees/schrijfoperaties
- Cloud WebSocket herverbindt nu met exponential backoff (5→10→20→40→80→120s) i.p.v. altijd 10s
- Cloud commando's hebben nu een timeout van 20s — één traag verzoek blokkeert de verbinding niet meer
- WiFi- en cloud-statusicoontjes toegevoegd aan de bovenste balk

## [1.0.1] - 2026-06-15
### Nieuw
- WiFi- en cloud-statusicoontjes in de bovenste balk (groen = verbonden, oranje = zwak/gekoppeld maar offline, grijs = niet verbonden)

## [1.0.0] - 2026-06-15
### Nieuw
- Machine-ID permanent opgeslagen in de database — overleeft git-updates, herinstallaties en stroomuitval
- Machine-ID wordt afgeleid van het Raspberry Pi CPU-serienummer (hardware-permanent)
- Verwijderbevestiging bij glazen en categorieën gebruikt nu een eigen dialoog i.p.v. de browser-popup

## [6.4.2] - 2026-06-15
### Gefixt
- Verwijderbevestiging bij glazen en categorieën gebruikt nu een eigen dialoog i.p.v. de lelijke browser-popup

## [6.4.1] - 2026-06-15
### Gefixt
- WiFi en Cloud koppeling openen nu correct binnen de hoofdlayout

## [6.4.0] - 2026-06-15
### Verbeterd
- Alle instellingen openen nu consistent binnen de hoofdlayout met MIXMATE-balk zichtbaar
- WiFi en Cloud koppeling zijn geen full-screen overlays meer

## [6.3.1] - 2026-06-15
### Gefixt
- Aanknop icoon nu wit zichtbaar op standby scherm
- Opstartanimatie verkort naar 6 seconden
- Koppelcode verborgen als machine al gekoppeld is aan cloud
- "Stand-by" knop hernoemd naar "Uitschakelen"

## [6.3.0] - 2026-06-15
### Nieuw
- Instellingen volledig herbouwd in iPhone-stijl (secties, gekleurde icoontjes, terugknop)
- Cloud koppeling: knop om koppeling te verwijderen vanuit de machine

## [6.2.7] - 2026-06-15
### Nieuw
- Recepten, ingrediënten, glazen, categorieën en pompen beheerbaar via MIXMATE portaal

## [6.2.6] - 2026-06-15
### Gefixt
- SyntaxError in WiFi verbinden fallback (unterminated f-string) opgelost

## [6.2.5] - 2026-06-15
### Gefixt
- Alle emoji vervangen door SVG-iconen (zichtbaar op Pi OS Lite zonder emoji-font)

## [6.2.4] - 2026-06-14
### Gefixt
- WiFi verbinden: key-mgmt wpa-psk expliciet meegegeven aan nmcli
- WiFi opmaak verbeterd: uitklapbaar per netwerk, betere lay-out

## [6.2.3] - 2026-06-14
### Gefixt
- WiFi verbinden: 802-11-wireless-security key property fout opgelost

## [6.2.2] - 2026-06-14
### Gefixt
- WiFi wachtwoordveld staat nu direct onder het geselecteerde netwerk
- WiFi setup en koppelscherm in lichte vormgeving

## [6.2.1] - 2026-06-14
### Gefixt
- WiFi scan en verbinden werkt nu zonder insufficient privileges fout
- Sudoers bestand toegevoegd voor WiFi en systeembeheer rechten

## [6.2.0] - 2026-06-14
### Gefixt
- .env altijd geladen bij opstart (cloud URL werkt nu zonder service file aanpassing)
- WiFi scan: drie fallback methodes (nmcli rescan → nmcli list → wpa_cli)
- WiFi verbinden robuuster

## [6.1.0] - 2026-06-14
### Gefixt
- WiFi setup verplaatst naar Instellingen (niet meer in backoffice)
- WiFi scan robuuster: probeert nmcli, valt terug op iwlist
- WiFi verbinden: probeert nmcli, valt terug op wpa_cli

## [6.0.0] - 2026-06-14
### Nieuw
- WiFi instellen via eigen scherm op de machine (backoffice → Systeem → WiFi instellen)
- Koppelcode scherm voor MIXMATE portaalkoppeling (backoffice → Systeem → Machine koppelen)
- Koppelcode zichtbaar rechtsboven op het standby scherm
- Herstart knop in backoffice systeem beheer
- Cloud verbinding: machine verbindt automatisch met MIXMATE portaal via WebSocket

# MIXMATE OS — Changelog

<<<<<<< HEAD
## [5.0.0] - 2026-06-11
### Nieuw
- Stabiele release voor MATE.1 PRO
- Lichte achtergrond met donkere navigatie
- Plymouth boot splash met MIXMATE logo
- Robuuste installer voor Raspberry Pi OS Lite 64-bit
- OTA updates verbeterd (geen lokale conflicten meer)
- Demo data via /api/seed-demo
- Betere leesbaarheid in backoffice en standby scherm

## [4.0.5] - 2026-06-11
### Verbeterd
- Standby scherm: grotere knop, duidelijkere tekst en progress bar
- Backoffice: hoger contrast voor labels, inputs en navigatie
- Demo data: POST /api/seed-demo endpoint voor testomgeving

## [4.0.4] - 2026-06-11
### Gefixt
- Lichte achtergrond (#f2f2f2) terug voor hoofdcontent
- Cocktailkaarten wit met donkere tekst
- Modal wit met donkere tekst en kleuren
- Donkere sidebar en topbar blijven behouden als contrast

## [4.0.3] - 2026-06-11
### Gefixt
- Stijl teruggezet naar origineel donker thema (zwarte topbar, transparante kaarten, geen goud accent)
- Modal volledig donker gemaakt

## [4.0.2] - 2026-06-11
### Gefixt
- Installer herschreven voor Raspberry Pi OS Lite 64-bit (X11 + openbox kiosk)
- OTA updater: uvicorn binary wordt gecontroleerd en hersteld na git reset
- OTA updater: npm install vervangen door npm ci voor reproduceerbare builds

## [4.0.1] - 2026-06-11
### Gefixt
- Thema-wisseling verwijderd — alleen donker thema beschikbaar
- Installer: Python venv aanmaken met --without-pip + get-pip.py om PEP 668 conflict op Debian trixie te vermijden
=======
## [4.2.0] - 2026-07-01
### Nieuw
- Demo modus volledig herbouwd: Apple Store-stijl attractor met feature slides + cocktail showcase
- Demo data: 12 recepten, 4 categorieën, 7 dagen nep-rapportages via Instellingen → Demo
- Standby geblokkeerd wanneer demo modus actief is
- Na X minuten inactiviteit keert machine automatisch terug naar attractor
- `/api/demo/activate` en `/api/demo/deactivate` endpoints in de backend

## [4.1.0] - 2026-07-01
### Nieuw
- Demo modus: automatische cocktail-carrousel bij inactiviteit, ideaal voor winkel/beurs
- Demo-instellingen onder Instellingen → Demo (aan/uit + wachttijd 1–60 min)
>>>>>>> 15c49b2 (feat(demo): demo modus met cocktail-carrousel bij inactiviteit (v4.1.0))

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

## [1.2.0] - 2026-06-15
### Nieuw
- Cloud koppeling toont welk account gekoppeld is (naam + e-mailadres)
- "Uitloggen" knop vervangt "Koppeling verwijderen" — duidelijkere taal
- Fabrieksinstellingen-knop in Instellingen: wist alle data en ontkoppelt de machine

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
