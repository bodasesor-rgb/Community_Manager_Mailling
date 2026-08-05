/**
 * Generación de contenido de email con Gemini Flash-Lite (bajo costo).
 * Imágenes: Imagen / generateContent según env.
 */

import type { GenerarPlantillaHtmlInput } from "../plantillas/generador.js";
import {
  BLOQUE_AUTO_VERIFICACION_PROMPT,
} from "../servicios/verificar-html-email.js";
import { generarTextoGemini } from "./cliente-texto.js";
import { generarImagenEmail, type ImagenGenerada } from "./generar-imagen.js";

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
  /** Reglas permanentes de estructura del correo (panel Crear). */
  reglas?: string;
}

export interface ContenidoGenerado {
  asunto: string;
  contenido: GenerarPlantillaHtmlInput;
  modeloTexto: string;
  imagen?: ImagenGenerada;
  imagePrompt?: string;
  /** Aviso si el modelo o la imagen usaron un fallback. */
  advertencia?: string;
}

export async function generarContenidoEmail(
  input: GenerarContenidoInput,
): Promise<ContenidoGenerado> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const marca = input.marca ?? "Bodasesor";
  const tono = input.tono ?? "cercano y profesional";
  const idioma = input.idioma ?? "es";
  const quiereImagen = input.generarImagen === true;

  const contextoSitio = input.contextoSitio?.trim()
    ? `\nConocimiento del sitio (URLs reales):\n"""\n${input.contextoSitio.trim().slice(0, 2800)}\n"""\n`
    : "";
  const reglasFijas = input.reglas?.trim()
    ? `\nREGLAS DE ESTRUCTURA (obligatorias; el HTML lo arma otro módulo):\n"""\n${input.reglas.trim().slice(0, 1800)}\n"""\n`
    : "";

  const prompt = `Eres copywriter de emails promocionales para "${marca}" (bodas y eventos en México).
Idioma: ${idioma}. Tono: ${tono}, cálido y elegante (sin emojis).

El usuario escribió INSTRUCCIONES EN LENGUAJE NATURAL. Tú solo devuelves TEXTOS en JSON; otro módulo arma el HTML.
Instrucciones:
"""
${input.brief}
"""
${reglasFijas}${contextoSitio}
Devuelve SOLO JSON válido:
{
  "asunto": "máx 60 caracteres, sin emojis",
  "marca": "${marca}",
  "titular": "titular corto",
  "apoyo": "subtítulo corto",
  "destino": "ciudad o tema",
  "saludo": "2-3 frases con {{ contact.FIRSTNAME }} al inicio",
  "ctaTexto": "Cotiza por WhatsApp",
  "productos": [
    { "titulo": "servicio", "descripcion": "1 frase", "url": "https://bodasesor.com/..." }
  ],
  "urgencia": "frase con código MAILING5 (5% descuento)",
  "pie": "texto legal corto",
  "imagePrompt": "English photo prompt, no text in image"
}
Incluye exactamente 8 productos en el array (el sistema los reemplaza por catálogo real).

Reglas:
- Solo textos; no generes HTML.
- Asunto derivado del brief (destino/oferta).
- Sin emojis. Solo URLs bodasesor.com.
- {{ contact.FIRSTNAME }} literal en el saludo.
- CTA exacto: «Cotiza por WhatsApp».
- Menciona MAILING5 (5%) en urgencia o saludo.
- imagePrompt en inglés, fotográfico.

${BLOQUE_AUTO_VERIFICACION_PROMPT}`;

  const { modelo, texto } = await generarTextoGemini({
    prompt,
    temperature: 0.7,
    responseMimeType: "application/json",
  });

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
    const { modeloImagenActivo } = await import("./probe.js");
    const pedidoImagen = modeloImagenActivo();
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
    .slice(0, 8)
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
