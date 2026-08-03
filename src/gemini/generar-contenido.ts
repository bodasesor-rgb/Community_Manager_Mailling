/**
 * Generación de contenido de email con Gemini Flash 2.0 (+ fallback si Google lo bloquea).
 * Imágenes: Imagen 3 (con fallback a Imagen 4).
 */

import type { GenerarPlantillaHtmlInput } from "../plantillas/generador.js";
import { generarImagenEmail, type ImagenGenerada } from "./generar-imagen.js";
import { candidatosTexto } from "./probe.js";

export interface GenerarContenidoInput {
  brief: string;
  marca?: string;
  tono?: string;
  idioma?: string;
  /** Default true: genera hero con Imagen. */
  generarImagen?: boolean;
  baseUrl?: string;
}

export interface ContenidoGenerado {
  asunto: string;
  contenido: GenerarPlantillaHtmlInput;
  modeloTexto: string;
  imagen?: ImagenGenerada;
  imagePrompt?: string;
  /** Aviso si no se pudo usar exactamente Flash 2.0 / Imagen 3. */
  advertencia?: string;
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
  const quiereImagen = input.generarImagen !== false;

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
  "pie": "texto legal corto de baja/comunidad",
  "imagePrompt": "English visual prompt for a tasteful email hero image related to the brief, no text in the image, wedding/community lifestyle aesthetic"
}

Reglas:
- Máximo 3 bloques de texto y 1 CTA.
- No inventes URLs inventadas de dominios raros; usa https://bodasesor.com si no hay URL en el brief.
- Sin emojis.
- Contenido útil y concreto para community management / bodas.
- imagePrompt siempre en inglés, concreto y fotográfico.`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  let ultimoError = "Gemini no respondió";
  for (const modelo of candidatosTexto()) {
    // Probar v1beta y v1: algunas cuentas aún sirven 2.0 solo en una versión.
    for (const apiVersion of ["v1beta", "v1"] as const) {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as GeminiResponse;

      if (!response.ok) {
        ultimoError = `Gemini ${modelo} [${apiVersion}] (${response.status}): ${data.error?.message ?? JSON.stringify(data)}`;
        if (response.status === 404) {
          continue;
        }
        // Otros errores (quota, safety): no tiene sentido seguir con el mismo modelo.
        if (response.status === 429 || response.status >= 500) {
          continue;
        }
        break;
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
        imagePrompt?: string;
      };

      if (!parsed.asunto || !parsed.titular) {
        throw new Error("Gemini devolvió JSON incompleto (faltan asunto/titular)");
      }

      const bloques = [...(parsed.bloques ?? [])];
      let imagen: ImagenGenerada | undefined;
      const imagePrompt = parsed.imagePrompt?.trim();
      const advertencias: string[] = [];

      if (!modelo.startsWith("gemini-2.0-flash")) {
        advertencias.push(
          `Se pidió gemini-2.0-flash pero Google rechazó generateContent; se usó ${modelo}.`,
        );
      }

      if (quiereImagen && imagePrompt) {
        imagen = await generarImagenEmail({
          prompt: imagePrompt,
          aspectRatio: "16:9",
          ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
        });
        if (!imagen.modelo.startsWith("imagen-3")) {
          advertencias.push(
            `Se pidió Imagen 3 pero no está disponible en la cuenta; se usó ${imagen.modelo}.`,
          );
        }
        bloques.unshift({
          tipo: "imagen",
          url: imagen.urlPublica,
          alt: parsed.titular,
        });
      }

      return {
        asunto: parsed.asunto,
        modeloTexto: modelo,
        ...(imagePrompt ? { imagePrompt } : {}),
        ...(imagen ? { imagen } : {}),
        ...(advertencias.length > 0
          ? { advertencia: advertencias.join(" ") }
          : {}),
        contenido: {
          marca: parsed.marca ?? marca,
          titular: parsed.titular,
          ...(parsed.apoyo !== undefined ? { apoyo: parsed.apoyo } : {}),
          bloques,
          ...(parsed.pie !== undefined ? { pie: parsed.pie } : {}),
        },
      };
    }
  }

  throw new Error(ultimoError);
}

export async function listarModelosGemini(): Promise<
  Array<{ name: string; methods: string[] }>
> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
  );
  const data = (await response.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      `No se pudieron listar modelos Gemini: ${data.error?.message ?? response.status}`,
    );
  }
  return (data.models ?? [])
    .map((m) => ({
      name: (m.name ?? "").replace(/^models\//, ""),
      methods: m.supportedGenerationMethods ?? [],
    }))
    .filter((m) => m.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

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
