# Community Manager Mailling

Microservicio Node.js + TypeScript en Hostinger.
Integra **Brevo** (envío), **Gemini** (copy) y **Kommo** (contactos).

## Variables de entorno

| Clave | Uso |
|---|---|
| `BREVO_API_KEY` | API Brevo |
| `GEMINI_API_KEY` | Generación de contenido |
| `KOMMO_BASE_URL` | Ej. `https://tu-cuenta.kommo.com` |
| `KOMMO_CLAVE_SECRETA` | Token Bearer de Kommo |
| `REMITENTE_EMAIL` | Opcional (si no, usa sender activo de Brevo) |
| `BREVO_DEFAULT_LIST_IDS` | Listas default para webhook Kommo (ej. `21`) |

## Endpoints útiles

```bash
GET  /health
GET  /conexion
GET  /remitentes
POST /contenido/generar          # Gemini → asunto + HTML
POST /envios                     # brief|contenido → plantilla Brevo
GET  /kommo/contactos
POST /kommo/sincronizar          # { kommoId, listIds? }
POST /webhooks/kommo             # sync desde Kommo
```

## Creación rápida (Hostinger)

```bash
curl -X POST https://TU-DOMINIO/envios \
  -H 'content-type: application/json' \
  -d '{
    "brief": "Tips de content para wedding planners esta semana",
    "modo": "plantilla"
  }'
```

`modo: "plantilla"` no crea campaña. `modo: "borrador"` + `listIds` crea borrador sin enviar.
