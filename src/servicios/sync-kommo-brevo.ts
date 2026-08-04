/**
 * Sync Kommo → Brevo (solo correos válidos, respeta supresión local).
 */

import type { EmailProvider } from "../email-provider.js";
import type { KommoProvider, KommoContactoEmail } from "../kommo-provider.js";
import { esEmailValido, normalizarEmail } from "../validar-email.js";

export interface SyncContactosReporte {
  total: number;
  nuevosOActualizados: number;
  invalidos: KommoContactoEmail[];
  suprimidos: number;
  omitidosSinCambio?: number;
  dryRun: boolean;
}

export interface SyncContactosOpciones {
  /** Si true, no escribe en Brevo; solo calcula el reporte. */
  dryRun?: boolean;
  listIds?: number[];
}

/**
 * Trae contactos de Kommo, valida emails y hace upsert en Brevo.
 */
export async function syncContactosKommoBrevo(
  kommo: KommoProvider,
  email: EmailProvider,
  opciones: SyncContactosOpciones = {},
): Promise<SyncContactosReporte> {
  const dryRun = opciones.dryRun === true;
  const contactos = await kommo.listarContactos();

  let nuevosOActualizados = 0;
  let suprimidos = 0;
  const invalidos: KommoContactoEmail[] = [];

  for (const c of contactos) {
    const emailNorm = normalizarEmail(c.email);
    if (!esEmailValido(emailNorm)) {
      invalidos.push({ nombre: c.nombre, email: c.email });
      continue;
    }

    if (await email.estaSuprimido(emailNorm)) {
      suprimidos += 1;
      continue;
    }

    if (!dryRun) {
      const resultado = await email.sincronizarContacto({
        email: emailNorm,
        atributos: { NOMBRE: c.nombre },
        ...(opciones.listIds !== undefined ? { listIds: opciones.listIds } : {}),
      });
      // null = suprimido (carrera rara); no cuenta como sync
      if (resultado !== null) {
        nuevosOActualizados += 1;
      } else {
        suprimidos += 1;
      }
    } else {
      nuevosOActualizados += 1;
    }
  }

  return {
    total: contactos.length,
    nuevosOActualizados,
    invalidos,
    suprimidos,
    dryRun,
  };
}
