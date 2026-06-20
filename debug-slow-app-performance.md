# Debug Session: slow-app-performance

Status: OPEN

Scope:
- Hele Eiendomsappen oppleves treg
- Rydder'n reagerer sent ved trykk på `Kast`, `Selg`, `Behold`
- UI ser ut som "ingenting skjer" selv om handlingen noen ganger faktisk fullfores

Symptoms:
- Generell treghet i appen
- Forsinket respons etter trykk i registreringsflyt
- Opplevd heng mellom handling og faktisk navigasjon/lagring

Hypotheses:
1. Nettverkskall mot API/Supabase er hovedflaskehalsen, spesielt i registrering, prosjektlasting og rapport/oversikt.
2. UI venter på flere sekvensielle fetcher og re-renderer for hver skjerm, slik at bruker ikke får umiddelbar visuell respons.
3. Kamera-/filopplasting og bildeprosessering blokkerer for lenge før UI går videre.
4. Oversikts- og verdisettingsvisninger gjør unødvendig mye datalasting eller sortering ved hver overgang.
5. Hele dashboard-layouten eller auth/session-henting introduserer treghet før modulinnholdet i det hele tatt rendres.

Plan:
1. Instrumenter timing i klientflyt og API-endepunkter.
2. Reproduser tregheten og samle runtime-bevis.
3. Bekreft eller avkreft hypotesene.
4. Implementer minimal ytelsesfiksering basert pa bevis.
5. Verifiser med pre-fix og post-fix timing.

Implemented Fix:
- Rydder'n-registerflyten i Eiendom bruker na en intern bakgrunnsko for opplasting.
- Ved trykk pa `Kast`, `Selg` eller `Behold` nullstilles valgt bilde/kategori umiddelbart og kamera trigges pa nytt med en gang.
- Serverarbeid som auth, database, storage og thumbnail-generering fortsetter sekvensielt i bakgrunnen uten a blokkere neste registrering.
- UI i register-siden tolker ikke lenger bakgrunnsopplasting som en blokkering av handlingssteget.
