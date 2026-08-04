/**
 * Ideas de temas para el composer (solo texto, barato).
 * Cada llamada pide ángulos nuevos (seed aleatorio + temperatura alta).
 */

import { randomBytes } from "node:crypto";
import { generarTextoGemini } from "./cliente-texto.js";

export interface IdeaTema {
  titulo: string;
  destino: string;
  resumen: string;
  tono: string;
}

const ENFOQUES = [
  "temporada / clima",
  "presupuesto inteligente",
  "experiencia sensorial (luz, música, flor)",
  "destino o ciudad concreta",
  "tipo de evento (boda íntima, XV, corporativo)",
  "tendencia del año",
  "últimos lugares disponibles",
  "paquete all-in-one",
  "after party / welcome dinner",
  "estilo editorial / revista",
];

export async function generarIdeasTemas(brief: string): Promise<{
  ideas: IdeaTema[];
  modelo: string;
}> {
  const seed = randomBytes(4).toString("hex");
  const enfoque =
    ENFOQUES[Math.floor(Math.random() * ENFOQUES.length)] ?? ENFOQUES[0]!;
  const enfoque2 =
    ENFOQUES[Math.floor(Math.random() * ENFOQUES.length)] ?? ENFOQUES[1]!;

  const prompt = `Eres planificador creativo de newsletters para Bodasesor (bodas y eventos en México).
Genera exactamente 4 ideas NUEVAS y DISTINTAS entre sí (y distintas a lo obvio).

Semilla de variedad (úsala para no repetir): ${seed}
Prioriza estos enfoques en al menos 2 ideas: «${enfoque}» y «${enfoque2}».

Brief del usuario:
"""
${brief.slice(0, 2000)}
"""

Devuelve SOLO JSON válido:
{
  "ideas": [
    {
      "titulo": "título corto y fresco del email",
      "destino": "ciudad o eje temático",
      "resumen": "1-2 frases de ángulo creativo único",
      "tono": "elegante|cálido|festivo|íntimo"
    }
  ]
}

Reglas:
- Prohibido repetir títulos genéricos tipo «Tu boda soñada» o «Celebra con nosotros».
- Cada idea debe tener un gancho diferente (descuento, destino, servicio, temporada, emoción).
- Sin emojis. Ideas concretas, accionables y distintas entre sí.
- Varía ciudades/servicios cuando el brief lo permita.`;

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 1.05,
    maxOutputTokens: 1200,
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
