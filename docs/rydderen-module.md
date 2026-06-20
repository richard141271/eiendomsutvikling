# Rydder'n modul

## Oversikt

Rydder'n er integrert som en modul i Eiendomssystemet med ruter under `app/dashboard/rydderen`.
UI bruker ikke Supabase direkte. All dataflyt går via:

- `src/modules/rydderen/api`
- `src/modules/rydderen/hooks`
- `src/modules/rydderen/services`
- `src/modules/rydderen/repositories`

Datamodellen er generisk og kan senere brukes for `dodsbo`, `inventory`, `moving`, `insurance` og `auction` via `module_type`.

## Datamodell

Prisma og SQL-migreringen oppretter:

- `cleanup_projects`
- `cleanup_items`
- `cleanup_project_costs`
- `cleanup_project_links`

Lagring av bilder skjer i Supabase Storage bucket `cleanup-media` med struktur:

- `cleanup-projects/{cleanupProjectId}/items/{itemId}/original.jpg`
- `cleanup-projects/{cleanupProjectId}/items/{itemId}/thumb.jpg`

## Ruter

- `/dashboard/rydderen/projects`
- `/dashboard/rydderen/projects/:cleanupProjectId`
- `/dashboard/rydderen/projects/:cleanupProjectId/register`
- `/dashboard/rydderen/projects/:cleanupProjectId/valuation`
- `/dashboard/rydderen/projects/:cleanupProjectId/report`

Root-ruter under `/rydderen/...` videresender til dashboard-rutene.

Kontekstinnganger:

- `/dashboard/properties/:id/rydderen`
- `/dashboard/cases/:id/rydderen`
- `/projects/:id/rydderen`

## Brukerflyt

### Hurtigregistrering

1. Ta bilde
2. Velg kategori
3. Velg handling
4. Objektet lagres automatisk
5. Flyten går direkte tilbake til kamera

### Verdisetting

1. Åpne verdisetting
2. Sett verdi med numerisk tastatur
3. Bruk `Mer` ved behov
4. Trykk `Neste` for autosave og neste objekt

### Rapport

Rapportsiden er print-vennlig og kan brukes med nettleserens `Print / Save as PDF`.

## Import av gammel data

Admin-import støtter JSON payload mot:

- `POST /api/rydderen/import`

Eksempel:

```json
{
  "dryRun": false,
  "project": {
    "name": "Dødsbo A",
    "description": "Import fra gammel Rydder'n",
    "contextType": "standalone"
  },
  "items": [
    {
      "itemNumber": 1,
      "category": "Møbler",
      "action": "selg",
      "value": 1500,
      "comment": "God stand",
      "capturedAt": "2026-06-19T08:30:00.000Z",
      "imageDataUrl": "data:image/jpeg;base64,..."
    }
  ],
  "costs": [
    {
      "costType": "transport",
      "amount": 1200,
      "description": "Henting"
    }
  ]
}
```

`dryRun: true` returnerer bare tellinger og valideringsfeil uten å skrive data.

## Kjente grenser

- `case` støttes i datamodell og routing, men systemet har ikke egen saksmodell i Prisma ennå.
- Nåværende tenant-sikring bruker aktiv Supabase-bruker som `tenant_id`, siden resten av appen ikke har en egen organisasjonstabell.
