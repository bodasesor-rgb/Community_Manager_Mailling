/**
 * Descubre qué modelos de texto/imagen responden de verdad
 * con la GEMINI_API_KEY actual (ListModels a veces lista modelos ya bloqueados).
 */

export interface ProbeModeloResultado {
  modelo: string;
  ok: boolean;
  status?: number;
  detalle?: string;
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

/**
 * Texto: intenta Flash 2.0 si se pide, pero el default operativo
 * es gemini-flash-latest (2.0 ya no acepta generateContent en cuentas nuevas).
 */
export function candidatosTexto(): string[] {
  const preferido = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
  return [
    ...new Set([
      preferido,
      "gemini-2.0-flash",
      "gemini-2.0-flash-001",
      "gemini-flash-latest",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-pro-latest",
    ]),
  ];
}

/** Familia Imagen (predict). En muchas keys nuevas ya viene bloqueada. */
export function candidatosImagenPredict(): string[] {
  const preferido = process.env.IMAGEN_MODEL?.trim() || "imagen-3.0-generate-002";
  return [
    ...new Set([
      preferido,
      "imagen-3.0-generate-002",
      "imagen-3.0-generate-001",
      "imagen-4.0-generate-001",
      "imagen-4.0-fast-generate-001",
      "imagen-4.0-ultra-generate-001",
    ]),
  ];
}

/** Reemplazo oficial de Imagen en Gemini API (generateContent + IMAGE). */
export function candidatosImagenLlm(): string[] {
  const preferido =
    process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
  return [
    ...new Set([
      preferido,
      "gemini-2.5-flash-image",
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite-image",
      "gemini-3.1-flash-image-preview",
      "gemini-3-pro-image-preview",
    ]),
  ];
}

/** @deprecated usar candidatosImagenPredict */
export function candidatosImagen(): string[] {
  return candidatosImagenPredict();
}

export async function probeModelosGemini(): Promise<{
  texto: ProbeModeloResultado[];
  imagenPredict: ProbeModeloResultado[];
  imagenLlm: ProbeModeloResultado[];
  /** Predict + LLM juntos (compat). */
  imagen: ProbeModeloResultado[];
  textoOk: string | null;
  imagenOk: string | null;
  nota: string;
}> {
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
  const imagenOk =
    imagenPredict.find((t) => t.ok)?.modelo ??
    imagenLlm.find((t) => t.ok)?.modelo ??
    null;

  return {
    texto,
    imagenPredict,
    imagenLlm,
    imagen,
    textoOk: texto.find((t) => t.ok)?.modelo ?? null,
    imagenOk,
    nota:
      "Flash 2.0 e Imagen 3/4 suelen estar retirados para cuentas nuevas aunque haya saldo. El reemplazo operativo es gemini-flash-latest + gemini-*-flash-image.",
  };
}
