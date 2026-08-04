/**
 * Biblioteca de imágenes del panel (logos, heroes, productos).
 * Archivos en media/; metadatos en data/media-library.json.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  asegurarPersistencia,
  mediaDirPersistente,
  rutasPersistencia,
} from "../persistencia/rutas.js";

export type TipoMedia = "logo" | "hero" | "producto" | "otro";

export interface MediaItem {
  id: string;
  /** Nombre de archivo en media/ (ej. uuid.png). */
  archivo: string;
  mimeType: string;
  urlPublica: string;
  tipo: TipoMedia;
  /** Texto libre / prompt usado al generar. */
  prompt?: string;
  /** Destino o tema asociado (Posadas, Cancún…). */
  destino?: string;
  /** Palabras clave para reutilizar. */
  etiquetas: string[];
  modelo?: string;
  creadoEn: string;
}

async function archivoCatalogo(): Promise<string> {
  await asegurarPersistencia();
  return rutasPersistencia().mediaLibrary;
}

export function mediaDir(): string {
  return mediaDirPersistente();
}

function basePublica(): string {
  return (
    process.env.PUBLIC_BASE_URL ??
    process.env.HOSTINGER_PUBLIC_URL ??
    ""
  ).replace(/\/+$/, "");
}

export function urlPublicaMedia(
  archivo: string,
  baseUrl?: string,
): string {
  const base = (baseUrl ?? basePublica()).replace(/\/+$/, "");
  return base ? `${base}/media/${archivo}` : `/media/${archivo}`;
}

async function leerTodos(): Promise<MediaItem[]> {
  try {
    const raw = await fs.readFile(await archivoCatalogo(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MediaItem[]) : [];
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

async function escribirTodos(items: MediaItem[]): Promise<void> {
  const archivo = await archivoCatalogo();
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  await fs.writeFile(archivo, JSON.stringify(items, null, 2), "utf8");
}

export async function listarMedia(filtro?: {
  tipo?: TipoMedia;
}): Promise<MediaItem[]> {
  let items = await leerTodos();
  if (filtro?.tipo) {
    items = items.filter((i) => i.tipo === filtro.tipo);
  }
  return items.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function obtenerMedia(id: string): Promise<MediaItem | null> {
  const todos = await leerTodos();
  return todos.find((i) => i.id === id) ?? null;
}

export async function registrarMedia(input: {
  bytes: Buffer;
  mimeType: string;
  tipo: TipoMedia;
  prompt?: string;
  destino?: string;
  etiquetas?: string[];
  modelo?: string;
  baseUrl?: string;
  /** Reusar id de archivo ya escrito (generación Gemini). */
  archivoExistente?: string;
  idExistente?: string;
}): Promise<MediaItem> {
  const ext =
    input.mimeType.includes("jpeg") || input.mimeType.includes("jpg")
      ? "jpg"
      : input.mimeType.includes("webp")
        ? "webp"
        : input.mimeType.includes("svg")
          ? "svg"
          : "png";
  const id = input.idExistente ?? randomUUID();
  const archivo = input.archivoExistente ?? `${id}.${ext}`;
  const dir = mediaDir();
  await fs.mkdir(dir, { recursive: true });

  if (!input.archivoExistente) {
    await fs.writeFile(path.join(dir, archivo), input.bytes);
  }

  const item: MediaItem = {
    id,
    archivo,
    mimeType: input.mimeType,
    urlPublica: urlPublicaMedia(archivo, input.baseUrl),
    tipo: input.tipo,
    etiquetas: normalizarEtiquetas([
      ...(input.etiquetas ?? []),
      ...(input.destino ? [input.destino] : []),
      ...(input.prompt ? extraerPalabras(input.prompt) : []),
    ]),
    creadoEn: new Date().toISOString(),
    ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
    ...(input.destino !== undefined ? { destino: input.destino } : {}),
    ...(input.modelo !== undefined ? { modelo: input.modelo } : {}),
  };

  const todos = await leerTodos();
  const idx = todos.findIndex((t) => t.id === id);
  if (idx >= 0) {
    todos[idx] = item;
  } else {
    todos.push(item);
  }
  await escribirTodos(todos);
  return item;
}

/** Subida desde el panel (base64). */
export async function subirMediaBase64(input: {
  dataBase64: string;
  mimeType: string;
  tipo: TipoMedia;
  destino?: string;
  etiquetas?: string[];
  prompt?: string;
  baseUrl?: string;
}): Promise<MediaItem> {
  const limpio = input.dataBase64.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(limpio, "base64");
  if (bytes.length === 0) {
    throw new Error("Archivo vacío");
  }
  if (bytes.length > 8 * 1024 * 1024) {
    throw new Error("Máximo 8 MB por imagen");
  }
  return registrarMedia({
    bytes,
    mimeType: input.mimeType || "image/png",
    tipo: input.tipo,
    baseUrl: input.baseUrl,
    ...(input.destino !== undefined ? { destino: input.destino } : {}),
    ...(input.etiquetas !== undefined ? { etiquetas: input.etiquetas } : {}),
    ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
  });
}

/**
 * Busca en la biblioteca una imagen que encaje con el tema.
 * Devuelve null si no hay match razonable (mejor generar nueva).
 */
export async function buscarMediaCompatible(input: {
  tipo: TipoMedia;
  destino?: string;
  texto?: string;
  umbral?: number;
  /** IDs ya usados en el mismo mail (no repetir). */
  excluirIds?: string[];
}): Promise<MediaItem | null> {
  const excluidos = new Set(input.excluirIds ?? []);
  const items = (await listarMedia({ tipo: input.tipo })).filter(
    (i) => i.tipo === input.tipo && !excluidos.has(i.id),
  );
  if (items.length === 0) return null;

  const destino = (input.destino ?? "").toLowerCase().trim();
  const palabras = new Set(
    normalizarEtiquetas([
      ...extraerPalabras(input.texto ?? ""),
      ...extraerPalabras(destino),
    ]),
  );

  let mejor: { item: MediaItem; score: number } | null = null;
  for (const item of items) {
    let score = 0;
    if (destino && item.destino?.toLowerCase() === destino) {
      score += 5;
    } else if (
      destino &&
      item.destino &&
      (item.destino.toLowerCase().includes(destino) ||
        destino.includes(item.destino.toLowerCase()))
    ) {
      score += 3;
    }
    for (const et of item.etiquetas) {
      if (palabras.has(et.toLowerCase())) score += 1;
    }
    if (item.prompt) {
      for (const p of extraerPalabras(item.prompt)) {
        if (palabras.has(p)) score += 0.5;
      }
    }
    // Logos sin destino: reutilizables siempre
    if (input.tipo === "logo" && items.length > 0 && score === 0) {
      score = 1;
    }
    if (!mejor || score > mejor.score) {
      mejor = { item, score };
    }
  }

  const umbral = input.umbral ?? (input.tipo === "logo" ? 1 : 3);
  if (!mejor || mejor.score < umbral) return null;
  return mejor.item;
}

function extraerPalabras(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4);
}

function normalizarEtiquetas(tags: string[]): string[] {
  const set = new Set<string>();
  for (const t of tags) {
    const n = t
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim();
    if (n.length >= 2) set.add(n);
  }
  return [...set].slice(0, 24);
}
