/**
 * Prueba del sync Kommo→Brevo.
 * Por defecto dryRun=true (NO escribe en Brevo).
 *
 *   npm run sync-contactos
 *   DRY_RUN=false npm run sync-contactos
 */

import { BrevoProvider } from "../src/email-provider.js";
import { KommoCrmProvider } from "../src/kommo-provider.js";
import { syncContactosKommoBrevo } from "../src/servicios/sync-kommo-brevo.js";

async function main(): Promise<void> {
  const dryRun = process.env.DRY_RUN !== "false";
  const kommo = new KommoCrmProvider();
  const brevo = new BrevoProvider();

  console.log(`Sync Kommo→Brevo (dryRun=${dryRun})...`);
  const okKommo = await kommo.verificarConexion();
  console.log(`Kommo conexión: ${okKommo ? "OK" : "FALLÓ"}`);

  const listIds = process.env.BREVO_DEFAULT_LIST_IDS
    ?.split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const reporte = await syncContactosKommoBrevo(kommo, brevo, {
    dryRun,
    ...(listIds && listIds.length > 0 ? { listIds } : {}),
  });

  console.log(JSON.stringify(reporte, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
