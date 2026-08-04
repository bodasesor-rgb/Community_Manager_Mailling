/**
 * Capa 2: verificador determinista de HTML de email (Brevo).
 * No depende del modelo: limpia envoltorios, valida lo no-negociable
 * y rechaza o auto-corrige antes de guardar / enviar a Brevo.
 */

/** Placeholders [[ ]] permitidos en plantillas Bodasesor. */
export const PLACEHOLDERS_PERMITIDOS = new Set([
  "[[LOGO]]",
  "[[FOTO_HERO]]",
  "[[ENLACE_COTIZAR]]",
  "[[ENLACE_BLOG]]",
  "[[ENLACE_FACEBOOK]]",
  "[[ENLACE_INSTAGRAM]]",
  "[[ENLACE_WHATSAPP]]",
  ...Array.from({ length: 12 }, (_, i) => `[[FOTO_PRODUCTO_${i + 1}]]`),
]);

/** Variables Brevo que deben aparecer literales (espaciado exacto). */
export const BREVO_UNSUBSCRIBE = "{{ unsubscribe }}";
export const BREVO_FIRSTNAME = "{{ contact.FIRSTNAME }}";

export type SeveridadVerificacion = "error" | "aviso" | "auto-fix";

export interface HallazgoHtmlEmail {
  codigo: string;
  severidad: SeveridadVerificacion;
  mensaje: string;
}

export interface ResultadoVerificacionHtml {
  ok: boolean;
  html: string;
  hallazgos: HallazgoHtmlEmail[];
  errores: string[];
  avisos: string[];
}

export class HtmlEmailInvalidoError extends Error {
  readonly resultado: ResultadoVerificacionHtml;

  constructor(resultado: ResultadoVerificacionHtml) {
    const detalle = resultado.errores.join(" · ") || "HTML de email inválido";
    super(detalle);
    this.name = "HtmlEmailInvalidoError";
    this.resultado = resultado;
  }
}

/**
 * Texto de auto-verificación para prompts (Capa 1).
 * El modelo debe aplicarlo mentalmente antes de responder.
 */
export const BLOQUE_AUTO_VERIFICACION_PROMPT = `
ANTES DE RESPONDER, VERIFICA (si algo falla, corrígelo antes de entregar):
□ ¿Mi respuesta empieza con <!DOCTYPE o <table y NO tiene \`\`\`html ni texto extra?
□ ¿Toda la estructura usa <table>? (ningún <div> con flexbox/grid)
□ ¿Usé {{ contact.FIRSTNAME }} y {{ unsubscribe }} EXACTOS, y los [[ ]] solo de la lista permitida?
□ ¿El footer incluye <a href="{{ unsubscribe }}">?
□ ¿Toda <img> tiene alt?
Si alguna casilla falla, arréglala. Solo entonces entrega el HTML.

Placeholders [[ ]] permitidos: [[LOGO]], [[FOTO_HERO]], [[ENLACE_COTIZAR]], [[ENLACE_BLOG]], [[ENLACE_FACEBOOK]], [[ENLACE_INSTAGRAM]], [[ENLACE_WHATSAPP]], [[FOTO_PRODUCTO_1]]…[[FOTO_PRODUCTO_12]].
Variables Brevo literales obligatorias: {{ contact.FIRSTNAME }}, {{ unsubscribe }}.
`.trim();

/** Ejemplo mínimo bien formado (referencia Capa 1). */
export const EJEMPLO_HTML_EMAIL_OK = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Bodasesor</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f1ea;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;">
          <tr>
            <td style="padding:20px;background:#1a2744;">
              <img src="[[LOGO]]" alt="Bodasesor Eventos" width="160" style="display:block;border:0;"/>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a2744;">
              Hola {{ contact.FIRSTNAME }},
              <br/><br/>
              En Bodasesor preparamos tu celebración con cuidado.
            </td>
          </tr>
          <tr>
            <td style="padding:24px;border-top:1px solid #e0d8ce;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#666666;text-align:center;">
              <a href="{{ unsubscribe }}" style="color:#1a2744;text-decoration:underline;">Cancelar suscripción</a>
              &nbsp;·&nbsp; Bodasesor · bodasesor.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Quita fences markdown y basura envolvente alrededor del HTML.
 */
