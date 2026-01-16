# Oppsett av E-post (Resend)

For at systemet skal kunne sende ut e-poster med invitasjoner, må du sette opp en API-nøkkel fra Resend.

## Steg for steg:

1.  **Gå til Resend.com:**
    *   Åpne [Resend.com](https://resend.com) i nettleseren din.
    *   Registrer deg for en gratis konto (eller logg inn hvis du allerede har en).

2.  **Opprett en API Key:**
    *   Gå til "API Keys" i menyen til venstre.
    *   Trykk på knappen "Create API Key".
    *   Gi den et navn (f.eks. "Eiendomssystem").
    *   Du trenger kun "Sending access" (default).
    *   Kopier nøkkelen som vises (den starter med `re_`). **Ta vare på denne!** Du får ikke se den igjen.

3.  **Legg til nøkkelen i prosjektet:**
    *   Åpne filen `.env` i prosjektmappen din (hvis den ikke finnes, lag en fil som heter bare `.env`).
    *   Legg til følgende linje i filen:
        ```
        RESEND_API_KEY=re_din_nokkel_her
        ```
    *   Bytt ut `re_din_nokkel_her` med den faktiske nøkkelen du kopierte.

4.  **Verifiser domene (Valgfritt men anbefalt for produksjon):**
    *   For testing kan du kun sende til din egen e-postadresse (den du registrerte deg med).
    *   For å sende til andre (f.eks. faktiske leietakere), må du legge til et domene under "Domains" i Resend og verifisere det ved å legge til DNS-poster hos din domeneleverandør.

## Testing
Når nøkkelen er lagt inn i `.env`, må du starte serveren på nytt (`npm run dev`) for at endringene skal tre i kraft. Prøv deretter å invitere en leietaker (bruk din egen e-post for å teste).
