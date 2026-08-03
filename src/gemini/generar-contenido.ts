/**
 * Generación de contenido de email con Gemini Flash 2.0.
 * Las imágenes se generan aparte con Imagen 3.
 * Vive FUERA de email-provider: Brevo solo recibe HTML listo.
 */

import type { GenerarPlantillaHtmlInput } from "../plantillas/generador.js";
import { generarImagenEmail, type ImagenGenerada } from "./generar-imagen.js";

export interface GenerarContenidoInput {
  /** Tema o brief del correo. */
  brief: string;
  /** Marca / producto. */
  marca?: string;
  /** Tono opcional (cercano, formal, etc.). */
  tono?: string;
  /** Idioma de salida. */
  idioma?: string;
  /** Si true, genera una imagen hero con Imagen 3 e la inserta. */
  generarImagen?: boolean;
  /** Base pública para URLs de /media en el HTML. */
  baseUrl?: string;
}

export interface ContenidoGenerado {
  asunto: string;
  contenido: GenerarPlantillaHtmlInput;
  /** Modelo de texto usado. */
  modeloTexto: string;
  /** Imagen generada (si se pidió). */
  imagen?: ImagenGenerada;
  /** Prompt visual usado con Imagen 3. */
  imagePrompt?: string;
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

/**
 * Gemini Flash 2.0 (pedido del proyecto).
 * Si el alias exacto no está disponible en la cuenta, prueba variantes 2.0.
 */
function modelosTexto(): string[] {
  const preferido = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const candidatos = [
    preferido,
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
  ];
  return [...new Set(candidatos)];
}

/**
 * Llama a Gemini Flash 2.0 y devuelve asunto + contenido estructurado.
 * Opcionalmente genera imagen con Imagen 3.
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
  const quiereImagen = input.generarImagen !== false; // por defecto sí

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

  let ultimoError = "Gemini Flash 2.0 no respondió";
  for (const modelo of modelosTexto()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      ultimoError = `Gemini ${modelo} (${response.status}): ${data.error?.message ?? JSON.stringify(data)}`;
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
      imagePrompt?: string;
    };

    if (!parsed.asunto || !parsed.titular) {
      throw new Error("Gemini devolvió JSON incompleto (faltan asunto/titular)");
    }

    const bloques = [...(parsed.bloques ?? [])];
    let imagen: ImagenGenerada | undefined;
    const imagePrompt = parsed.imagePrompt?.trim();

    if (quiereImagen && imagePrompt) {
      imagen = await generarImagenEmail({
        prompt: imagePrompt,
        aspectRatio: "16:9",
        ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
      });
      // Inserta la imagen al inicio del cuerpo del email.
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
      contenido: {
        marca: parsed.marca ?? marca,
        titular: parsed.titular,
        ...(parsed.apoyo !== undefined ? { apoyo: parsed.apoyo } : {}),
        bloques,
        ...(parsed.pie !== undefined ? { pie: parsed.pie } : {}),
      },
    };
  }

  throw new Error(
    `${ultimoError}. Configura GEMINI_MODEL=gemini-2.0-flash si tu cuenta aún lo expone.`,
  );
}

/** Lista modelos visibles para esta API key (diagnóstico). */
export async function listarModelosGemini(): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
  );
  const data = (await response.json()) as {
    models?: Array<{ name?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      `No se pudieron listar modelos Gemini: ${data.error?.message ?? response.status}`,
    );
  }
  return (data.models ?? [])
    .map((m) => (m.name ?? "").replace(/^models\//, ""))
    .filter(Boolean)
    .sort();
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
