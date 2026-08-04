/**
 * Ajustes puntuales sobre un mail ya generado.
 * No regenera todo: aplica solo los cambios que pide el usuario.
 */

import { generarTextoGemini } from "../gemini/cliente-texto.js";
import { leerReglasComposer } from "../panel/reglas-composer.js";

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

function limpiarHtml(texto: string): string {
  let t = texto.trim();
  t = t.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "");
  const start = t.search(/<!DOCTYPE html|<html[\s>]/i);
  if (start > 0) t = t.slice(start);
  const end = t.toLowerCase().lastIndexOf("</html>");
  if (end >= 0) t = t.slice(0, end + "</html>".length);
  return t.trim();
}

function limpiarJson(texto: string): string {
  return texto
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function ajustarEmail(
  input: AjustarEmailInput,
): Promise<AjustarEmailResultado> {
  const mods = input.modificaciones.trim();
  if (!mods) {
    throw new Error("Escribe qué quieres modificar");
  }
  const html = input.htmlContent.trim();
  if (!html || html.length < 40) {
    throw new Error("Primero genera un borrador para poder ajustar");
  }

  const reglas = await leerReglasComposer();
  const asuntoActual = (input.asunto || "").trim();
  const nombreActual = (input.nombre || "").trim();

  const prompt = `Eres editor de emails HTML de Bodasesor. Debes aplicar SOLO cambios puntuales.

MODIFICACIONES QUE PIDE EL USUARIO (obedécelas al pie de la letra):
"""
${mods.slice(0, 3000)}
"""

${input.instruccionesOriginales?.trim() ? `Contexto original del mail:\n"""\n${input.instruccionesOriginales.trim().slice(0, 1500)}\n"""\n` : ""}
Reglas estructurales a preservar (no las rompas salvo que el usuario lo pida):
"""
${reglas.texto.slice(0, 2500)}
"""

Asunto actual: ${asuntoActual || "(vacío)"}
Nombre interno actual: ${nombreActual || "(vacío)"}

HTML actual del email:
"""
${html.slice(0, 120000)}
"""

Devuelve SOLO un JSON válido (sin markdown) con esta forma:
{
  "htmlContent": "<!DOCTYPE html>...HTML completo actualizado...",
  "asunto": "asunto (cámbialo solo si el usuario lo pidió; si no, deja el mismo)",
  "nombre": "nombre interno (cámbialo solo si el usuario lo pidió; si no, deja el mismo)",
  "cambiosAplicados": "lista corta de lo que cambiaste"
}

Reglas de edición:
- Cambia ÚNICAMENTE lo que el usuario pidió. No reescribas el mail completo ni inventes secciones nuevas.
- Conserva navbar, logo, blog, productos, descuento MAILING10, botón WhatsApp verde y estilos inline, salvo que el usuario pida lo contrario.
- Mantén tablas y CSS inline compatibles con Brevo/email.
- No uses emojis.
- htmlContent debe ser el documento HTML completo (empieza con <!DOCTYPE html> o <html>).`;

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 0.25,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  });

  let parsed: {
    htmlContent?: string;
    asunto?: string;
    nombre?: string;
    cambiosAplicados?: string;
  };
  try {
    parsed = JSON.parse(limpiarJson(texto)) as typeof parsed;
  } catch {
    // Si el modelo devolvió HTML crudo, úsalo como ajuste.
    const htmlOnly = limpiarHtml(texto);
    if (htmlOnly.toLowerCase().includes("<html")) {
      return {
        htmlContent: htmlOnly,
        asunto: asuntoActual || "Bodasesor",
        nombre: nombreActual || asuntoActual || "Bodasesor",
        modeloTexto: modelo,
        cambiosAplicados: mods.slice(0, 200),
      };
    }
    throw new Error("No se pudo interpretar el ajuste de la IA");
  }

  const htmlNuevo = limpiarHtml(parsed.htmlContent || "");
  if (!htmlNuevo.toLowerCase().includes("<html")) {
    throw new Error("El ajuste no devolvió HTML válido");
  }

  const asunto = (parsed.asunto || asuntoActual || "Bodasesor").trim();
  const nombre = (parsed.nombre || nombreActual || `Bodasesor · ${asunto}`)
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim();

  return {
    htmlContent: htmlNuevo,
    asunto,
    nombre,
    modeloTexto: modelo,
    cambiosAplicados:
      (parsed.cambiosAplicados || mods).trim().slice(0, 500),
  };
}
