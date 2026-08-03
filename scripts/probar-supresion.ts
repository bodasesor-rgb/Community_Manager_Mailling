/**
 * Prueba local de la lista de supresión (sin llamar a Brevo).
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { JsonSupresionStore } from "../src/supresion/index.js";
import { BrevoProvider } from "../src/email-provider.js";

async function main(): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "supresion-"));
  const archivo = path.join(tmp, "suprimidos.json");
  const store = new JsonSupresionStore(archivo);
  const provider = new BrevoProvider(store);

  const email = "Baja@Test.com";

  if (await provider.estaSuprimido(email)) {
    throw new Error("No debería estar suprimido al inicio");
  }

  await provider.suprimir(email, "prueba local");

  if (!(await provider.estaSuprimido(email))) {
    throw new Error("Debería estar suprimido tras suprimir()");
  }

  if (!(await provider.estaSuprimido("baja@test.com"))) {
    throw new Error("La comparación debe ser case-insensitive");
  }

  // sincronizarContacto debe cortar sin llamar a Brevo si está suprimido.
  const resultado = await provider.sincronizarContacto({ email });
  if (resultado !== null) {
    throw new Error("sincronizarContacto debía devolver null para email suprimido");
  }

  console.log("OK: supresión local y bloqueo de sincronización funcionan.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
