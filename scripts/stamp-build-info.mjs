/**
 * Escribe src/build-info.ts con la fecha/hora del build (America/Mexico_City).
 * Se ejecuta antes de `tsc` para que Hostinger muestre la última actualización.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date();
const iso = now.toISOString();
const label = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(now);

const contenido = `/**
 * Generado en cada \`npm run build\`. No editar a mano.
 * Marca la versión desplegada en Hostinger.
 */
export const BUILD_ISO = ${JSON.stringify(iso)};
export const BUILD_LABEL = ${JSON.stringify(label)};
`;

writeFileSync(join(root, "src/build-info.ts"), contenido, "utf8");
console.log(`build-info: ${label} (${iso})`);
