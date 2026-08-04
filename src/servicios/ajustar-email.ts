/**
 * Ajustes puntuales sobre un mail ya generado.
 *
 * Estrategia (robusta, no reescribe el mail entero):
 * 1) Extrae campos visibles estables (titular, subtítulo, saludo, código, CTA…).
 * 2) Aplica pedidos claros de forma determinista.
 * 3) Si hace falta, Gemini propone SOLO valores nuevos de esos campos (JSON).
 * 4) Reescribe los nodos conocidos en el HTML.
 * 5) Exige cambio real en texto visible o asunto; si no, falla.
 */

import { generarTextoGemini } from "../gemini/cliente-texto.js";
import { asegurarHtmlEmail } from "./verificar-html-email.js";

export interface AjustarEmailInput {
  htmlContent: string;
  modificaciones: string;
  asunto?: string;
  nombre?: string;
  instruccionesOriginales?: string;
}

export interface AjustarEmailResultado {
  htmlContent: string;
  asunto: string;
  nombre: string;
  modeloTexto: string;
  cambiosAplicados: string;
}

interface CamposVisibles {
  titular: string;
  subtitulo: string;
  saludoInner: string;
  codigo: string;
  ctaTexto: string;
  urgencia: string;
}

type CamposPatch = Partial<{
  titular: string;
  subtitulo: string;
  saludo: string;
  codigo: string;
  ctaTexto: string;
  urgencia: string;
  asunto: string;
  nombre: string;
}>;

