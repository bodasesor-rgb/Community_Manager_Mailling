/**
 * Modelos Gemini: un solo texto (Flash-Lite) y un solo Imagen predict.
 * Sin cascadas a Nano Banana / Flash completos.
 */

export interface ProbeModeloResultado {
  modelo: string;
  ok: boolean;
  status?: number;
  detalle?: string;
}

/** Único modelo de texto permitido (económico). */
export const TEXTO_DEFAULT = "gemini-3.1-flash-lite";

/** Único modelo de imagen predict (Imagen 4 Fast). */
export const IMAGEN_DEFAULT = "imagen-4.0-fast-generate-001";

/**
 * Remapea modelos caros/retirados → Flash-Lite.
 * Nunca se llama al modelo original si está en esta tabla.
 */
const TEXTO_REEMPLAZO: Record<string, string> = {
  "gemini-2.0-flash": TEXTO_DEFAULT,
  "gemini-2.0-flash-001": TEXTO_DEFAULT,
  "gemini-2.0-flash-lite": TEXTO_DEFAULT,
  "gemini-2.0-flash-lite-001": TEXTO_DEFAULT,
  "gemini-2.5-flash": TEXTO_DEFAULT,
  "gemini-2.5-flash-001": TEXTO_DEFAULT,
  "gemini-2.5-flash-lite": TEXTO_DEFAULT,
  "gemini-2.5-flash-lite-001": TEXTO_DEFAULT,
  "gemini-2.5-pro": TEXTO_DEFAULT,
  "gemini-3.5-flash": TEXTO_DEFAULT,
  "gemini-3.5-flash-lite": TEXTO_DEFAULT,
  "gemini-3.6-flash": TEXTO_DEFAULT,
  "gemini-flash-latest": TEXTO_DEFAULT,
  "gemini-flash-lite-latest": TEXTO_DEFAULT,
  // Cualquier Nano Banana / image LLM mal puesto en GEMINI_MODEL
  "gemini-2.5-flash-image": TEXTO_DEFAULT,
  "gemini-3.1-flash-image": TEXTO_DEFAULT,
  "gemini-3.1-flash-image-preview": TEXTO_DEFAULT,
  "gemini-3.1-flash-lite-image": TEXTO_DEFAULT,
};

/** Remapea Imagen 3 u otros → Imagen 4 Fast. */
const IMAGEN_REEMPLAZO: Record<string, string> = {
  "imagen-3.0-generate-002": IMAGEN_DEFAULT,
  "imagen-3.0-fast-generate-001": IMAGEN_DEFAULT,
  "imagen-3.0-generate-001": IMAGEN_DEFAULT,
};

/** Modelo de texto activo (respeta GEMINI_MODEL, corrige caros/retirados). */
export function modeloTextoActivo(): string {
  const pedido = process.env.GEMINI_MODEL?.trim() || TEXTO_DEFAULT;
  return TEXTO_REEMPLAZO[pedido] ?? pedido;
}

/**
 * Texto: SOLO el modelo activo. Sin cascada a otros Flash/Lite
 * (evita llamadas a 3.5/3.6 o “latest” que aparecen en la consola de GCP).
 */
export function candidatosTexto(): string[] {
  return [modeloTextoActivo()];
}

/** Imagen predict activo (IMAGEN_MODEL, con remap de Imagen 3 → 4). */
export function modeloImagenActivo(): string {
  const pedido = process.env.IMAGEN_MODEL?.trim() || IMAGEN_DEFAULT;
  return IMAGEN_REEMPLAZO[pedido] ?? pedido;
}

/** Imagen predict: únicamente un modelo. */
export function candidatosImagenPredict(): string[] {
  return [modeloImagenActivo()];
}

/**
 * Fallback LLM de imagen (Nano Banana, etc.): APAGADO por defecto.
 * Solo si GEMINI_IMAGE_FALLBACK=1 (no recomendado; gasta cuota extra).
 */
export function candidatosImagenLlm(): string[] {
  if (process.env.GEMINI_IMAGE_FALLBACK?.trim() !== "1") {
    return [];
  }
  const m =
    process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
  return [m];
}

