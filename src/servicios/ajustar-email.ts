/**
 * Ajustes puntuales sobre un mail ya generado.
 * Aplica parches (buscar/reemplazar) sobre el HTML original:
 * nunca regenera el correo desde cero.
 */

import { generarTextoGemini } from "../gemini/cliente-texto.js";
import {
  asegurarHtmlEmail,
  BLOQUE_AUTO_VERIFICACION_PROMPT,
} from "./verificar-html-email.js";

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
    if (!out.includes(buscar)) {
      fallidos.push(buscar.slice(0, 80));
      continue;
    }
    // Solo la primera coincidencia por parche (cambio puntual)
    out = out.replace(buscar, p.reemplazar);
    aplicados.push(
      `«${buscar.slice(0, 60)}» → «${String(p.reemplazar).slice(0, 60)}»`,
    );
  }
  return { html: out, aplicados, fallidos };
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

  // Fragmentos útiles del HTML para que el modelo copie texto exacto a buscar
  const extractos: string[] = [];
  const h1 = htmlOriginal.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) extractos.push(`TITULAR: ${h1[1].replace(/<[^>]+>/g, "").trim()}`);
  const paras = [...htmlOriginal.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 20 && t.length < 280)
    .slice(0, 8);
  for (const p of paras) extractos.push(`TEXTO: ${p}`);

  const prompt = `Eres un editor CIRUJANO de emails HTML. NO reescribas el correo.
Solo propones reemplazos exactos (buscar → reemplazar) sobre el HTML existente.

PEDIDO DEL USUARIO:
"""
${mods.slice(0, 2500)}
"""

Asunto actual: ${asuntoActual || "(vacío)"}
Nombre interno actual: ${nombreActual || "(vacío)"}
${input.instruccionesOriginales?.trim() ? `Brief original: ${input.instruccionesOriginales.trim().slice(0, 800)}\n` : ""}

Fragmentos del HTML actual (usa estos textos EXACTOS en "buscar" cuando aplique):
${extractos.map((e) => `- ${e}`).join("\n")}

Devuelve SOLO JSON válido:
{
  "parches": [
    { "buscar": "texto EXACTO que ya existe en el HTML (sin inventar)", "reemplazar": "texto nuevo" }
  ],
  "asunto": "igual al actual salvo que el usuario pida cambiarlo",
  "nombre": "igual al actual salvo que el usuario pida cambiarlo",
  "cambiosAplicados": "resumen corto"
}

Reglas OBLIGATORIAS:
- Máximo 8 parches. Solo lo pedido.
- "buscar" DEBE ser un substring que ya existe en el HTML (copia literal).
- NUNCA devuelvas el HTML completo.
- No borres secciones (navbar, logo, blog, productos, descuento, WhatsApp, redes).
- No toques {{ contact.FIRSTNAME }}, {{ unsubscribe }} ni el <a href="{{ unsubscribe }}">.
- No introduzcas <div> con flex/grid ni placeholders [[ ]] inventados.
- Si el usuario pide cambiar asunto/nombre, hazlo en esos campos; no hace falta parche HTML.
- Sin emojis. Sin markdown.

${BLOQUE_AUTO_VERIFICACION_PROMPT}
(En este modo no entregas HTML: los parches deben dejar el mail cumpliendo esa checklist.)`;

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 0.15,
    maxOutputTokens: 2048,
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

  // Si el modelo (mal) devolvió HTML completo truncado, IGNORARLO y no destruir el mail.
  if (parsed.htmlContent && (!parsed.parches || parsed.parches.length === 0)) {
    throw new Error(
      "El ajuste intentó reescribir todo el mail. Escribe el cambio de forma más puntual (ej. «cambia el asunto a…», «en el saludo di…»).",
    );
  }

  const parches = (parsed.parches ?? []).filter(
    (p) => typeof p?.buscar === "string" && typeof p?.reemplazar === "string",
  );
  const { html: htmlParcheado, aplicados, fallidos } = aplicarParches(
    htmlOriginal,
    parches,
  );

  // Seguridad: el HTML no puede encogerse demasiado
  if (htmlParcheado.length < htmlOriginal.length * 0.55) {
    throw new Error(
      "El ajuste habría borrado demasiado contenido; no se aplicó. Intenta un cambio más específico.",
    );
  }

  let asunto = (parsed.asunto || asuntoActual || "Bodasesor").trim();
  let nombre = (parsed.nombre || nombreActual || `Bodasesor · ${asunto}`)
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim();

  // Si el usuario pidió cambio de asunto en el texto y el modelo no lo cambió, intentar detectarlo
  const mAsunto = mods.match(
    /asunto\s*(?:a|por|:)?\s*[«"']?([^«"'\n]+)[»"']?/i,
  );
  if (mAsunto?.[1] && /asunto/i.test(mods) && asunto === asuntoActual) {
    asunto = mAsunto[1].trim().slice(0, 90);
    if (!nombreActual || nombre === nombreActual) {
      nombre = (asunto.toLowerCase().startsWith("bodasesor")
        ? asunto
        : `Bodasesor · ${asunto}`
      ).slice(0, 80);
    }
  }

  if (aplicados.length === 0 && asunto === asuntoActual && fallidos.length > 0) {
    throw new Error(
      `No encontré en el mail el texto a cambiar. Sé más literal (copia una frase del preview). Falló buscar: ${fallidos[0]}`,
    );
  }

  const resumen =
    (parsed.cambiosAplicados || "").trim() ||
    (aplicados.length
      ? `Aplicados ${aplicados.length} cambio(s).`
      : asunto !== asuntoActual
        ? `Asunto actualizado a «${asunto}».`
        : "Sin cambios detectados.");

  // Capa 2: el mail ajustado debe seguir siendo válido para Brevo
  const htmlContent = asegurarHtmlEmail(htmlParcheado);

  return {
    htmlContent,
    asunto,
    nombre,
    modeloTexto: modelo,
    cambiosAplicados: resumen.slice(0, 500),
  };
}
