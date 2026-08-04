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

export const REGLAS_DEFAULT = `ORDEN OBLIGATORIO DEL CORREO (igual que la web Bodasesor):

1) NAVBAR PRINCIPAL (arriba del todo)
   - Solo enlaces iniciales: Inicio, Bodas, XV años, Corporativos, Servicios, Blog, Galería, Cotizar.
   - SIN submenús. Cada ítem linkeado a su URL real de bodasesor.com.
   - Debajo de la navbar: LOGO Bodasesor visible.

2) BLOG (después del logo / saludo)
   - Artículo AL AZAR del blog del sitio.
   - Solo ~3 párrafos (no el artículo completo).
   - Botón/enlace final: «Ver más» a la nota real.

3) 8 PRODUCTOS VARIADOS
   - Exactamente 8 productos/servicios distintos del catálogo.
   - Cada uno con acceso directo (URL) a su página.
   - Con imagen si hay y botón «Ver servicio».

4) DESCUENTO MAILING
   - Código: MAILING10
   - 10% de descuento, bloque visible y claro.

5) CONTACTO
   - Botón WhatsApp para cotizar + redes si existen.

IMPORTANTE: esta estructura la arma el sistema siempre; la IA solo escribe textos (asunto, saludo, CTA).
No omitas navbar, blog, 8 productos ni el código MAILING10.`;

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
