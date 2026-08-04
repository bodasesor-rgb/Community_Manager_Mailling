/**
 * Ideas de temas para el composer (solo texto, barato).
 */

import { candidatosTexto } from "./probe.js";

export interface IdeaTema {
  titulo: string;
  destino: string;
  resumen: string;
  tono: string;
}

export async function generarIdeasTemas(brief: string): Promise<{
  ideas: IdeaTema[];
  modelo: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }
  const modelo = candidatosTexto()[0]!;
  const prompt = `Eres planificador de newsletters para Bodasesor (bodas y eventos).
A partir de este brief del usuario, propón exactamente 4 ideas de tema para un email promocional.
Brief:
"""
${brief.slice(0, 2000)}
"""

Devuelve SOLO JSON válido (sin markdown):
{
  "ideas": [
    {
      "titulo": "título corto del email",
      "destino": "ciudad o eje temático",
      "resumen": "1-2 frases de ángulo creativo",
      "tono": "elegante|cálido|festivo|íntimo"
    }
  ]
}
Sin emojis. Ideas concretas y distintas entre sí.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }),
  });
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      `Gemini ideas (${response.status}): ${data.error?.message ?? "error"}`,
    );
  }
  const texto = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!texto) {
    throw new Error("Gemini no devolvió ideas");
  }
  const limpio = texto
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(limpio) as { ideas?: IdeaTema[] };
  const ideas = (parsed.ideas ?? [])
    .filter((i) => i.titulo && i.destino)
    .slice(0, 4);
  if (ideas.length === 0) {
    throw new Error("No se obtuvieron ideas válidas");
  }
  return { ideas, modelo };
}
