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
  /** Default false: no gasta Imagen salvo que lo pidas explícito. */
  generarImagen?: boolean;
  baseUrl?: string;
  /** Contexto del sitio (productos, blog, redes) inyectado al prompt. */
  contextoSitio?: string;
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
  const quiereImagen = input.generarImagen === true;

  const contextoSitio = input.contextoSitio?.trim()
    ? `\nConocimiento del sitio web (usa URLs reales cuando menciones productos, blog o redes):\n"""\n${input.contextoSitio.trim().slice(0, 6000)}\n"""\n`
    : "";

  const prompt = `Eres copywriter de emails promocionales para "${marca}" (bodas y eventos en México).
Idioma: ${idioma}. Tono: ${tono}, cálido y elegante (sin emojis).

El usuario escribió INSTRUCCIONES EN LENGUAJE NATURAL (no HTML). Tú las conviertes en el contenido estructurado del email; otro módulo arma el HTML de la plantilla.
Instrucciones del usuario:
"""
${input.brief}
"""
${contextoSitio}
Devuelve SOLO un JSON válido (sin markdown) con esta forma exacta:
{
  "asunto": "asunto corto del email (máx 60 caracteres)",
  "marca": "${marca}",
  "titular": "titular hero corto",
  "apoyo": "subtítulo hero corto",
  "destino": "ciudad o tema principal",
  "saludo": "2-3 frases. Debe incluir exactamente {{ contact.FIRSTNAME }} al inicio",
  "ctaTexto": "texto del botón (ej. Cotizar mi evento)",
  "productos": [
    { "titulo": "servicio/producto 1", "descripcion": "1-2 frases", "url": "https://bodasesor.com/..." },
    { "titulo": "servicio/producto 2", "descripcion": "1-2 frases", "url": "https://bodasesor.com/..." },
    { "titulo": "servicio/producto 3", "descripcion": "1-2 frases", "url": "https://bodasesor.com/..." }
  ],
  "testimonial": { "cita": "frase de cliente", "autor": "Nombre y Nombre" },
  "blog": { "titulo": "título de artículo", "extracto": "1-2 frases", "url": "https://bodasesor.com/blog/..." },
  "urgencia": "frase corta de escasez / reserva",
  "pie": "texto legal corto de comunidad",
  "imagePrompt": "English visual prompt for a tasteful wedding/event hero photo, no text in the image"
}

Reglas:
- Interpreta el brief como pedidos en palabras normales (qué contar, a quién, qué ofrecer).
- Exactamente 3 productos; preferir nombres y URLs del conocimiento del sitio si existen.
- Sin emojis. No inventes dominios raros: solo bodasesor.com o las URLs del conocimiento.
- Mantén {{ contact.FIRSTNAME }} literal en el saludo.
- imagePrompt en inglés, fotográfico.`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  // Solo el modelo configurado (GEMINI_MODEL) — sin cascada que gaste cuota.
  const modelo = candidatosTexto()[0]!;
  const apiVersion = "v1beta";
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(
      `Gemini ${modelo} [${apiVersion}] (${response.status}): ${data.error?.message ?? JSON.stringify(data)}`,
    );
  }

  const texto = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!texto) {
    throw new Error(`Gemini ${modelo} no devolvió contenido`);
  }

  const parsed = JSON.parse(limpiarJson(texto)) as {
    asunto?: string;
    marca?: string;
    titular?: string;
    apoyo?: string;
    destino?: string;
    saludo?: string;
    ctaTexto?: string;
    productos?: Array<{ titulo?: string; descripcion?: string; url?: string }>;
    testimonial?: { cita?: string; autor?: string };
    blog?: { titulo?: string; extracto?: string; url?: string };
    urgencia?: string;
    bloques?: GenerarPlantillaHtmlInput["bloques"];
    pie?: string;
    imagePrompt?: string;
  };

  if (!parsed.asunto || !parsed.titular) {
    throw new Error("Gemini devolvió JSON incompleto (faltan asunto/titular)");
  }

  let imagen: ImagenGenerada | undefined;
  const imagePrompt = parsed.imagePrompt?.trim();
  const advertencias: string[] = [];

  if (quiereImagen && imagePrompt) {
    imagen = await generarImagenEmail({
      prompt: imagePrompt,
      aspectRatio: "16:9",
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
    });
    const pedidoImagen =
      process.env.IMAGEN_MODEL?.trim() || "imagen-3.0-generate-002";
    if (imagen.modelo !== pedidoImagen) {
      advertencias.push(
        `Se usó modelo de imagen ${imagen.modelo} (configurado: ${pedidoImagen}).`,
      );
    }
  }

  const destino =
    parsed.destino?.trim() ||
    extraerDestinoDelBrief(input.brief) ||
    "tu destino";

  const productos = (parsed.productos ?? [])
    .filter((p) => p.titulo && p.descripcion)
    .slice(0, 3)
    .map((p, i) => ({
      titulo: p.titulo as string,
      descripcion: p.descripcion as string,
      foto: `[[FOTO_PRODUCTO_${i + 1}]]`,
      ...(p.url ? { url: p.url } : {}),
    }));

  const promocional = {
    destino,
    heroTitulo: parsed.titular,
    ...(parsed.apoyo !== undefined ? { heroSubtitulo: parsed.apoyo } : {}),
    ...(parsed.saludo !== undefined ? { saludo: parsed.saludo } : {}),
    ...(parsed.ctaTexto !== undefined ? { ctaTexto: parsed.ctaTexto } : {}),
    ...(productos.length > 0 ? { productos } : {}),
    ...(parsed.testimonial?.cita && parsed.testimonial.autor
      ? {
          testimonial: {
            cita: parsed.testimonial.cita,
            autor: parsed.testimonial.autor,
          },
        }
      : {}),
    ...(parsed.blog?.titulo && parsed.blog.extracto
      ? {
          blog: {
            titulo: parsed.blog.titulo,
            extracto: parsed.blog.extracto,
            url: parsed.blog.url ?? "[[ENLACE_BLOG]]",
          },
        }
      : {}),
    ...(parsed.urgencia !== undefined ? { urgencia: parsed.urgencia } : {}),
    ...(parsed.pie !== undefined ? { pieLegal: parsed.pie } : {}),
    ...(imagen
      ? { heroFoto: imagen.urlPublica }
      : { heroFoto: "[[FOTO_HERO]]" }),
  };

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
      ...(parsed.pie !== undefined ? { pie: parsed.pie } : {}),
      promocional,
    },
  };
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

/** Heurística simple si Gemini no devolvió destino. */
function extraerDestinoDelBrief(brief: string): string | undefined {
  const m = brief.match(
    /\b(Posadas|Canc[uú]n|Ciudad de M[eé]xico|CDMX|Guadalajara|Playa del Carmen|M[eé]rida|Puebla|Monterrey|Oaxaca|Tulum)\b/i,
  );
  return m?.[1];
}
