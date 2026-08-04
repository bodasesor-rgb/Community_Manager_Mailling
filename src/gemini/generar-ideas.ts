/**
 * Ideas de temas para el composer (solo texto, barato).
 * Cada llamada pide ángulos nuevos (seed aleatorio + temperatura alta
 * + exclusión de títulos recientes persistidos).
 */

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { generarTextoGemini } from "./cliente-texto.js";
import {
  asegurarPersistencia,
  rutasPersistencia,
} from "../persistencia/rutas.js";

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
  "código MAILING10 y urgencia de reserva",
  "galería real / before-after del montaje",
  "menú degustación / barras de bebidas",
  "wedding planner integral",
];

const CIUDADES_ROTACION = [
  "CDMX",
  "Cancún",
  "Guadalajara",
  "Monterrey",
  "Puebla",
  "Querétaro",
  "Valle de Bravo",
  "Los Cabos",
  "Mérida",
  "Cuernavaca",
  "San Miguel de Allende",
  "Puerto Vallarta",
];

async function leerTitulosRecientes(): Promise<string[]> {
  await asegurarPersistencia();
  try {
    const raw = await fs.readFile(rutasPersistencia().ultimasIdeas, "utf8");
    const parsed = JSON.parse(raw) as { titulos?: string[] };
    return (parsed.titulos ?? []).slice(0, 40);
  } catch {
    return [];
  }
}

async function guardarTitulosRecientes(nuevos: string[]): Promise<void> {
  await asegurarPersistencia();
  const previos = await leerTitulosRecientes();
  const unidos = [...nuevos, ...previos]
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
    .slice(0, 40);
  await fs.writeFile(
    rutasPersistencia().ultimasIdeas,
    JSON.stringify({ titulos: unidos, actualizadoEn: new Date().toISOString() }, null, 2),
    "utf8",
  );
}

function barajar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export async function generarIdeasTemas(brief: string): Promise<{
  ideas: IdeaTema[];
  modelo: string;
}> {
  const seed = randomBytes(6).toString("hex");
  const enfoques = barajar(ENFOQUES).slice(0, 3);
  const ciudades = barajar(CIUDADES_ROTACION).slice(0, 4);
  const recientes = await leerTitulosRecientes();

  const prompt = `Eres planificador creativo de newsletters para Bodasesor (bodas y eventos en México).
Genera exactamente 4 ideas NUEVAS, FRESAS y DISTINTAS entre sí.

Semilla única de esta corrida (obligatorio variar con ella): ${seed}
Timestamp: ${new Date().toISOString()}
Prioriza estos enfoques: ${enfoques.map((e) => `«${e}»`).join(", ")}.
Incluye al menos 2 de estas ciudades/ejes si el brief lo permite: ${ciudades.join(", ")}.

${
  recientes.length
    ? `PROHIBIDO repetir o parafrasear estos títulos ya usados recientemente:\n${recientes
        .slice(0, 24)
        .map((t) => `- ${t}`)
        .join("\n")}\n`
    : ""
}

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
- Prohibido títulos genéricos («Tu boda soñada», «Celebra con nosotros», «Evento perfecto»).
- Cada idea: gancho distinto (descuento, destino, servicio, temporada, emoción, galería).
- Sin emojis. Concretas y accionables.
- Si el brief ya fija ciudad/tema, varía el ÁNGULO (no copies ideas previas).`;

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 1.15,
    maxOutputTokens: 1400,
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

  await guardarTitulosRecientes(ideas.map((i) => i.titulo));
  return { ideas, modelo };
}
