# Community Manager Mailling

Microservicio de email marketing en Node.js + TypeScript.
La app habla solo con la interfaz `EmailProvider`; Brevo vive encapsulado en `BrevoProvider`.

## Requisitos

- Node.js 18+ (fetch nativo)
- Variable de entorno `BREVO_API_KEY`

## Instalación

```bash
npm install
cp .env.example .env
# Edita .env y define BREVO_API_KEY (y opcionalmente BREVO_TEST_SENDER_*)
```

## Scripts

```bash
npm run typecheck      # Compilación TypeScript sin emitir
npm run build          # Emite a dist/
npm run probar-brevo   # Verifica conexión, lista contactos y crea plantilla de prueba
```

## Uso rápido

```ts
import { BrevoProvider } from "./src/index.js";

const email = new BrevoProvider();

await email.verificarConexion();
const contactos = await email.listarContactos();
await email.sincronizarContacto({ email: "hola@ejemplo.com", listIds: [2] });
await email.suprimir("baja@ejemplo.com", "unsubscribe");
```

## Supresión local

Las bajas viven en nuestro lado (`suprimidos.json` por ahora, interfaz lista para DB
`contactos_suprimidos`). Si un email está suprimido, `sincronizarContacto` no lo sube a Brevo.
