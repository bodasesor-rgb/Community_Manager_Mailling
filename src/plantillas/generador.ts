/**
 * Generador determinista de HTML para emails.
 * Sin LLM: el contenido llega estructurado y aquí solo se ensambla markup seguro.
 * Identidad: navy / cream / gold Bodasesor (compatible con Brevo).
 */

import {
  COLORES_BODASESOR,
  escaparHtml,
  generarEmailPromocionalHtml,
  type EmailPromocionalInput,
} from "./email-promocional.js";

export interface BloqueTexto {
  tipo: "texto";
  titulo?: string;
  cuerpo: string;
}

export interface BloqueImagen {
  tipo: "imagen";
  url: string;
  alt?: string;
}

export interface BloqueCta {
  tipo: "cta";
  texto: string;
  url: string;
}

export type BloqueContenido = BloqueTexto | BloqueImagen | BloqueCta;

export interface GenerarPlantillaHtmlInput {
  /** Marca / producto (aparece como señal principal). */
  marca: string;
  /** Titular del correo. */
  titular: string;
  /** Frase de apoyo corta. */
  apoyo?: string;
  /** Bloques de contenido en orden. */
  bloques?: BloqueContenido[];
  /** Pie legal / baja. */
  pie?: string;
  /** Color de acento (hex). Por defecto gold Bodasesor. */
  colorAcento?: string;
  /**
   * Si se define `destino`, se genera el layout promocional completo
   * (hero, productos, testimonial, blog, urgencia, social, footer Brevo).
   */
  promocional?: EmailPromocionalInput;
}

function renderBloque(bloque: BloqueContenido, colorAcento: string): string {
  if (bloque.tipo === "texto") {
    const titulo = bloque.titulo
      ? `<h2 style="margin:0 0 8px;font-size:18px;line-height:1.3;color:${COLORES_BODASESOR.navy};font-family:Georgia,'Times New Roman',serif;">${escaparHtml(bloque.titulo)}</h2>`
      : "";
    const cuerpo = escaparHtml(bloque.cuerpo).replace(/\n/g, "<br/>");
    return `<tr><td style="padding:16px 28px;background:${COLORES_BODASESOR.blanco};">${titulo}<p style="margin:0;font-size:15px;line-height:1.6;color:${COLORES_BODASESOR.texto};font-family:Arial,Helvetica,sans-serif;">${cuerpo}</p></td></tr>`;
  }

  if (bloque.tipo === "imagen") {
    const alt = escaparHtml(bloque.alt ?? "");
    const url = escaparHtml(bloque.url);
    return `<tr><td style="padding:8px 28px;background:${COLORES_BODASESOR.blanco};"><img src="${url}" alt="${alt}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;"/></td></tr>`;
  }

  const texto = escaparHtml(bloque.texto);
  const url = escaparHtml(bloque.url);
  return `<tr><td style="padding:8px 28px 20px;background:${COLORES_BODASESOR.blanco};" align="center">
    <a href="${url}" style="display:inline-block;background:${colorAcento};color:${COLORES_BODASESOR.navy};text-decoration:none;padding:12px 22px;font-size:15px;font-family:Arial,Helvetica,sans-serif;border-radius:4px;font-weight:bold;">${texto}</a>
  </td></tr>`;
}

/**
 * Genera el HTML completo de un email.
 * Si `promocional` está presente, usa el layout completo Bodasesor para Brevo.
 */
export function generarPlantillaHtml(input: GenerarPlantillaHtmlInput): string {
  if (input.promocional) {
    return generarEmailPromocionalHtml(input.promocional);
  }

  const colorAcento = input.colorAcento ?? COLORES_BODASESOR.gold;
  const marca = escaparHtml(input.marca);
  const titular = escaparHtml(input.titular);
  const apoyo = input.apoyo
    ? `<p style="margin:8px 0 0;font-size:16px;line-height:1.5;color:${COLORES_BODASESOR.cream};font-family:Arial,Helvetica,sans-serif;">${escaparHtml(input.apoyo)}</p>`
    : "";
  const bloques = (input.bloques ?? [])
    .map((b) => renderBloque(b, colorAcento))
    .join("\n");
  const pie = escaparHtml(
    input.pie ??
      "Recibes este correo porque formas parte de nuestra comunidad Bodasesor.",
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${titular}</title>
</head>
<body style="margin:0;padding:0;background:${COLORES_BODASESOR.cream};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORES_BODASESOR.cream};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:${COLORES_BODASESOR.blanco};">
          <tr>
            <td style="padding:28px 28px 12px;background:${COLORES_BODASESOR.navy};font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:${COLORES_BODASESOR.blanco};">
              ${marca}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;background:${COLORES_BODASESOR.navy};font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${COLORES_BODASESOR.blanco};">
              ${titular}
              ${apoyo}
            </td>
          </tr>
          ${bloques}
          <tr>
            <td style="padding:24px 28px;border-top:1px solid #e0d8ce;background:${COLORES_BODASESOR.cream};font-size:12px;line-height:1.5;color:${COLORES_BODASESOR.muted};font-family:Arial,Helvetica,sans-serif;">
              ${pie}
              <br/><br/>
              <a href="{{ unsubscribe }}" style="color:${COLORES_BODASESOR.navy};text-decoration:underline;">Cancelar suscripción</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export {
  generarEmailPromocionalHtml,
  TEMAS_EJEMPLO,
  COLORES_BODASESOR,
  escaparHtml,
  type EmailPromocionalInput,
  type ProductoPromocional,
} from "./email-promocional.js";
