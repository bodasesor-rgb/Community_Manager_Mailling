/**
 * Generador determinista de HTML para emails.
 * Sin LLM: el contenido llega estructurado y aquí solo se ensambla markup seguro.
 */

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
  /** Color de acento (hex). Por defecto azul Bodasesor. */
  colorAcento?: string;
}

/** Escapa texto para insertarlo en HTML. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBloque(bloque: BloqueContenido, colorAcento: string): string {
  if (bloque.tipo === "texto") {
    const titulo = bloque.titulo
      ? `<h2 style="margin:0 0 8px;font-size:18px;line-height:1.3;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;">${escaparHtml(bloque.titulo)}</h2>`
      : "";
    const cuerpo = escaparHtml(bloque.cuerpo).replace(/\n/g, "<br/>");
    return `<tr><td style="padding:16px 28px;">${titulo}<p style="margin:0;font-size:15px;line-height:1.6;color:#333;font-family:Arial,Helvetica,sans-serif;">${cuerpo}</p></td></tr>`;
  }

  if (bloque.tipo === "imagen") {
    const alt = escaparHtml(bloque.alt ?? "");
    const url = escaparHtml(bloque.url);
    return `<tr><td style="padding:8px 28px;"><img src="${url}" alt="${alt}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;"/></td></tr>`;
  }

  // cta
  const texto = escaparHtml(bloque.texto);
  const url = escaparHtml(bloque.url);
  return `<tr><td style="padding:8px 28px 20px;" align="center">
    <a href="${url}" style="display:inline-block;background:${colorAcento};color:#ffffff;text-decoration:none;padding:12px 22px;font-size:15px;font-family:Arial,Helvetica,sans-serif;border-radius:4px;">${texto}</a>
  </td></tr>`;
}

/**
 * Genera el HTML completo de un email transaccional/marketing.
 * Salida lista para pasar a `crearPlantilla` / `crearCampaña`.
 */
export function generarPlantillaHtml(input: GenerarPlantillaHtmlInput): string {
  const colorAcento = input.colorAcento ?? "#14325C";
  const marca = escaparHtml(input.marca);
  const titular = escaparHtml(input.titular);
  const apoyo = input.apoyo
    ? `<p style="margin:8px 0 0;font-size:16px;line-height:1.5;color:#444;font-family:Arial,Helvetica,sans-serif;">${escaparHtml(input.apoyo)}</p>`
    : "";
  const bloques = (input.bloques ?? [])
    .map((b) => renderBloque(b, colorAcento))
    .join("\n");
  const pie = escaparHtml(
    input.pie ??
      "Recibes este correo porque formas parte de nuestra comunidad. Si no deseas seguir recibiendo mensajes, responde solicitando la baja.",
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${titular}</title>
</head>
<body style="margin:0;padding:0;background:#f3f1ec;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1ec;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;">
          <tr>
            <td style="padding:28px 28px 12px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:${colorAcento};">
              ${marca}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 28px 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#1a1a1a;">
              ${titular}
              ${apoyo}
            </td>
          </tr>
          ${bloques}
          <tr>
            <td style="padding:24px 28px;border-top:1px solid #e6e2da;font-size:12px;line-height:1.5;color:#777;font-family:Arial,Helvetica,sans-serif;">
              ${pie}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
