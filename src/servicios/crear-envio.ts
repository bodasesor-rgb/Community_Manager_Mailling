/**
 * Orquestación de creación de envíos.
 * Genera HTML → sube plantilla a Brevo → (opcional) crea campaña en borrador.
 * Nunca envía campañas de forma inmediata desde aquí.
 */

import type {
  EmailProvider,
  IdResultado,
  Remitente,
} from "../email-provider.js";
import {
  generarPlantillaHtml,
  type GenerarPlantillaHtmlInput,
} from "../plantillas/generador.js";

export type ModoEnvio = "plantilla" | "borrador";

export interface CrearEnvioInput {
  /** Nombre interno de plantilla/campaña. */
  nombre: string;
  /** Asunto del correo. */
  asunto: string;
  /** Remitente verificado en Brevo. */
  remitente: Remitente;
  /** Contenido estructurado → HTML determinista. */
  contenido: GenerarPlantillaHtmlInput;
  /**
   * plantilla = solo crea plantilla en Brevo.
   * borrador = plantilla + campaña en borrador (requiere listIds).
   * Default: plantilla (más seguro).
   */
  modo?: ModoEnvio;
  /** Listas de Brevo (obligatorio si modo=borrador). */
  listIds?: number[];
  /**
   * Si se indica, agenda la campaña.
   * Solo aplica en modo borrador; úsalo con cuidado.
   */
  scheduledAt?: string;
}

export interface CrearEnvioResultado {
  htmlContent: string;
  plantilla: IdResultado;
  campana?: IdResultado;
  modo: ModoEnvio;
}

/**
 * Crea un envío listo en Brevo sin disparar envío inmediato
 * (salvo que pases scheduledAt explícitamente).
 */
export async function crearEnvio(
  provider: EmailProvider,
  input: CrearEnvioInput,
): Promise<CrearEnvioResultado> {
  const modo: ModoEnvio = input.modo ?? "plantilla";
  const htmlContent = generarPlantillaHtml(input.contenido);

  const plantilla = await provider.crearPlantilla({
    nombre: input.nombre,
    asunto: input.asunto,
    htmlContent,
    remitente: input.remitente,
  });

  if (modo === "plantilla") {
    return { htmlContent, plantilla, modo };
  }

  const listIds = input.listIds ?? [];
  if (listIds.length === 0) {
    throw new Error(
      "modo=borrador requiere listIds con al menos una lista de Brevo.",
    );
  }

  const campana = await provider.crearCampaña({
    nombre: input.nombre,
    asunto: input.asunto,
    remitente: input.remitente,
    templateId: plantilla.id,
    listIds,
    ...(input.scheduledAt !== undefined
      ? { scheduledAt: input.scheduledAt }
      : {}),
  });

  return { htmlContent, plantilla, campana, modo };
}
