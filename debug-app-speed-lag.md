# Debug Session: app-speed-lag
- **Status**: [OPEN]
- **Issue**: Appen er unormalt treg fra ikontrykk til første skjerm, fra `Logg inn` til dashboard, fra menyvalg til `Rydder'n`, og ved PDF-generering på telefon.
- **Debug Server**: http://192.168.0.35:7777/event
- **Log File**: `.dbg/trae-debug-log-app-speed-lag.ndjson`

## Reproduction Steps
1. Trykk app-ikonet på telefon og mål tid til første synlige nettside.
2. Logg inn og mål tid fra `Logg inn` til dashboard vises.
3. Åpne `Rydder'n` fra menyen og mål tid til arbeidsflaten er synlig.
4. Generer PDF og mål tid til første visuelle feedback og til ferdig PDF.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Supabase auth/session-oppslag ved appstart og login bruker uforholdsmessig lang tid på server eller klient | High | Low | Pending |
| B | Middleware, layout eller serverkomponenter kjører serialiserte kall som gjør hver navigasjon treg | High | Medium | Pending |
| C | `Dashboard` og `Rydder'n` blokkeres fortsatt av databaserunder eller klient-fetch før første meningsfulle render | High | Low | Pending |
| D | PWA/telefon-starten laster for mye JS og dynamiske kall før første skjerm | Medium | Medium | Pending |
| E | PDF-jobben taper mest tid i bildehenting, signed URLs eller opplasting, ikke i selve renderer-layouten | Medium | Low | Pending |

## Log Evidence
- Pending

## Instrumentation Plan
- `A` `middleware.ts`: mål hvor lenge `supabase.auth.getUser()` tar på hver request som treffer appen.
- `A` `components/login-form.tsx`: mål tid for `signInWithPassword`, `router.push("/dashboard")` og første navigasjon etter suksess.
- `B` `app/dashboard/page.tsx`: mål auth-oppslag, brukeroppslag og admin-counts hver for seg.
- `C` `app/dashboard/rydderen/page.tsx` og `src/modules/rydderen/hooks/index.ts`: mål tid til prosjektliste og redirect til aktivt prosjekt.
- `E` `app/api/projects/[id]/report-v2/job/route.ts` og `lib/reporting/project-report-generator.ts`: mål jobbstarter, signed URL-arbeid, rendering og opplasting separat.

## Verification Conclusion
- Pending
