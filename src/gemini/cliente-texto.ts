/**
 * Llamadas generateContent de texto con reintento corto si el modelo
 * está retirado / bloqueado para usuarios nuevos (404).
 * Usa Flash-Lite y desactiva thinking facturable cuando se pueda.
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

async function llamarModelo(
  apiKey: string,
  modelo: string,
  prompt: string,
  generationConfig: Record<string, unknown>,
): Promise<{ ok: true; texto: string } | { ok: false; status: number; detalle: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });
  const data = (await response.json()) as GeminiResponse;
  const detalle = data.error?.message ?? JSON.stringify(data);
  if (!response.ok) {
    return { ok: false, status: response.status, detalle };
  }
  const texto = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!texto) {
    return { ok: false, status: 200, detalle: "sin contenido" };
  }
  return { ok: true, texto };
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

  const baseConfig: Record<string, unknown> = {
    temperature: opciones.temperature ?? 0.7,
    ...(opciones.maxOutputTokens
      ? { maxOutputTokens: opciones.maxOutputTokens }
      : {}),
    ...(opciones.responseMimeType
      ? { responseMimeType: opciones.responseMimeType }
      : {}),
  };

  const errores: string[] = [];
  for (const modelo of candidatosTexto()) {
    // 1) sin thinking facturable  2) config normal si el modelo no acepta thinkingBudget
    const configs: Array<Record<string, unknown>> = [
      { ...baseConfig, thinkingConfig: { thinkingBudget: 0 } },
      baseConfig,
    ];

    for (const generationConfig of configs) {
      const res = await llamarModelo(
        apiKey,
        modelo,
        opciones.prompt,
        generationConfig,
      );
      if (res.ok) {
        return { modelo, texto: res.texto };
      }

      errores.push(`${modelo} (${res.status}): ${res.detalle}`);
      if (/thinking/i.test(res.detalle)) continue;
      if (modeloNoDisponible(res.status, res.detalle)) break;
      if (res.status === 200) continue;
      throw new Error(
        `Gemini ${modelo} [v1beta] (${res.status}): ${res.detalle}`,
      );
    }
  }

  throw new Error(
    `Gemini no pudo generar texto. Intentos: ${errores.join(" · ")}`,
  );
}
