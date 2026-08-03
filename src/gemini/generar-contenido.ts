/**
 * Generación de contenido de email con Gemini.
 * Vive FUERA de email-provider: el adaptador Brevo solo recibe HTML listo.
 */

import type { GenerarPlantillaHtmlInput } from "../plantillas/generador.js";

export interface GenerarContenidoInput {
  /** Tema o brief del correo. */
  brief: string;
  /** Marca / producto. */
  marca?: string;
  /** Tono opcional (cercano, formal, etc.). */
  tono?: string;
  /** Idioma de salida. */
  idioma?: string;
}

export interface ContenidoGenerado {
  asunto: string;
  contenido: GenerarPlantillaHtmlInput;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

/** Modelos a probar en orden (el primero configurable por env). */
function modelosGemini(): string[] {
  const preferido = process.env.GEMINI_MODEL?.trim();
  const candidatos = [
    preferido,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
  ].filter((m): m is string => Boolean(m));
  return [...new Set(candidatos)];
}

/**
 * Llama a Gemini y devuelve asunto + contenido estructurado
 * listo para `generarPlantillaHtml` / `crearEnvio`.
 */
export async function generarContenidoEmail(
  input: GenerarContenidoInput,
): Promise<ContenidoGenerado> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const marca = input.marca ?? "Bodasesor";
  const tono = input.tono ?? "cercano y profesional";
  const idioma = input.idioma ?? "es";

  const prompt = `Eres copywriter de email marketing para la marca "${marca}".
Idioma: ${idioma}. Tono: ${tono}.
Brief del usuario:
"""
${input.brief}
"""

Devuelve SOLO un JSON válido (sin markdown) con esta forma exacta:
{
  "asunto": "asunto corto del email",
  "marca": "${marca}",
  "titular": "titular del email",
  "apoyo": "una frase de apoyo",
  "bloques": [
    { "tipo": "texto", "titulo": "opcional", "cuerpo": "párrafo" },
    { "tipo": "cta", "texto": "texto botón", "url": "https://bodasesor.com" }
  ],
  "pie": "texto legal corto de baja/comunidad"
}

Reglas:
- Máximo 3 bloques de texto y 1 CTA.
- No inventes URLs inventadas de dominios raros; usa https://bodasesor.com si no hay URL en el brief.
- Sin emojis.
- Contenido útil y concreto para community management / bodas.`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  let ultimoError = "Gemini no respondió";
  for (const modelo of modelosGemini()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      ultimoError = `Gemini ${modelo} (${response.status}): ${data.error?.message ?? JSON.stringify(data)}`;
      // Si el modelo no existe, probar el siguiente.
      if (response.status === 404) {
        continue;
      }
      throw new Error(ultimoError);
    }

    const texto = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!texto) {
      ultimoError = `Gemini ${modelo} no devolvió contenido`;
      continue;
    }

    const parsed = JSON.parse(limpiarJson(texto)) as {
      asunto?: string;
      marca?: string;
      titular?: string;
      apoyo?: string;
      bloques?: GenerarPlantillaHtmlInput["bloques"];
      pie?: string;
    };

    if (!parsed.asunto || !parsed.titular) {
      throw new Error("Gemini devolvió JSON incompleto (faltan asunto/titular)");
    }

    return {
      asunto: parsed.asunto,
      contenido: {
        marca: parsed.marca ?? marca,
        titular: parsed.titular,
        ...(parsed.apoyo !== undefined ? { apoyo: parsed.apoyo } : {}),
        ...(parsed.bloques !== undefined ? { bloques: parsed.bloques } : {}),
        ...(parsed.pie !== undefined ? { pie: parsed.pie } : {}),
      },
    };
  }

  throw new Error(ultimoError);
}

/** Quita fences ```json si el modelo las incluye. */
function limpiarJson(texto: string): string {
  const trimmed = texto.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }
  return trimmed;
}
