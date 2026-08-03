/**
 * Sincroniza un contacto de Kommo hacia el EmailProvider (Brevo),
 * respetando la lista de supresión local.
 */

import type { EmailProvider, IdResultado } from "../email-provider.js";
import type { KommoClient, KommoContacto } from "./cliente.js";

export interface SyncKommoResultado {
  kommoId: number;
  email: string | null;
  sincronizado: boolean;
  motivo?: string;
  brevo?: IdResultado | null;
}

export async function sincronizarContactoKommo(
  kommo: KommoClient,
  emailProvider: EmailProvider,
  kommoId: number,
  listIds?: number[],
): Promise<SyncKommoResultado> {
  const contacto: KommoContacto = await kommo.obtenerContacto(kommoId);

  if (!contacto.email) {
    return {
      kommoId,
      email: null,
      sincronizado: false,
      motivo: "contacto Kommo sin email",
    };
  }

  const brevo = await emailProvider.sincronizarContacto({
    email: contacto.email,
    atributos: {
      NOMBRE: contacto.nombre,
      KOMMO_ID: String(contacto.id),
      ...(contacto.telefono ? { TELEFONO: contacto.telefono } : {}),
    },
    ...(listIds !== undefined ? { listIds } : {}),
  });

  if (brevo === null) {
    return {
      kommoId,
      email: contacto.email,
      sincronizado: false,
      motivo: "email en lista de supresión local",
      brevo: null,
    };
  }

  return {
    kommoId,
    email: contacto.email,
    sincronizado: true,
    brevo,
  };
}
