/**
 * Script de verificación manual contra Brevo.
 * - Verifica conexión
 * - Lista contactos e imprime cuántos hay
 * - Crea una plantilla de prueba
 * NO envía ninguna campaña real.
 *
 * Uso:
 *   export BREVO_API_KEY=...
 *   export BREVO_TEST_SENDER_EMAIL=tu@dominio.com
 *   export BREVO_TEST_SENDER_NAME="Community Manager"
 *   npm run probar-brevo
 */

import { BrevoProvider } from "../src/email-provider.js";

async function main(): Promise<void> {
  const provider = new BrevoProvider();

  console.log("1) Verificando conexión con Brevo...");
  const ok = await provider.verificarConexion();
  console.log(`   Conexión: ${ok ? "OK" : "FALLÓ"}`);

  if (!ok) {
    throw new Error("No se pudo verificar la conexión con Brevo.");
  }

  console.log("2) Listando contactos...");
  const contactos = await provider.listarContactos();
  console.log(`   Contactos encontrados: ${contactos.length}`);

  const senderEmail = process.env.BREVO_TEST_SENDER_EMAIL;
  const senderName = process.env.BREVO_TEST_SENDER_NAME ?? "Community Manager";

  if (!senderEmail) {
    console.log(
      "3) Omitiendo creación de plantilla: define BREVO_TEST_SENDER_EMAIL (remitente verificado en Brevo).",
    );
    return;
  }

  console.log("3) Creando plantilla de prueba (sin enviar campaña)...");
  const plantilla = await provider.crearPlantilla({
    nombre: `Prueba CM ${new Date().toISOString()}`,
    asunto: "Plantilla de prueba — Community Manager Mailling",
    htmlContent:
      "<html><body><h1>Plantilla de prueba</h1><p>Generada por probar-brevo.ts. No es una campaña.</p></body></html>",
    remitente: {
      nombre: senderName,
      email: senderEmail,
    },
  });
  console.log(`   Plantilla creada con id: ${plantilla.id}`);
  console.log("Listo. No se envió ninguna campaña.");
}

main().catch((error: unknown) => {
  console.error("Error en probar-brevo:", error);
  process.exitCode = 1;
});