export function limpiarEnvoltorioHtml(entrada: string): {
  html: string;
  limpio: boolean;
} {
  let html = (entrada || "").replace(/^\uFEFF/, "").trim();
  let limpio = false;

  // ```html ... ``` o ``` ... ```
  const fence = html.match(/^```(?:html|HTML)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/);
  if (fence?.[1]) {
    html = fence[1].trim();
    limpio = true;
  } else if (/^```/.test(html)) {
    html = html
      .replace(/^```(?:html|HTML)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    limpio = true;
  }

  // Prefacio tipo "Aquí tienes el correo:" antes del doctype/table
  const start =
    html.search(/<!DOCTYPE\s+html/i) >= 0
      ? html.search(/<!DOCTYPE\s+html/i)
      : html.search(/<html[\s>]/i) >= 0
        ? html.search(/<html[\s>]/i)
        : html.search(/<table[\s>]/i);
  if (start > 0) {
    html = html.slice(start).trim();
    limpio = true;
  }

  // Epílogo tras </html>
  const endHtml = html.toLowerCase().lastIndexOf("</html>");
  if (endHtml >= 0) {
    const after = html.slice(endHtml + "</html>".length).trim();
    if (after) {
      html = html.slice(0, endHtml + "</html>".length).trim();
      limpio = true;
    }
  }

  return { html, limpio };
}

function extraerPlaceholders(html: string): string[] {
  return [...html.matchAll(/\[\[[A-Z0-9_]+\]\]/g)].map((m) => m[0]!);
}

function imgsSinAlt(html: string): number {
  let malas = 0;
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0]!;
    if (!/\balt\s*=\s*(["']).*?\1/i.test(tag) && !/\balt\s*=\s*[^\s>]+/i.test(tag)) {
      malas += 1;
    }
  }
  return malas;
}

function tieneFlexOGridEnDiv(html: string): boolean {
  // Busca <div ... style="...flex|grid...">
  for (const m of html.matchAll(/<div\b([^>]*)>/gi)) {
    const attrs = m[1] || "";
    const style = attrs.match(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i)?.[2] || "";
    if (/display\s*:\s*(flex|inline-flex|grid|inline-grid)\b/i.test(style)) {
      return true;
    }
    if (/\b(flex|grid)-(direction|wrap|template|row|column)\s*:/i.test(style)) {
      return true;
    }
  }
  // class="...flex..." suelto en div también sospechoso en email
  for (const m of html.matchAll(/<div\b([^>]*)>/gi)) {
    const attrs = m[1] || "";
    if (/\bclass\s*=\s*(["'])[^"']*\b(flex|grid)\b[^"']*\1/i.test(attrs)) {
      return true;
    }
  }
  return false;
}

function htmlParseaBasico(html: string): boolean {
  if (!html || html.length < 40) return false;
  const lower = html.toLowerCase();
  const abreHtml = (lower.match(/<html\b/g) || []).length;
  const cierraHtml = (lower.match(/<\/html>/g) || []).length;
  if (abreHtml && abreHtml !== cierraHtml) return false;
  const abreTable = (lower.match(/<table\b/g) || []).length;
  const cierraTable = (lower.match(/<\/table>/g) || []).length;
  if (abreTable === 0) return false;
  if (Math.abs(abreTable - cierraTable) > 2) return false;
  return true;
}

/**
 * Verifica (y limpia) HTML de email listo para Brevo.
 * `estricto`: si true, lanza HtmlEmailInvalidoError cuando hay errores.
 */
export function verificarHtmlEmail(
  entrada: string,
  opciones?: { estricto?: boolean },
): ResultadoVerificacionHtml {
  const hallazgos: HallazgoHtmlEmail[] = [];
  const { html: limpio, limpio: seLimpio } = limpiarEnvoltorioHtml(entrada);
  let html = limpio;

  if (seLimpio) {
    hallazgos.push({
      codigo: "envoltorio",
      severidad: "auto-fix",
      mensaje: "Se quitó markdown/texto envolvente alrededor del HTML",
    });
  }

  const empiezaBien =
    /^<!DOCTYPE\s+html/i.test(html) ||
    /^<html[\s>]/i.test(html) ||
    /^<table[\s>]/i.test(html);
  if (!empiezaBien) {
    hallazgos.push({
      codigo: "inicio",
      severidad: "error",
      mensaje:
        "El HTML debe empezar con <!DOCTYPE html>, <html> o <table> (sin texto ni ```)",
    });
  }

  if (/```/.test(html)) {
    hallazgos.push({
      codigo: "markdown",
      severidad: "error",
      mensaje: "Quedan fences markdown (```) dentro del HTML",
    });
  }

  if (!html.includes(BREVO_UNSUBSCRIBE)) {
    hallazgos.push({
      codigo: "unsubscribe",
      severidad: "error",
      mensaje: `Falta ${BREVO_UNSUBSCRIBE} (Brevo lo exige)`,
    });
  } else if (!new RegExp(`<a\\b[^>]*href=["']${BREVO_UNSUBSCRIBE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(html)) {
    hallazgos.push({
      codigo: "unsubscribe-link",
      severidad: "error",
      mensaje: `El footer debe incluir <a href="${BREVO_UNSUBSCRIBE}">`,
    });
  }

  if (!html.includes(BREVO_FIRSTNAME)) {
    hallazgos.push({
      codigo: "firstname",
      severidad: "error",
      mensaje: `Falta ${BREVO_FIRSTNAME} exacto en el saludo`,
    });
  }

  if (tieneFlexOGridEnDiv(html)) {
    hallazgos.push({
      codigo: "flex-grid",
      severidad: "error",
      mensaje: "Hay <div> con flexbox/grid; en email usa solo <table>",
    });
  }

  const inventados = extraerPlaceholders(html).filter(
    (p) => !PLACEHOLDERS_PERMITIDOS.has(p),
  );
  if (inventados.length) {
    const unicos = [...new Set(inventados)];
    hallazgos.push({
      codigo: "placeholder",
      severidad: "error",
      mensaje: `Placeholders [[ ]] no permitidos: ${unicos.join(", ")}`,
    });
  }

  const sinAlt = imgsSinAlt(html);
  if (sinAlt > 0) {
    hallazgos.push({
      codigo: "img-alt",
      severidad: "error",
      mensaje: `${sinAlt} <img> sin atributo alt`,
    });
  }

  if (!htmlParseaBasico(html)) {
    hallazgos.push({
      codigo: "parseo",
      severidad: "error",
      mensaje: "El HTML no parsea de forma coherente (tablas/html desbalanceados)",
    });
  }

  // Avisos no bloqueantes
  if (!/<table\b/i.test(html)) {
    hallazgos.push({
      codigo: "sin-table",
      severidad: "error",
      mensaje: "No hay <table>; el layout de email debe basarse en tablas",
    });
  }

  const errores = hallazgos
    .filter((h) => h.severidad === "error")
    .map((h) => h.mensaje);
  const avisos = hallazgos
    .filter((h) => h.severidad !== "error")
    .map((h) => h.mensaje);

  const resultado: ResultadoVerificacionHtml = {
    ok: errores.length === 0,
    html,
    hallazgos,
    errores,
    avisos,
  };

  if (opciones?.estricto && !resultado.ok) {
    throw new HtmlEmailInvalidoError(resultado);
  }

  return resultado;
}

/**
 * Limpia + verifica en modo estricto. Devuelve HTML listo para Brevo.
 */
export function asegurarHtmlEmail(entrada: string): string {
  return verificarHtmlEmail(entrada, { estricto: true }).html;
}
