/**
 * Genera HTML de ejemplo (Posadas, Cancún, CDMX, Guadalajara)
 * en src/plantillas/ejemplos/ para copiar a Brevo o revisar offline.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  generarEmailPromocionalHtml,
  TEMAS_EJEMPLO,
} from "../src/plantillas/email-promocional.js";

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), "src/plantillas/ejemplos");
  await fs.mkdir(dir, { recursive: true });

  for (const [id, tema] of Object.entries(TEMAS_EJEMPLO)) {
    const html = generarEmailPromocionalHtml(tema);
    const file = path.join(dir, `${id}.html`);
    await fs.writeFile(file, html, "utf8");
    const checks = [
      "[[FOTO_HERO]]",
      "[[ENLACE_COTIZAR]]",
      "{{ contact.FIRSTNAME }}",
      "{{ unsubscribe }}",
      "#1a2744",
      "#C9A84C",
      "#f5f0ea",
    ];
    for (const c of checks) {
      if (!html.includes(c)) {
        throw new Error(`${id}: falta ${c}`);
      }
    }
    console.log(`OK ${id}: ${html.length} chars → ${file}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
