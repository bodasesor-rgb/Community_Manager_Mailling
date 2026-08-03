# Community Manager Mailling

Microservicio de email marketing en Node.js + TypeScript.
La app habla solo con `EmailProvider`; Brevo vive en `BrevoProvider`.

## Requisitos

- Node.js 18+
- `BREVO_API_KEY`
- `REMITENTE_EMAIL` (remitente verificado en Brevo) para crear plantillas/envíos

## Scripts

```bash
npm install
npm run typecheck
npm run build
npm start                 # HTTP en PORT (Hostinger)
npm run probar-envio      # Generador + plantilla (sin campaña)
```

## Flujo de creación

1. `POST /plantillas/vista-previa` — genera HTML (sin Brevo)
2. `POST /envios` con `modo: "plantilla"` — sube plantilla a Brevo
3. `POST /envios` con `modo: "borrador"` + `listIds` — plantilla + campaña borrador (no envía)

## Hostinger

- Build: `npm run build`
- Entry: `dist/src/server.js`
- Env: `BREVO_API_KEY`, `REMITENTE_EMAIL`, opcional `SERVICE_API_KEY`