/** @deprecated usar candidatosImagenPredict */
export function candidatosImagen(): string[] {
  return candidatosImagenPredict();
}

/**
 * Probe caro (generate/predict reales). Solo corre con `ejecutar: true`.
 * Prueba ÚNICAMENTE los modelos configurados — nunca una lista larga.
 */
export async function probeModelosGemini(opciones?: {
  ejecutar?: boolean;
  modelosTexto?: string[];
}): Promise<{
  ejecutado: boolean;
  texto: ProbeModeloResultado[];
  imagenPredict: ProbeModeloResultado[];
  imagenLlm: ProbeModeloResultado[];
  imagen: ProbeModeloResultado[];
  textoOk: string | null;
  imagenOk: string | null;
  nota: string;
}> {
  if (!opciones?.ejecutar) {
    return {
      ejecutado: false,
      texto: [],
      imagenPredict: [],
      imagenLlm: [],
      imagen: [],
      textoOk: null,
      imagenOk: null,
      nota:
        "Probe de generación desactivado (gasta cuota). Usa GET /gemini/conectar o /gemini/probe?ejecutar=1. Solo GEMINI_MODEL + IMAGEN_MODEL.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const texto: ProbeModeloResultado[] = [];
  const modelosTexto =
    opciones.modelosTexto && opciones.modelosTexto.length > 0
      ? opciones.modelosTexto
      : candidatosTexto();
  for (const modelo of modelosTexto) {
    texto.push(await probeGenerateContent(apiKey, modelo, false));
  }

  const imagenPredict: ProbeModeloResultado[] = [];
  for (const modelo of candidatosImagenPredict()) {
    imagenPredict.push(await probeImagenPredict(apiKey, modelo));
  }

  const imagenLlm: ProbeModeloResultado[] = [];
  for (const modelo of candidatosImagenLlm()) {
    imagenLlm.push(await probeGenerateContent(apiKey, modelo, true));
  }

  const imagen = [...imagenPredict, ...imagenLlm];
  return {
    ejecutado: true,
    texto,
    imagenPredict,
    imagenLlm,
    imagen,
    textoOk: texto.find((t) => t.ok)?.modelo ?? null,
    imagenOk:
      imagenPredict.find((t) => t.ok)?.modelo ??
      imagenLlm.find((t) => t.ok)?.modelo ??
      null,
    nota: "Probe limitado a GEMINI_MODEL / IMAGEN_MODEL (LLM imagen solo si GEMINI_IMAGE_FALLBACK=1).",
  };
}

async function probeGenerateContent(
  apiKey: string,
  modelo: string,
  conImagen = false,
): Promise<ProbeModeloResultado> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: conImagen
                ? "Generate a tiny simple icon of a white cup, no text"
                : 'Responde solo: {"ok":true}',
            },
          ],
        },
      ],
      generationConfig: conImagen
        ? { responseModalities: ["TEXT", "IMAGE"] }
        : {
            temperature: 0,
            maxOutputTokens: 32,
            responseMimeType: "application/json",
          },
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as {
      error?: { message?: string };
      candidates?: unknown[];
    };
    if (!response.ok) {
      return {
        modelo,
        ok: false,
        status: response.status,
        detalle: data.error?.message ?? "error",
      };
    }
    return { modelo, ok: true, status: response.status };
  } catch (error: unknown) {
    return {
      modelo,
      ok: false,
      detalle: error instanceof Error ? error.message : "error de red",
    };
  }
}

async function probeImagenPredict(
  apiKey: string,
  modelo: string,
): Promise<ProbeModeloResultado> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:predict?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instances: [
          { prompt: "A simple white ceramic cup on a wooden table, no text" },
        ],
        parameters: { sampleCount: 1, aspectRatio: "1:1" },
      }),
    });
    const data = (await response.json()) as {
      error?: { message?: string };
      predictions?: unknown[];
    };
    if (!response.ok) {
      return {
        modelo,
        ok: false,
        status: response.status,
        detalle: data.error?.message ?? "error",
      };
    }
    return { modelo, ok: true, status: response.status };
  } catch (error: unknown) {
    return {
      modelo,
      ok: false,
      detalle: error instanceof Error ? error.message : "error de red",
    };
  }
}
