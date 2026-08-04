/**
 * Ideas de temas para el composer (solo texto, barato).
 */

import { generarTextoGemini } from "./cliente-texto.js";

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

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 0.8,
    maxOutputTokens: 1024,
    responseMimeType: "application/json",
  });

  const limpio = texto
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(limpio) as { ideas?: IdeaTema[] };
  const ideas = (parsed.ideas ?? [])
    .filter((i) => i.titulo && i.destino)
    .slice(0, 4);
  if (ideas.length === 0) {
    throw new Error("Gemini no devolvió ideas válidas");
  }
  return { ideas, modelo };
}
