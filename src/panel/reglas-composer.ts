/**
 * Reglas permanentes del creador de mails.
 * Se guardan en disco durable y solo se borran si el usuario las limpia.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  asegurarPersistencia,
  rutasPersistencia,
} from "../persistencia/rutas.js";

export interface ReglasComposer {
  texto: string;
  actualizadoEn: string;
}

export const REGLAS_DEFAULT = `Estructura fija del correo (debe parecerse a la web Bodasesor):

1) NAVBAR PRINCIPAL arriba del todo
   - Solo los enlaces iniciales del menú de bodasesor.com (sin submenús).
   - Cada ítem debe ir linkeado a su URL real.
   - Mostrar también el logo de Bodasesor.

2) ÁREA DE BLOG
   - Tomar un artículo al azar del blog del sitio.
   - Mostrar solo unos 3 párrafos (no el artículo completo).
   - Cerrar con el enlace «Ver más» a la nota completa.

3) 8 PRODUCTOS
   - Mostrar exactamente 8 productos/servicios variados de lo que manejamos.
   - Cada uno con acceso directo (enlace) a su página en bodasesor.com.
   - Preferir imagen + botón/enlace «Ver servicio».

4) CÓDIGO DE DESCUENTO
   - Incluir un código de descuento por mailing del 10%.
   - Código: MAILING10
   - Debe quedar visible y claro cerca del final del correo.

5) CONTACTO
   - Incluir botones/enlaces de contacto (WhatsApp cotizar y redes si hay).

Estas reglas aplican siempre al generar, salvo que las borres o edites aquí.`;

async function archivo(): Promise<string> {
  await asegurarPersistencia();
  return rutasPersistencia().reglas;
}

export async function leerReglasComposer(): Promise<ReglasComposer> {
  const ruta = await archivo();
  try {
    const raw = await fs.readFile(ruta, "utf8");
    const parsed = JSON.parse(raw) as Partial<ReglasComposer>;
    if (typeof parsed.texto === "string") {
      return {
        texto: parsed.texto,
        actualizadoEn:
          parsed.actualizadoEn ?? new Date().toISOString(),
      };
    }
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code !== "ENOENT") {
      // archivo corrupto → regenerar default
    }
  }
  const inicial: ReglasComposer = {
    texto: REGLAS_DEFAULT,
    actualizadoEn: new Date().toISOString(),
  };
  await guardarReglasComposer(inicial.texto);
  return inicial;
}

export async function guardarReglasComposer(
  texto: string,
): Promise<ReglasComposer> {
  const ruta = await archivo();
  await fs.mkdir(path.dirname(ruta), { recursive: true });
  const reg: ReglasComposer = {
    texto,
    actualizadoEn: new Date().toISOString(),
  };
  await fs.writeFile(ruta, JSON.stringify(reg, null, 2), "utf8");
  return reg;
}
