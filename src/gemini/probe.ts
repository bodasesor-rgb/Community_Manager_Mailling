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
): Promise<ProbeModeloResultado> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: 'Responde solo: {"ok":true}' }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 32,
          responseMimeType: "application/json",
        },
      }),
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
        instances: [{ prompt: "A simple white ceramic cup on a wooden table, no text" }],
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

/** Candidatos de texto: Flash 2.0 primero, luego aliases actuales. */
export function candidatosTexto(): string[] {
  const preferido = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
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
      "gemini-2.5-flash-lite",
      "gemini-pro-latest",
    ]),
  ];
}

export function candidatosImagen(): string[] {
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

export async function probeModelosGemini(): Promise<{
  texto: ProbeModeloResultado[];
  imagen: ProbeModeloResultado[];
  textoOk: string | null;
  imagenOk: string | null;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const texto: ProbeModeloResultado[] = [];
  for (const modelo of candidatosTexto()) {
    texto.push(await probeGenerateContent(apiKey, modelo));
  }

  const imagen: ProbeModeloResultado[] = [];
  for (const modelo of candidatosImagen()) {
    imagen.push(await probeImagenPredict(apiKey, modelo));
  }

  return {
    texto,
    imagen,
    textoOk: texto.find((t) => t.ok)?.modelo ?? null,
    imagenOk: imagen.find((t) => t.ok)?.modelo ?? null,
  };
}
