/**
 * Prueba local del generador + orquestación en modo plantilla.
 * Si hay BREVO_API_KEY y REMITENTE_EMAIL, también sube la plantilla a Brevo.
 * Nunca crea campaña.
 */

import {
  generarPlantillaHtml,
} from "../src/plantillas/generador.js";
import { BrevoProvider } from "../src/email-provider.js";
import { crearEnvio } from "../src/servicios/crear-envio.js";

async function main(): Promise<void> {
  const html = generarPlantillaHtml({
    marca: "Bodasesor",
    titular: "Ideas para tu próxima reunión con clientes",
    apoyo: "Un resumen corto para community managers.",
    bloques: [
      {
        tipo: "texto",
        titulo: "Esta semana",
        cuerpo: "Comparte bastidores, un tip práctico y una historia real.",
      },
      {
        tipo: "cta",
        texto: "Ver guía",
        url: "https://example.com/guia",
      },
    ],
  });

  if (!html.includes("Bodasesor") || !html.includes("Ver guía")) {
    throw new Error("El HTML generado no contiene marca/CTA esperados");
  }
  console.log(`OK generador: ${html.length} chars`);

  const apiKey = process.env.BREVO_API_KEY;
  const email =
    process.env.REMITENTE_EMAIL ?? process.env.BREVO_TEST_SENDER_EMAIL;

  if (!apiKey || !email) {
    console.log(
      "Omitiendo subida a Brevo (faltan BREVO_API_KEY o REMITENTE_EMAIL).",
    );
    return;
  }

  const provider = new BrevoProvider();
  const resultado = await crearEnvio(provider, {
    nombre: `Prueba envio ${new Date().toISOString()}`,
    asunto: "Prueba de plantilla — no es campaña",
    remitente: {
      nombre: process.env.REMITENTE_NOMBRE ?? "Bodasesor",
      email,
    },
    contenido: {
      marca: "Bodasesor",
      titular: "Plantilla de prueba del microservicio",
      apoyo: "Creada por scripts/probar-envio.ts. No se envió campaña.",
      bloques: [
        {
          tipo: "texto",
          cuerpo: "Si ves esto en Brevo, el flujo crearEnvio (modo plantilla) funciona.",
        },
      ],
    },
    modo: "plantilla",
  });

  console.log(`OK Brevo plantilla id=${resultado.plantilla.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
