/**
 * Prueba del sync con providers mock (sin red, sin Brevo).
 * Verifica dryRun y filtrado de emails inválidos/suprimidos.
 */

import type { EmailProvider } from "../src/email-provider.js";
import type { KommoProvider } from "../src/kommo-provider.js";
import { syncContactosKommoBrevo } from "../src/servicios/sync-kommo-brevo.js";

class KommoMock implements KommoProvider {
  async verificarConexion(): Promise<boolean> {
    return true;
  }
  async listarContactos() {
    return [
      { nombre: "Ana", email: "ana@ejemplo.com" },
      { nombre: "Mal", email: "no-es-email" },
      { nombre: "Baja", email: "baja@ejemplo.com" },
      { nombre: "Espacios", email: "  OK@Ejemplo.COM " },
    ];
  }
}

function brevoMock(): EmailProvider {
  const llamadas: string[] = [];
  return {
    async verificarConexion() {
      return true;
    },
    async listarRemitentes() {
      return [];
    },
    async listarContactos() {
      return [];
    },
    async sincronizarContacto(input) {
      llamadas.push(input.email);
      return { id: llamadas.length };
    },
    async crearPlantilla() {
      return { id: 1 };
    },
    async actualizarPlantilla() {},
    async crearCampaña() {
      return { id: 1 };
    },
    async suprimir() {},
    async estaSuprimido(email) {
      return email === "baja@ejemplo.com";
    },
    // expose for assert
    _llamadas: llamadas,
  } as EmailProvider & { _llamadas: string[] };
}

async function main(): Promise<void> {
  const brevo = brevoMock() as EmailProvider & { _llamadas: string[] };
  const dry = await syncContactosKommoBrevo(new KommoMock(), brevo, {
    dryRun: true,
  });

  if (dry.total !== 4) throw new Error(`total esperado 4, got ${dry.total}`);
  if (dry.nuevosOActualizados !== 2) {
    throw new Error(`válidos dryRun esperados 2, got ${dry.nuevosOActualizados}`);
  }
  if (dry.invalidos.length !== 1 || dry.invalidos[0].email !== "no-es-email") {
    throw new Error("inválidos incorrectos");
  }
  if (dry.suprimidos !== 1) throw new Error("suprimidos esperado 1");
  if (brevo._llamadas.length !== 0) {
    throw new Error("dryRun no debe llamar a Brevo");
  }

  console.log("OK dryRun reporte:", JSON.stringify(dry));

  const brevo2 = brevoMock() as EmailProvider & { _llamadas: string[] };
  const real = await syncContactosKommoBrevo(new KommoMock(), brevo2, {
    dryRun: false,
  });
  if (brevo2._llamadas.length !== 2) {
    throw new Error(`sync real debía upsert 2, got ${brevo2._llamadas.length}`);
  }
  if (!brevo2._llamadas.includes("ana@ejemplo.com")) {
    throw new Error("faltó normalización ana@");
  }
  if (!brevo2._llamadas.includes("ok@ejemplo.com")) {
    throw new Error("faltó normalización OK@");
  }
  console.log("OK sync escritura mock:", JSON.stringify(real));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
