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

  const prompt = `Eres copywriter y diseñador de emails promocionales para "${marca}" (bodas y eventos en México/Latam).
Idioma: ${idioma}. Tono: ${tono}, cálido y elegante (sin emojis).
Brief del usuario (tema / destino de la semana):
"""
${input.brief}
"""

Devuelve SOLO un JSON válido (sin markdown) con esta forma exacta:
{
  "asunto": "asunto corto del email (máx 60 caracteres)",
  "marca": "${marca}",
  "titular": "titular hero corto",
  "apoyo": "subtítulo hero corto",
  "destino": "ciudad o tema principal del brief",
  "saludo": "2-3 frases. Debe incluir exactamente {{ contact.FIRSTNAME }} al inicio (ej. Hola {{ contact.FIRSTNAME }}, ...)",
  "ctaTexto": "texto del botón (ej. Cotizar mi evento)",
  "productos": [
    { "titulo": "experiencia 1", "descripcion": "1-2 frases" },
    { "titulo": "experiencia 2", "descripcion": "1-2 frases" },
    { "titulo": "experiencia 3", "descripcion": "1-2 frases" }
  ],
  "testimonial": { "cita": "frase de cliente", "autor": "Nombre y Nombre" },
  "blog": { "titulo": "título de artículo", "extracto": "1-2 frases" },
  "urgencia": "frase corta de escasez de fechas / reserva",
  "pie": "texto legal corto de comunidad",
  "imagePrompt": "English visual prompt for a tasteful wedding/event hero photo related to the destination, no text in the image, editorial lifestyle aesthetic"
}

Reglas:
- Exactamente 3 productos.
- No inventes URLs; el HTML usará placeholders [[ENLACE_COTIZAR]], [[ENLACE_BLOG]], etc.
- Sin emojis.
- Contenido concreto para bodas/eventos en el destino del brief.
- imagePrompt siempre en inglés, concreto y fotográfico.
- Mantén saludo con la variable Brevo {{ contact.FIRSTNAME }} literal.`;

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
        destino?: string;
        saludo?: string;
        ctaTexto?: string;
        productos?: Array<{ titulo?: string; descripcion?: string }>;
        testimonial?: { cita?: string; autor?: string };
        blog?: { titulo?: string; extracto?: string };
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

      const pedidoTexto = process.env.GEMINI_MODEL?.trim();
      if (
        pedidoTexto &&
        pedidoTexto !== modelo &&
        (pedidoTexto.startsWith("gemini-2.0") ||
          pedidoTexto === "gemini-2.0-flash")
      ) {
        advertencias.push(
          `GEMINI_MODEL=${pedidoTexto} no acepta generateContent; se usó ${modelo}.`,
        );
      }

      if (quiereImagen && imagePrompt) {
        imagen = await generarImagenEmail({
          prompt: imagePrompt,
          aspectRatio: "16:9",
          ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
        });
        const pedidoImagen = process.env.IMAGEN_MODEL?.trim();
        if (
          pedidoImagen &&
          pedidoImagen.startsWith("imagen-") &&
          !imagen.modelo.startsWith("imagen-")
        ) {
          advertencias.push(
            `IMAGEN_MODEL=${pedidoImagen} no disponible; se usó ${imagen.modelo}.`,
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
                url: "[[ENLACE_BLOG]]",
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

/** Heurística simple si Gemini no devolvió destino. */
function extraerDestinoDelBrief(brief: string): string | undefined {
  const m = brief.match(
    /\b(Posadas|Canc[uú]n|Ciudad de M[eé]xico|CDMX|Guadalajara|Playa del Carmen|M[eé]rida|Puebla|Monterrey|Oaxaca|Tulum)\b/i,
  );
  return m?.[1];
}
