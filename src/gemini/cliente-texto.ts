/**
 * Llamadas generateContent de texto con reintento corto si el modelo
 * está retirado / bloqueado para usuarios nuevos (404).
 */

import { candidatosTexto } from "./probe.js";

export interface GeminiGenerateResult {
  modelo: string;
  texto: string;
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

function modeloNoDisponible(status: number, message: string): boolean {
  if (status !== 404) return false;
  const m = message.toLowerCase();
  return (
    m.includes("no longer available") ||
    m.includes("not found") ||
    m.includes("is not supported")
  );
}

/** generateContent JSON/texto contra el primer modelo candidato que responda. */
export async function generarTextoGemini(opciones: {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opciones.prompt }] }],
    generationConfig: {
      temperature: opciones.temperature ?? 0.7,
      ...(opciones.maxOutputTokens
        ? { maxOutputTokens: opciones.maxOutputTokens }
        : {}),
      ...(opciones.responseMimeType
        ? { responseMimeType: opciones.responseMimeType }
        : {}),
    },
  };

  const errores: string[] = [];
  for (const modelo of candidatosTexto()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as GeminiResponse;
    const detalle = data.error?.message ?? JSON.stringify(data);

    if (!response.ok) {
      errores.push(`${modelo} (${response.status}): ${detalle}`);
      if (modeloNoDisponible(response.status, detalle)) continue;
      throw new Error(`Gemini ${modelo} [v1beta] (${response.status}): ${detalle}`);
    }

    const texto = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!texto) {
      errores.push(`${modelo}: sin contenido`);
      continue;
    }
    return { modelo, texto };
  }

  throw new Error(
    `Gemini no pudo generar texto. Intentos: ${errores.join(" · ")}`,
  );
}
