/**
 * Ajustes puntuales sobre un mail ya generado.
 * 1) Intenta cambios deterministas (asunto, titular, saludo, código).
 * 2) Si hace falta, Gemini propone parches buscar/reemplazar.
 * 3) Exige que el HTML o el asunto cambien de verdad; si no, falla.
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

function limpiarJson(texto: string): string {
  return texto
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

interface Parche {
  buscar: string;
  reemplazar: string;
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

function aplicarParcheUnaVez(html: string, buscar: string, reemplazar: string): string | null {
  if (!buscar || reemplazar === undefined) return null;
  if (html.includes(buscar)) {
    return html.replace(buscar, reemplazar);
  }
  // Variante: colapsar espacios en el HTML y en buscar
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const busN = norm(buscar);
  if (!busN) return null;
  // Buscar ventana aproximada ignorando saltos dentro de tags cercanos es complejo;
  // intentamos reemplazo case-insensitive exacto del substring.
  const idx = html.toLowerCase().indexOf(buscar.toLowerCase());
  if (idx >= 0) {
    return html.slice(0, idx) + reemplazar + html.slice(idx + buscar.length);
  }
  return null;
}

function aplicarParches(
  html: string,
  parches: Parche[],
): { html: string; aplicados: string[]; fallidos: string[] } {
  let out = html;
  const aplicados: string[] = [];
  const fallidos: string[] = [];
  for (const p of parches) {
    const buscar = (p.buscar || "").trim();
    if (!buscar || p.reemplazar === undefined) continue;
    if (buscar === p.reemplazar) {
      fallidos.push(`(sin cambio) ${buscar.slice(0, 60)}`);
      continue;
    }
    const next = aplicarParcheUnaVez(out, buscar, p.reemplazar);
    if (next === null) {
      fallidos.push(buscar.slice(0, 80));
      continue;
    }
    out = next;
    aplicados.push(
      `«${buscar.slice(0, 60)}» → «${String(p.reemplazar).slice(0, 60)}»`,
    );
  }
  return { html: out, aplicados, fallidos };
}

function extraerEntreComillas(texto: string): string | undefined {
  const m =
    texto.match(/[«"“']([^«"”']{3,120})[»"”']/) ||
    texto.match(/:\s*([^\n.]{3,120})$/m) ||
    texto.match(/\ba\s+([^\n.]{3,120})$/im);
  return m?.[1]?.trim();
}

/** Cambios locales sin IA para pedidos claros. */
function ajustesDeterministas(
  html: string,
  mods: string,
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

  // Asunto
  if (/asunto/i.test(mods)) {
    const nuevo =
      extraerEntreComillas(mods) ||
      mods
        .replace(/^[\s\S]*?asunto\s*(?:del\s+correo\s*)?(?:a|por|:)?\s*/i, "")
        .replace(/[«»"']/g, "")
        .trim()
        .slice(0, 90);
    if (nuevo && nuevo.length >= 4 && !/^cambia/i.test(nuevo)) {
      asunto = nuevo;
      nombre = (asunto.toLowerCase().startsWith("bodasesor")
        ? asunto
        : `Bodasesor · ${asunto}`
      ).slice(0, 80);
      aplicados.push(`Asunto → «${asunto}»`);
    }
  }

  // Titular / h1
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
    if (nuevo && nuevo.length >= 4 && out.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)) {
      const prev = out.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
      out = out.replace(
        /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i,
        `$1${nuevo.replace(/\$/g, "$$$$")}$3`,
      );
      if (out.includes(`>${nuevo}</h1>`) || out.includes(nuevo)) {
        aplicados.push(`Titular «${prev.replace(/<[^>]+>/g, "").slice(0, 40)}» → «${nuevo}»`);
      }
    }
  }

  // Código de descuento MAILING##
  const mCod = mods.match(/\b(MAILING\d{1,3})\b/i);
  if (mCod && /c[oó]digo|descuento|mailing/i.test(mods)) {
    const nuevoCod = mCod[1]!.toUpperCase();
    if (out.includes("MAILING10") && nuevoCod !== "MAILING10") {
      out = out.split("MAILING10").join(nuevoCod);
      aplicados.push(`Código MAILING10 → ${nuevoCod}`);
      // preheader / urgencia a veces mencionan 10%
      if (/20|quince|15|5\b/.test(nuevoCod) === false && /MAILING20/i.test(nuevoCod)) {
        out = out.replace(/10%\s*de descuento/gi, "20% de descuento");
      }
    }
  }

  // Saludo: reemplaza el párrafo que contiene FIRSTNAME
  if (/saludo/i.test(mods)) {
    const frase =
      extraerEntreComillas(mods) ||
      (mods.match(
        /saludo\s+(?:debe\s+)?(?:decir|mencione|mencionar|incluya|incluir)\s+(?:que\s+)?(.+)/i,
      )?.[1] ||
        "")
        .replace(/[«»"']/g, "")
        .trim()
        .slice(0, 220);
    if (frase.length >= 8) {
      const reSaludoP =
        /(<p\b[^>]*>)([\s\S]*?\{\{ contact\.FIRSTNAME \}\}[\s\S]*?)(<\/p>)/i;
      if (reSaludoP.test(out)) {
        const safe = frase.replace(/\$/g, "$$$$");
        out = out.replace(
          reSaludoP,
          `$1Hola {{ contact.FIRSTNAME }},<br/><br/>${safe}$3`,
        );
        aplicados.push(`Saludo actualizado`);
      }
    }
  }

  return { html: out, asunto, nombre, aplicados };
}

async function parchesConGemini(
  html: string,
  mods: string,
  asuntoActual: string,
  nombreActual: string,
  instruccionesOriginales?: string,
): Promise<{
  parches: Parche[];
  asunto: string;
  nombre: string;
  modelo: string;
  resumenModelo: string;
}> {
  const extractos: string[] = [];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const raw = h1[1];
    const plain = raw.replace(/<[^>]+>/g, "").trim();
    extractos.push(`H1_RAW: ${raw}`);
    extractos.push(`H1_TEXTO: ${plain}`);
  }
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].slice(0, 12);
  for (const m of paras) {
    const raw = m[1]!;
    const plain = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (plain.length < 12 || plain.length > 320) continue;
    extractos.push(`P_RAW: ${raw.slice(0, 400)}`);
    extractos.push(`P_TEXTO: ${plain}`);
  }
  if (html.includes("MAILING10")) {
    extractos.push("CODIGO_RAW: MAILING10");
  }

  // Fragmentos literales cortos del HTML para copiar en "buscar"
  const literales: string[] = [];
  if (h1) literales.push(h1[0]!);
  for (const m of paras.slice(0, 4)) {
    if (m[0] && m[0].length < 500) literales.push(m[0]);
  }

  const prompt = `Eres editor de emails HTML de Bodasesor. Debes proponer parches buscar→reemplazar que SÍ existan en el HTML.

PEDIDO:
"""
${mods.slice(0, 2500)}
"""

Asunto actual: ${asuntoActual || "(vacío)"}
Nombre actual: ${nombreActual || "(vacío)"}
${instruccionesOriginales?.trim() ? `Brief: ${instruccionesOriginales.trim().slice(0, 600)}\n` : ""}

TEXTOS DEL HTML (usa P_RAW / H1_RAW como base de "buscar" cuando puedas):
${extractos.map((e) => `- ${e}`).join("\n")}

FRAGMENTOS LITERALES DEL HTML (cópialos exactos en "buscar"):
${literales.map((l) => `<<<\n${l}\n>>>`).join("\n")}

Devuelve SOLO JSON:
{
  "parches": [
    { "buscar": "substring EXACTO del HTML", "reemplazar": "nuevo substring" }
  ],
  "asunto": "solo cámbialo si el usuario lo pidió; si no, idéntico al actual",
  "nombre": "solo cámbialo si el usuario lo pidió; si no, idéntico al actual",
  "cambiosAplicados": "qué cambiaste"
}

Reglas:
- Máximo 6 parches.
- "buscar" DEBE aparecer tal cual en el HTML (incluye tags si usas H1_RAW/P_RAW).
- Preferir reemplazar el texto dentro de <h1>...</h1> o el bloque <p> del saludo.
- NO reescribas el correo completo.
- NO toques {{ contact.FIRSTNAME }}, {{ unsubscribe }}, navbar, logo ni iconos sociales.
- Si el pedido es solo de asunto/nombre, parches puede ser [].
- Sin markdown.`;

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 0.1,
    maxOutputTokens: 2500,
    responseMimeType: "application/json",
  });

  let parsed: {
    parches?: Parche[];
    asunto?: string;
    nombre?: string;
    cambiosAplicados?: string;
    htmlContent?: string;
  };
  try {
    parsed = JSON.parse(limpiarJson(texto)) as typeof parsed;
  } catch {
    throw new Error("No se pudo interpretar el ajuste de la IA");
  }

  if (parsed.htmlContent && (!parsed.parches || parsed.parches.length === 0)) {
    throw new Error(
      "El ajuste intentó reescribir todo el mail. Sé más puntual (ej. «cambia el titular a…»).",
    );
  }

  return {
    parches: (parsed.parches ?? []).filter(
      (p) => typeof p?.buscar === "string" && typeof p?.reemplazar === "string",
    ),
    asunto: (parsed.asunto || asuntoActual || "Bodasesor").trim(),
    nombre: (parsed.nombre || nombreActual || `Bodasesor · ${asuntoActual}`)
      .replace(/\s+/g, " ")
      .slice(0, 80)
      .trim(),
    modelo,
    resumenModelo: (parsed.cambiosAplicados || "").trim(),
  };
}

