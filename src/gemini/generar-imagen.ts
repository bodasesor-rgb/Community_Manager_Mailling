/**
 * Generación de imágenes para emails.
 * 1) IMAGEN_MODEL (predict)
 * 2) Si falla, un solo fallback: GEMINI_IMAGE_MODEL (generateContent + IMAGE)
 *    — necesario cuando Imagen 3 no existe en la API key.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { candidatosImagenPredict } from "./probe.js";

export interface GenerarImagenInput {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  baseUrl?: string;
}

export interface ImagenGenerada {
  id: string;
  mimeType: string;
  archivo: string;
  urlPublica: string;
  modelo: string;
}

interface ImagenPredictResponse {
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
    raiFilteredReason?: string;
  }>;
  error?: { message?: string };
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        text?: string;
      }>;
    };
  }>;
  error?: { message?: string };
}

function mediaDir(): string {
  return process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "media");
}

function basePublica(): string {
  return (
    process.env.PUBLIC_BASE_URL ??
    process.env.HOSTINGER_PUBLIC_URL ??
    ""
  ).replace(/\/+$/, "");
}

async function guardarImagen(
  bytesBase64: string,
  mimeType: string,
  baseUrl: string | undefined,
  modelo: string,
): Promise<ImagenGenerada> {
  const ext =
    mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const id = randomUUID();
  const dir = mediaDir();
  await fs.mkdir(dir, { recursive: true });
  const archivo = path.join(dir, `${id}.${ext}`);
  await fs.writeFile(archivo, Buffer.from(bytesBase64, "base64"));

  const base = (baseUrl ?? basePublica()).replace(/\/+$/, "");
  const urlPublica = base
    ? `${base}/media/${id}.${ext}`
    : `/media/${id}.${ext}`;

  return { id, mimeType, archivo, urlPublica, modelo };
}

async function viaPredict(
  apiKey: string,
  modelo: string,
  input: GenerarImagenInput,
): Promise<ImagenGenerada | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:predict?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: input.prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: input.aspectRatio ?? "16:9",
        personGeneration: "allow_adult",
      },
    }),
  });
  const data = (await response.json()) as ImagenPredictResponse;
  if (!response.ok) {
    if (response.status === 404 || response.status === 400) {
      return null;
    }
    throw new Error(
      `Imagen ${modelo} (${response.status}): ${data.error?.message ?? JSON.stringify(data)}`,
    );
  }
  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) {
    return null;
  }
  return guardarImagen(
    pred.bytesBase64Encoded,
    pred.mimeType ?? "image/png",
    input.baseUrl,
    modelo,
  );
}

async function viaGenerateContentImage(
  apiKey: string,
  modelo: string,
  input: GenerarImagenInput,
): Promise<ImagenGenerada | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate one photorealistic image, no text overlays. Aspect roughly ${input.aspectRatio ?? "16:9"}. Prompt: ${input.prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });
  const data = (await response.json()) as GeminiImageResponse;
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `Image model ${modelo} (${response.status}): ${data.error?.message ?? JSON.stringify(data)}`,
    );
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) {
    return null;
  }
  return guardarImagen(
    inline.data,
    inline.mimeType ?? "image/png",
    input.baseUrl,
    modelo,
  );
}

/** Un solo modelo LLM de imagen (no cascada). */
function modeloImagenLlm(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
}

export async function generarImagenEmail(
  input: GenerarImagenInput,
): Promise<ImagenGenerada> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const errores: string[] = [];

  for (const modelo of candidatosImagenPredict()) {
    try {
      const img = await viaPredict(apiKey, modelo, input);
      if (img) {
        return img;
      }
      errores.push(`${modelo}: predict no disponible`);
    } catch (error: unknown) {
      errores.push(error instanceof Error ? error.message : String(error));
    }
  }

  const llm = modeloImagenLlm();
  try {
    const img = await viaGenerateContentImage(apiKey, llm, input);
    if (img) {
      return img;
    }
    errores.push(`${llm}: generateContent sin imagen`);
  } catch (error: unknown) {
    errores.push(error instanceof Error ? error.message : String(error));
  }

  throw new Error(
    `No se pudo generar imagen. Detalle: ${errores.slice(-3).join(" | ")}`,
  );
}

export function rutaMediaSegura(nombre: string): string | null {
  const base = path.basename(nombre);
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) {
    return null;
  }
  return path.join(mediaDir(), base);
}
