/**
 * Generación de imágenes para emails vía Gemini API.
 * Preferencia: Imagen 3 (`imagen-3.0-generate-002`).
 * Fallback: Imagen 4 si Google ya no expone Imagen 3 en la cuenta.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface GenerarImagenInput {
  /** Prompt visual en inglés o español. */
  prompt: string;
  /** Relación de aspecto para email (16:9 o 4:3 suelen ir bien). */
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  /** Base pública opcional (ej. https://tu-app.hostingersite.com). */
  baseUrl?: string;
}

export interface ImagenGenerada {
  id: string;
  mimeType: string;
  /** Ruta local del archivo. */
  archivo: string;
  /** URL pública para insertar en el HTML del email. */
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

function modelosImagen(): string[] {
  const preferido = process.env.IMAGEN_MODEL?.trim() || "imagen-3.0-generate-002";
  return [
    ...new Set([
      preferido,
      "imagen-3.0-generate-002",
      "imagen-3.0-generate-001",
      "imagen-4.0-generate-001",
      "imagen-4.0-fast-generate-001",
    ]),
  ];
}

function mediaDir(): string {
  return process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "media");
}

function basePublica(): string {
  const raw =
    process.env.PUBLIC_BASE_URL ??
    process.env.HOSTINGER_PUBLIC_URL ??
    "";
  return raw.replace(/\/+$/, "");
}

/**
 * Genera una imagen, la guarda en disco y devuelve URL pública.
 */
export async function generarImagenEmail(
  input: GenerarImagenInput,
): Promise<ImagenGenerada> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  let ultimoError = "Imagen no respondió";

  for (const modelo of modelosImagen()) {
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
      ultimoError = `Imagen ${modelo} (${response.status}): ${data.error?.message ?? JSON.stringify(data)}`;
      if (response.status === 404) {
        continue;
      }
      throw new Error(ultimoError);
    }

    const pred = data.predictions?.[0];
    if (!pred?.bytesBase64Encoded) {
      ultimoError = `Imagen ${modelo}: ${pred?.raiFilteredReason ?? "sin bytes de imagen"}`;
      continue;
    }

    const mimeType = pred.mimeType ?? "image/png";
    const ext =
      mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
    const id = randomUUID();
    const dir = mediaDir();
    await fs.mkdir(dir, { recursive: true });
    const archivo = path.join(dir, `${id}.${ext}`);
    await fs.writeFile(archivo, Buffer.from(pred.bytesBase64Encoded, "base64"));

    const base = (input.baseUrl ?? basePublica()).replace(/\/+$/, "");
    const urlPublica = base
      ? `${base}/media/${id}.${ext}`
      : `/media/${id}.${ext}`;

    return {
      id,
      mimeType,
      archivo,
      urlPublica,
      modelo,
    };
  }

  throw new Error(ultimoError);
}

/** Resuelve un archivo de media por nombre (solo basename seguro). */
export function rutaMediaSegura(nombre: string): string | null {
  const base = path.basename(nombre);
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) {
    return null;
  }
  return path.join(mediaDir(), base);
}
