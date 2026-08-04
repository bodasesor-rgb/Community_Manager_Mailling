import { promises as fs } from "node:fs";
import path from "node:path";

async function copiarDir(origen, destino) {
  await fs.mkdir(destino, { recursive: true });
  const entradas = await fs.readdir(origen, { withFileTypes: true });
  for (const e of entradas) {
    const from = path.join(origen, e.name);
    const to = path.join(destino, e.name);
    if (e.isDirectory()) await copiarDir(from, to);
    else await fs.copyFile(from, to);
  }
}

const src = path.resolve("src/panel/assets");
const dest = path.resolve("dist/src/panel/assets");
await copiarDir(src, dest);
console.log(`assets: ${src} → ${dest}`);