function limpiarJson(texto: string): string {
  return texto
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function textoVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function plainDeHtml(fragmento: string): string {
  return fragmento
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function escaparHtmlTexto(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escapa texto pero conserva {{ contact.FIRSTNAME }} y similares. */
function escaparConservandoBrevo(valor: string): string {
  return valor
    .split(/(\{\{\s*[\w.\s]+\s*\}\})/g)
    .map((parte) =>
      /^\{\{\s*[\w.\s]+\s*\}\}$/.test(parte) ? parte : escaparHtmlTexto(parte),
    )
    .join("");
}

function extraerEntreComillas(texto: string): string | undefined {
  const m =
    texto.match(/[«"“']([^«"”']{3,160})[»"”']/) ||
    texto.match(/:\s*([^\n.]{3,160})$/m);
  return m?.[1]?.trim();
}

function normalizarNombre(asunto: string, nombreActual: string): string {
  const base = (asunto || nombreActual || "Bodasesor").trim();
  if (!base) return "Bodasesor";
  return (base.toLowerCase().startsWith("bodasesor")
    ? base
    : `Bodasesor · ${base}`
  )
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim();
}

function extraerCampos(html: string): CamposVisibles {
  const titular =
    plainDeHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "") || "";

  // Subtítulo dorado justo bajo el H1 (mismo td navy)
  let subtitulo = "";
  const bloqueHero = html.match(
    /<h1\b[^>]*>[\s\S]*?<\/h1>\s*(<p\b[^>]*>[\s\S]*?<\/p>)?/i,
  );
  if (bloqueHero?.[1]) {
    subtitulo = plainDeHtml(bloqueHero[1]);
  }

  const saludoMatch = html.match(
    /<p\b[^>]*>([\s\S]*?\{\{\s*contact\.FIRSTNAME\s*\}\}[\s\S]*?)<\/p>/i,
  );
  const saludoInner = saludoMatch?.[1]?.trim() || "";

  const codigo =
    (html.match(/\b(MAILING\d{1,3})\b/i)?.[1] || "").toUpperCase() || "";

  const ctaMatch = html.match(
    /<a\b[^>]*(?:whatsapp|cotizar|api\.whatsapp)[^>]*>([\s\S]*?)<\/a>/i,
  ) || html.match(
    /<a\b[^>]*style="[^"]*background:#25D366[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
  );
  const ctaTexto = plainDeHtml(ctaMatch?.[1] || "");

  // Bloque urgencia: párrafo con MAILING o % de descuento en fondo navy/cream
  let urgencia = "";
  const urg = html.match(
    /<p\b[^>]*>([\s\S]*?(?:MAILING\d{1,3}|%\s*de descuento)[\s\S]*?)<\/p>/i,
  );
  if (urg?.[1] && !/\{\{\s*contact\.FIRSTNAME/i.test(urg[1])) {
    urgencia = plainDeHtml(urg[1]);
  }

  return { titular, subtitulo, saludoInner, codigo, ctaTexto, urgencia };
}

function reemplazarH1(html: string, nuevoPlain: string): string {
  if (!/<h1\b/i.test(html)) return html;
  const safe = escaparHtmlTexto(nuevoPlain.trim());
  return html.replace(
    /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i,
    `$1${safe.replace(/\$/g, "$$$$")}$3`,
  );
}

function reemplazarSubtitulo(html: string, nuevoPlain: string): string {
  const safe = escaparHtmlTexto(nuevoPlain.trim());
  const re =
    /(<h1\b[^>]*>[\s\S]*?<\/h1>\s*<p\b[^>]*>)([\s\S]*?)(<\/p>)/i;
  if (re.test(html)) {
    return html.replace(re, `$1${safe.replace(/\$/g, "$$$$")}$3`);
  }
  return html;
}

function reemplazarSaludo(html: string, nuevoSaludo: string): string {
  let cuerpo = nuevoSaludo.trim();
  if (!cuerpo) return html;
  // Asegurar FIRSTNAME
  if (!/\{\{\s*contact\.FIRSTNAME\s*\}\}/i.test(cuerpo)) {
    cuerpo = `Hola {{ contact.FIRSTNAME }},<br/><br/>${cuerpo}`;
  } else if (!/<br\s*\/?>/i.test(cuerpo) && !cuerpo.includes("\n")) {
    // Si viene en una línea "Hola {{…}}, resto" → separar un poco
    cuerpo = cuerpo.replace(
      /(\{\{\s*contact\.FIRSTNAME\s*\}\}\s*,?)\s*/i,
      "$1<br/><br/>",
    );
  }
  cuerpo = cuerpo.replace(/\n/g, "<br/>");
  const safe = escaparConservandoBrevo(cuerpo).replace(/\$/g, "$$$$");
  const re =
    /(<p\b[^>]*>)([\s\S]*?\{\{\s*contact\.FIRSTNAME\s*\}\}[\s\S]*?)(<\/p>)/i;
  if (!re.test(html)) return html;
  return html.replace(re, `$1${safe}$3`);
}

function reemplazarCodigo(html: string, nuevoCodigo: string): string {
  const cod = nuevoCodigo.trim().toUpperCase();
  if (!/^MAILING\d{1,3}$/.test(cod)) return html;
  const actual = html.match(/\b(MAILING\d{1,3})\b/i)?.[1];
  if (!actual || actual.toUpperCase() === cod) return html;
  let out = html.split(actual).join(cod);
  out = out.split(actual.toUpperCase()).join(cod);
  // Ajuste % si el número del código sugiere el %
  const n = Number(cod.replace(/\D/g, ""));
  if (n > 0 && n <= 50) {
    out = out.replace(/(\d{1,2})%\s*de descuento/gi, `${n}% de descuento`);
  }
  return out;
}

function reemplazarCtaTexto(html: string, nuevo: string): string {
  const safe = escaparHtmlTexto(nuevo.trim());
  const reWa =
    /(<a\b[^>]*(?:whatsapp|api\.whatsapp)[^>]*>)([\s\S]*?)(<\/a>)/i;
  if (reWa.test(html)) {
    return html.replace(reWa, `$1${safe.replace(/\$/g, "$$$$")}$3`);
  }
  const reGreen =
    /(<a\b[^>]*style="[^"]*background:#25D366[^"]*"[^>]*>)([\s\S]*?)(<\/a>)/i;
  if (reGreen.test(html)) {
    return html.replace(reGreen, `$1${safe.replace(/\$/g, "$$$$")}$3`);
  }
  return html;
}

function reemplazarUrgencia(html: string, nuevo: string): string {
  const safe = escaparHtmlTexto(nuevo.trim());
  const re =
    /(<p\b[^>]*>)([\s\S]*?(?:MAILING\d{1,3}|%\s*de descuento)[\s\S]*?)(<\/p>)/i;
  if (!re.test(html)) return html;
  // No tocar el saludo
  const m = html.match(re);
  if (m && /\{\{\s*contact\.FIRSTNAME/i.test(m[2] || "")) return html;
  return html.replace(re, `$1${safe.replace(/\$/g, "$$$$")}$3`);
}

function aplicarCampos(
  html: string,
  patch: CamposPatch,
  asuntoActual: string,
  nombreActual: string,
): {
  html: string;
  asunto: string;
  nombre: string;
  aplicados: string[];
} {
  let out = html;
  let asunto = asuntoActual;
  let nombre = nombreActual;
  const aplicados: string[] = [];
  const antes = extraerCampos(html);

  if (patch.titular && patch.titular.trim() && patch.titular.trim() !== antes.titular) {
    const next = reemplazarH1(out, patch.titular.trim());
    if (next !== out) {
      out = next;
      aplicados.push(
        `Titular «${antes.titular.slice(0, 40)}» → «${patch.titular.trim().slice(0, 60)}»`,
      );
    }
  }

  if (
    patch.subtitulo &&
    patch.subtitulo.trim() &&
    patch.subtitulo.trim() !== antes.subtitulo
  ) {
    const next = reemplazarSubtitulo(out, patch.subtitulo.trim());
    if (next !== out) {
      out = next;
      aplicados.push(`Subtítulo → «${patch.subtitulo.trim().slice(0, 60)}»`);
    }
  }

  if (patch.saludo && patch.saludo.trim()) {
    const plainAntes = plainDeHtml(antes.saludoInner);
    const plainNuevo = plainDeHtml(
      patch.saludo.includes("FIRSTNAME")
        ? patch.saludo
        : `Hola {{ contact.FIRSTNAME }}, ${patch.saludo}`,
    );
    if (plainNuevo && plainNuevo !== plainAntes) {
      const next = reemplazarSaludo(out, patch.saludo.trim());
      if (next !== out) {
        out = next;
        aplicados.push(`Saludo → «${plainNuevo.slice(0, 70)}»`);
      }
    }
  }

  if (patch.codigo && patch.codigo.trim()) {
    const next = reemplazarCodigo(out, patch.codigo.trim());
    if (next !== out) {
      out = next;
      aplicados.push(`Código → ${patch.codigo.trim().toUpperCase()}`);
    }
  }

  if (
    patch.ctaTexto &&
    patch.ctaTexto.trim() &&
    patch.ctaTexto.trim() !== antes.ctaTexto
  ) {
    const next = reemplazarCtaTexto(out, patch.ctaTexto.trim());
    if (next !== out) {
      out = next;
      aplicados.push(`CTA → «${patch.ctaTexto.trim().slice(0, 50)}»`);
    }
  }

  if (
    patch.urgencia &&
    patch.urgencia.trim() &&
    patch.urgencia.trim() !== antes.urgencia
  ) {
    const next = reemplazarUrgencia(out, patch.urgencia.trim());
    if (next !== out) {
      out = next;
      aplicados.push(`Urgencia → «${patch.urgencia.trim().slice(0, 50)}»`);
    }
  }

  if (patch.asunto && patch.asunto.trim() && patch.asunto.trim() !== asunto) {
    asunto = patch.asunto.trim().slice(0, 90);
    aplicados.push(`Asunto → «${asunto}»`);
    if (!patch.nombre) {
      nombre = normalizarNombre(asunto, nombre);
    }
  }

  if (patch.nombre && patch.nombre.trim() && patch.nombre.trim() !== nombre) {
    nombre = patch.nombre.trim().slice(0, 80);
    aplicados.push(`Nombre → «${nombre}»`);
  }

  return { html: out, asunto, nombre, aplicados };
}

/** Interpreta pedidos claros en español sin IA. */
function patchDeterminista(mods: string): CamposPatch {
  const patch: CamposPatch = {};

  if (/asunto/i.test(mods)) {
    const nuevo =
      extraerEntreComillas(mods) ||
      mods
        .replace(/^[\s\S]*?asunto\s*(?:del\s+correo\s*)?(?:a|por|:)?\s*/i, "")
        .replace(/[«»"']/g, "")
        .trim()
        .slice(0, 90);
    if (nuevo && nuevo.length >= 4 && !/^(cambia|modifica|actualiza)\b/i.test(nuevo)) {
      patch.asunto = nuevo;
    }
  }

  if (/titular|headline|h1|título principal|titulo principal/i.test(mods)) {
    const nuevo =
      extraerEntreComillas(mods) ||
      mods
        .replace(
          /^[\s\S]*?(?:titular|headline|h1|título principal|titulo principal)\s*(?:a|por|:)?\s*/i,
          "",
        )
        .replace(/[«»"']/g, "")
        .trim()
        .slice(0, 120);
    if (
      nuevo &&
      nuevo.length >= 4 &&
      !/^(más|mas|un poco|hazlo|haz|cambia|modifica)\b/i.test(nuevo)
    ) {
      patch.titular = nuevo;
    }
  }

  if (/subt[ií]tulo|bajada|tagline/i.test(mods)) {
    const nuevo =
      extraerEntreComillas(mods) ||
      mods
        .replace(
          /^[\s\S]*?(?:subt[ií]tulo|bajada|tagline)\s*(?:a|por|:)?\s*/i,
          "",
        )
        .replace(/[«»"']/g, "")
        .trim()
        .slice(0, 160);
    if (nuevo && nuevo.length >= 4) patch.subtitulo = nuevo;
  }

  if (/saludo/i.test(mods)) {
    const frase =
      extraerEntreComillas(mods) ||
      (mods.match(
        /saludo\s+(?:debe\s+)?(?:decir|mencione|mencionar|incluya|incluir|sea|queda|pase a)\s+(?:que\s+)?(.+)/i,
      )?.[1] ||
        "")
        .replace(/[«»"']/g, "")
        .trim()
        .slice(0, 280);
    if (frase.length >= 6) patch.saludo = frase;
  }

  const mCod = mods.match(/\b(MAILING\d{1,3})\b/i);
  if (mCod && /c[oó]digo|descuento|mailing/i.test(mods)) {
    patch.codigo = mCod[1]!.toUpperCase();
  }

  if (/\bcta\b|bot[oó]n|whatsapp/i.test(mods) && /texto|diga|diga|camb/i.test(mods)) {
    const nuevo = extraerEntreComillas(mods);
    if (nuevo && nuevo.length >= 4) patch.ctaTexto = nuevo;
  }

  return patch;
}

/** ¿El pedido apunta al cuerpo visible del mail (no solo al asunto)? */
function pedidoPideCambioCuerpo(mods: string): boolean {
  // Si solo habla de asunto/nombre interno, no exige cambio de cuerpo
  const sinAsunto = mods
    .replace(/\basunto\b[\s\S]*$/i, " ")
    .replace(/\bnombre\s+interno\b[\s\S]*$/i, " ");
  return /titular|saludo|subt[ií]tulo|cuerpo|texto del mail|producto|descuento|c[oó]digo|cta|bot[oó]n|pon|quita|headline|h1|título principal|titulo principal|título|titulo|elegante|premium|corto|largo|urgente|fondo|color|haz\s+el\s+mail|m[aá]s\s+elegante|m[aá]s\s+premium|modifica\s+el\s+mail/i.test(
    sinAsunto,
  );
}

async function patchConGemini(
  campos: CamposVisibles,
  mods: string,
  asuntoActual: string,
  nombreActual: string,
  instruccionesOriginales?: string,
): Promise<{ patch: CamposPatch; modelo: string; resumen: string }> {
  const prompt = `Eres editor de emails HTML de Bodasesor. El usuario quiere MODIFICAR un mail ya creado.
NO reescribas el HTML. Devuelve SOLO los campos que deben cambiar, con el texto NUEVO final.

PEDIDO DEL USUARIO:
"""
${mods.slice(0, 2500)}
"""

CAMPOS ACTUALES (texto visible):
- titular: ${JSON.stringify(campos.titular)}
- subtitulo: ${JSON.stringify(campos.subtitulo)}
- saludo: ${JSON.stringify(plainDeHtml(campos.saludoInner))}
- codigo: ${JSON.stringify(campos.codigo)}
- ctaTexto: ${JSON.stringify(campos.ctaTexto)}
- urgencia: ${JSON.stringify(campos.urgencia)}
- asunto: ${JSON.stringify(asuntoActual)}
- nombre: ${JSON.stringify(nombreActual)}
${instruccionesOriginales?.trim() ? `Brief original: ${instruccionesOriginales.trim().slice(0, 500)}\n` : ""}

Devuelve SOLO JSON:
{
  "titular": "nuevo o null si no cambia",
  "subtitulo": "nuevo o null",
  "saludo": "texto del saludo (puede incluir {{ contact.FIRSTNAME }}) o null",
  "codigo": "MAILING## o null",
  "ctaTexto": "nuevo texto del botón o null",
  "urgencia": "nuevo o null",
  "asunto": "nuevo o null",
  "nombre": "nuevo o null",
  "cambiosAplicados": "resumen corto"
}

Reglas:
- Si el pedido es vago («más elegante», «más premium», «mejor»), DEBES cambiar al menos titular Y saludo con copy claramente distinto.
- Si pide cambiar un campo concreto, solo ese (y los imprescindibles).
- El saludo debe conservar o incluir {{ contact.FIRSTNAME }}.
- codigo solo formato MAILING + número.
- No inventes URLs. No toques logo ni redes.
- Los textos nuevos deben verse distintos a los actuales.
- Sin markdown.`;

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 0.35,
    maxOutputTokens: 1800,
    responseMimeType: "application/json",
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(limpiarJson(texto)) as Record<string, unknown>;
  } catch {
    throw new Error("No se pudo interpretar el ajuste de la IA");
  }

  if (typeof parsed.htmlContent === "string" && parsed.htmlContent.length > 200) {
    throw new Error(
      "El ajuste intentó reescribir todo el mail. Sé más puntual (ej. «Cambia el titular a: …»).",
    );
  }

  const pick = (k: string): string | undefined => {
    const v = parsed[k];
    if (v === null || v === undefined) return undefined;
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    if (!t || t.toLowerCase() === "null" || t.toLowerCase() === "sin cambio") {
      return undefined;
    }
    return t;
  };

  const patch: CamposPatch = {};
  const titular = pick("titular");
  const subtitulo = pick("subtitulo");
  const saludo = pick("saludo");
  const codigo = pick("codigo");
  const ctaTexto = pick("ctaTexto");
  const urgencia = pick("urgencia");
  const asunto = pick("asunto");
  const nombre = pick("nombre");
  if (titular) patch.titular = titular.slice(0, 120);
  if (subtitulo) patch.subtitulo = subtitulo.slice(0, 180);
  if (saludo) patch.saludo = saludo.slice(0, 400);
  if (codigo) patch.codigo = codigo.slice(0, 20);
  if (ctaTexto) patch.ctaTexto = ctaTexto.slice(0, 80);
  if (urgencia) patch.urgencia = urgencia.slice(0, 220);
  if (asunto) patch.asunto = asunto.slice(0, 90);
  if (nombre) patch.nombre = nombre.slice(0, 80);

  return {
    patch,
    modelo,
    resumen: String(parsed.cambiosAplicados || "").trim(),
  };
}

/** Si el pedido es estético/vago y aún no hay cambio visible, fuerza copy nuevo. */
async function forzarCopyVisible(
  campos: CamposVisibles,
  mods: string,
): Promise<CamposPatch> {
  const prompt = `Reescribe titular y saludo de un email Bodasesor para que se note el cambio pedido.
Pedido: """${mods.slice(0, 800)}"""
Titular actual: ${JSON.stringify(campos.titular)}
Saludo actual: ${JSON.stringify(plainDeHtml(campos.saludoInner))}
Devuelve SOLO JSON: {"titular":"...","saludo":"Hola {{ contact.FIRSTNAME }}, ..."}
Deben ser claramente distintos a los actuales. Sin markdown.`;

  const { texto } = await generarTextoGemini({
    prompt,
    temperature: 0.6,
    maxOutputTokens: 800,
    responseMimeType: "application/json",
  });
  try {
    const parsed = JSON.parse(limpiarJson(texto)) as {
      titular?: string;
      saludo?: string;
    };
    const patch: CamposPatch = {};
    if (parsed.titular?.trim() && parsed.titular.trim() !== campos.titular) {
      patch.titular = parsed.titular.trim().slice(0, 120);
    }
    if (parsed.saludo?.trim()) {
      patch.saludo = parsed.saludo.trim().slice(0, 400);
    }
    return patch;
  } catch {
    return {};
  }
}

export async function ajustarEmail(
  input: AjustarEmailInput,
): Promise<AjustarEmailResultado> {
  const mods = input.modificaciones.trim();
  if (!mods) {
    throw new Error("Escribe qué quieres modificar");
  }
  const htmlOriginal = asegurarHtmlEmail(input.htmlContent.trim());
  if (!htmlOriginal || htmlOriginal.length < 40) {
    throw new Error("Primero genera un borrador para poder ajustar");
  }

  const asuntoActual = (input.asunto || "").trim();
  const nombreActual = (input.nombre || "").trim();
  const visibleAntes = textoVisible(htmlOriginal);
  const camposAntes = extraerCampos(htmlOriginal);

  let html = htmlOriginal;
  let asunto = asuntoActual;
  let nombre = nombreActual;
  const aplicados: string[] = [];
  let modeloTexto = "determinista";

  // 1) Determinista
  const detPatch = patchDeterminista(mods);
  if (Object.keys(detPatch).length > 0) {
    const r = aplicarCampos(html, detPatch, asunto, nombre);
    html = r.html;
    asunto = r.asunto;
    nombre = r.nombre;
    aplicados.push(...r.aplicados);
  }

  const visibleTrasDet = textoVisible(html);
  const huboCambioDet =
    html !== htmlOriginal ||
    asunto !== asuntoActual ||
    visibleTrasDet !== visibleAntes;

  // 2) Gemini por campos si aún no hay cambio, o si el pedido pide más y solo cambió asunto
  // Si el determinista solo tocó asunto pero el usuario también pidió cuerpo → Gemini
  const faltaCuerpo =
    huboCambioDet &&
    html === htmlOriginal &&
    asunto !== asuntoActual &&
    pedidoPideCambioCuerpo(mods);

  if (!huboCambioDet || faltaCuerpo) {
    const gem = await patchConGemini(
      extraerCampos(html),
      mods,
      asunto,
      nombre,
      input.instruccionesOriginales,
    );
    modeloTexto = gem.modelo;
    const r = aplicarCampos(html, gem.patch, asunto, nombre);
    html = r.html;
    asunto = r.asunto;
    nombre = r.nombre;
    aplicados.push(...r.aplicados);
    if (aplicados.length === 0 && gem.resumen) {
      // Gemini dijo algo pero no aplicó — no inventar éxito
    }
  }

  // 3) Si pidió cambio visible y el texto sigue idéntico, forzar copy
  let visibleAhora = textoVisible(html);
  if (pedidoPideCambioCuerpo(mods) && visibleAhora === visibleAntes) {
    const forz = await forzarCopyVisible(extraerCampos(html), mods);
    if (Object.keys(forz).length > 0) {
      modeloTexto = `${modeloTexto}+forzado`;
      const r = aplicarCampos(html, forz, asunto, nombre);
      html = r.html;
      asunto = r.asunto;
      nombre = r.nombre;
      aplicados.push(...r.aplicados);
    }
  }

  // Seguridad tamaño
  if (html.length < htmlOriginal.length * 0.55) {
    throw new Error(
      "El ajuste habría borrado demasiado contenido; no se aplicó.",
    );
  }

  const htmlFinal = asegurarHtmlEmail(html);
  const visibleDespues = textoVisible(htmlFinal);
  const htmlCambio = htmlFinal !== htmlOriginal;
  const visibleCambio = visibleDespues !== visibleAntes;
  const asuntoCambio = asunto !== asuntoActual;
  const camposDespues = extraerCampos(htmlFinal);

  if (!htmlCambio && !asuntoCambio) {
    throw new Error(
      "No se detectó ningún cambio real en el correo. Escribe el pedido más concreto, por ejemplo: «Cambia el titular a: Cancún con luz dorada».",
    );
  }

  if (
    pedidoPideCambioCuerpo(mods) &&
    !visibleCambio &&
    camposDespues.titular === camposAntes.titular &&
    plainDeHtml(camposDespues.saludoInner) ===
      plainDeHtml(camposAntes.saludoInner)
  ) {
    throw new Error(
      "El sistema no pudo alterar el contenido visible. Reformula citando el texto nuevo entre comillas, ej. «Cambia el titular a: …».",
    );
  }

  const resumen =
    aplicados.length > 0
      ? aplicados.join(" · ")
      : asuntoCambio
        ? `Asunto actualizado a «${asunto}».`
        : visibleCambio
          ? "Cambio aplicado en el cuerpo del correo."
          : "Cambio aplicado.";

  return {
    htmlContent: htmlFinal,
    asunto,
    nombre: (nombre || normalizarNombre(asunto, nombreActual))
      .replace(/\s+/g, " ")
      .slice(0, 80)
      .trim(),
    modeloTexto,
    cambiosAplicados: resumen.slice(0, 500),
  };
}
