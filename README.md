# Community Manager Mailling

Microservicio + panel de email marketing (Brevo, Kommo, Gemini).

## Panel (Next.js)

```bash
# desde la raíz del repo
cp .env.example panel/.env.local   # o exporta las vars en el entorno
# edita panel/.env.local con BREVO_*, KOMMO_SUBDOMAIN, KOMMO_TOKEN

npm --prefix panel install
npm run panel:dev
# → http://localhost:3000/contactos
# → http://localhost:3000/plantillas
```

Las API keys viven solo en el servidor (API routes). El cliente solo llama a `/api/*`.

## Sync Kommo → Brevo (dryRun)

```bash
# No escribe en Brevo
npm run sync-contactos

# Escritura real
DRY_RUN=false npm run sync-contactos
```

También: `GET/POST /api/sync-contactos?dryRun=true` desde el panel.

## Adaptadores

- `src/email-provider.ts` — Brevo (`EmailProvider`)
- `src/kommo-provider.ts` — Kommo (`KommoCrmProvider`)
- `src/validar-email.ts` — validación determinista
- `src/servicios/sync-kommo-brevo.ts` — sync con reporte
