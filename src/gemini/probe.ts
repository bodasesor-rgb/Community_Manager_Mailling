/**
 * Modelos Gemini: prioriza Flash-Lite (el más barato usable con keys nuevas).
 * Remapea 2.0/2.5 (bloqueados) y 3.5 Flash (caro) → 3.1 Flash-Lite.
 */

export interface ProbeModeloResultado {
  modelo: string;
  ok: boolean;
  status?: number;
  detalle?: string;
}

/**
 * Más económico disponible para keys nuevas (~$0.25 / $1.50 por 1M tokens).
 * 3.5 Flash cuesta ~6× más en input y ~6× en output.
 */
const TEXTO_DEFAULT = "gemini-3.1-flash-lite";

/** Modelos retirados, bloqueados o demasiado caros → Lite económico. */
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
  // Si Hostinger aún tiene 3.5 Flash, bajar a Lite.
  "gemini-3.5-flash": TEXTO_DEFAULT,
  "gemini-3.6-flash": TEXTO_DEFAULT,
  "gemini-flash-latest": TEXTO_DEFAULT,
};

/** Solo Lite en fallbacks (no subir a Flash completo). */
const TEXTO_FALLBACKS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];

/** Modelo de texto activo (respeta GEMINI_MODEL, corrige retirados). */
export function modeloTextoActivo(): string {
  const pedido = process.env.GEMINI_MODEL?.trim() || TEXTO_DEFAULT;
  return TEXTO_REEMPLAZO[pedido] ?? pedido;
}

/** Texto: modelo activo + fallbacks modernos (sin duplicados). */
export function candidatosTexto(): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const m of [modeloTextoActivo(), ...TEXTO_FALLBACKS]) {
    if (!vistos.has(m)) {
      vistos.add(m);
      out.push(m);
    }
  }
  return out;
}

/** Imagen predict: únicamente IMAGEN_MODEL (default imagen-3.0-generate-002). */
export function candidatosImagenPredict(): string[] {
  return [process.env.IMAGEN_MODEL?.trim() || "imagen-3.0-generate-002"];
}

/**
 * Imagen vía generateContent: solo si GEMINI_IMAGE_FALLBACK=1
 * (apagado por defecto para no gastar en modelos extra).
 */
export function candidatosImagenLlm(): string[] {
  if (process.env.GEMINI_IMAGE_FALLBACK?.trim() !== "1") {
    return [];
  }
  return [
    process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image",
  ];
}

/** @deprecated usar candidatosImagenPredict */
export function candidatosImagen(): string[] {
  return candidatosImagenPredict();
}

/**
 * Probe caro (generate/predict reales). Solo corre con `ejecutar: true`.
 * Prueba ÚNICAMENTE los modelos configurados en env — nunca una lista larga.
 */
export async function probeModelosGemini(opciones?: {
  ejecutar?: boolean;
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
        "Probe de generación desactivado (gasta cuota). Usa GET /gemini/conectar (metadata gratis) o /gemini/probe?ejecutar=1 solo si lo necesitas. Solo se probarían GEMINI_MODEL e IMAGEN_MODEL.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const texto: ProbeModeloResultado[] = [];
  for (const modelo of candidatosTexto()) {
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
    nota: "Probe limitado a modelos de env (GEMINI_MODEL / IMAGEN_MODEL [/ GEMINI_IMAGE_MODEL si GEMINI_IMAGE_FALLBACK=1]).",
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
