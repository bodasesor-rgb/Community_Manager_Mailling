# Community Manager Mailling

Microservicio Node.js + TypeScript en Hostinger.
Integra **Brevo** (envío), **Gemini** (copy) y **Kommo** (contactos).

## Variables de entorno

| Clave | Uso |
|---|---|
| `BREVO_API_KEY` | API Brevo |
| `GEMINI_API_KEY` | Generación de copy (Flash 2.0) + Imagen 3 |
| `GEMINI_MODEL` | Default `gemini-2.0-flash` |
| `IMAGEN_MODEL` | Default `imagen-3.0-generate-002` |
| `PUBLIC_BASE_URL` | URL pública Hostinger para `/media` |
| `KOMMO_BASE_URL` | Ej. `https://tu-cuenta.kommo.com` |
| `KOMMO_CLAVE_SECRETA` | Token Bearer de Kommo |
| `REMITENTE_EMAIL` | Opcional (si no, usa sender activo de Brevo) |
| `BREVO_DEFAULT_LIST_IDS` | Listas default para webhook Kommo (ej. `21`) |

## Endpoints útiles

```bash
GET  /health
GET  /conexion
GET  /remitentes
GET  /gemini/modelos
POST /contenido/generar          # Flash 2.0 + Imagen 3 → HTML
POST /imagenes/generar           # Solo Imagen 3
GET  /media/:archivo             # Sirve imágenes del email
POST /envios                     # brief → plantilla Brevo (con imagen)
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