function reemplazarH1(html: string, nuevo: string): string {
  if (!/<h1\b/i.test(html)) return html;
  return html.replace(
    /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i,
    `$1${nuevo.replace(/\$/g, "$$$$")}$3`,
  );
}

function forzarTitularDesdePedido(html: string, mods: string): string | null {
  if (!/titular|headline|h1|título|titulo/i.test(mods)) return null;
  const nuevo =
    extraerEntreComillas(mods) ||
    mods
      .replace(
        /^[\s\S]*?(?:titular|headline|h1|título principal|titulo principal|título|titulo)\s*(?:a|por|:)?\s*/i,
        "",
      )
      .replace(/[«»"']/g, "")
      .trim()
      .slice(0, 120);
  if (!nuevo || nuevo.length < 4) return null;
  const next = reemplazarH1(html, nuevo);
  return next !== html ? next : null;
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

  // 1) Determinista
  const det = ajustesDeterministas(
    htmlOriginal,
    mods,
    asuntoActual,
    nombreActual,
  );
  let html = det.html;
  let asunto = det.asunto;
  let nombre = det.nombre;
  const aplicados: string[] = [...det.aplicados];
  let modeloTexto = "determinista";

  const cambioDeterministaSuficiente =
    html !== htmlOriginal || asunto !== asuntoActual;

  // 2) Gemini si el cambio determinista no alcanzó (o no hubo)
  if (!cambioDeterministaSuficiente) {
    const gem = await parchesConGemini(
      html,
      mods,
      asunto,
      nombre,
      input.instruccionesOriginales,
    );
    modeloTexto = gem.modelo;
    const { html: htmlParcheado, aplicados: ap, fallidos } = aplicarParches(
      html,
      gem.parches,
    );
    html = htmlParcheado;
    aplicados.push(...ap);

    if (/asunto/i.test(mods) && gem.asunto && gem.asunto.trim()) {
      const nuevoAsunto = gem.asunto.trim().slice(0, 90);
      if (nuevoAsunto !== asunto) {
        asunto = nuevoAsunto;
        nombre = (asunto.toLowerCase().startsWith("bodasesor")
          ? asunto
          : `Bodasesor · ${asunto}`
        ).slice(0, 80);
        aplicados.push(`Asunto → «${asunto}»`);
      }
    }

    // Fallback titular si el pedido lo pedía y aún no cambió el h1
    if (/titular|h1|título|titulo/i.test(mods)) {
      const forzado = forzarTitularDesdePedido(html, mods);
      if (forzado && forzado !== html) {
        html = forzado;
        aplicados.push("Titular aplicado en <h1>");
      }
    }

    if (
      html === htmlOriginal &&
      asunto === asuntoActual &&
      fallidos.length > 0
    ) {
      const forzado = forzarTitularDesdePedido(html, mods);
      if (forzado && forzado !== html) {
        html = forzado;
        aplicados.push("Titular aplicado por respaldo");
      } else {
        throw new Error(
          `No pude aplicar el cambio en el HTML. Prueba así: «Cambia el titular a: …» o «El saludo debe decir: …». Falló buscar: ${fallidos[0]}`,
        );
      }
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

  if (!htmlCambio && !asuntoCambio) {
    throw new Error(
      "No se detectó ningún cambio real en el correo. Escribe el pedido más concreto, por ejemplo: «Cambia el titular a: Cancún con luz dorada».",
    );
  }

  // Si solo cambió asunto, OK. Si pidió cambio visual y el visible es idéntico → error
  if (
    !asuntoCambio &&
    !visibleCambio &&
    /titular|saludo|texto|producto|descuento|c[oó]digo|pon|quita|cambia/i.test(
      mods,
    )
  ) {
    throw new Error(
      "El sistema respondió sin alterar el contenido visible. Reformula el cambio citando el texto nuevo entre comillas.",
    );
  }

  const resumen =
    aplicados.length > 0
      ? aplicados.join(" · ")
      : asuntoCambio
        ? `Asunto actualizado a «${asunto}».`
        : "Cambio aplicado.";

  return {
    htmlContent: htmlFinal,
    asunto,
    nombre: nombre
      .replace(/\s+/g, " ")
      .slice(0, 80)
      .trim(),
    modeloTexto,
    cambiosAplicados: resumen.slice(0, 500),
  };
}
