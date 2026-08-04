/**
 * Biblioteca permanente de plantillas HTML en el proyecto.
 * Sobrevive aparte de Brevo; se puede reutilizar y re-subir.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface PlantillaBiblioteca {
  id: string;
  nombre: string;
  asunto: string;
  htmlContent: string;
  remitente: { nombre: string; email: string };
  /** Instrucciones originales en lenguaje natural (si hubo). */
  instrucciones?: string;
  destino?: string;
  creadoEn: string;
  actualizadoEn: string;
  origen: "composer" | "borrador" | "manual" | "tema";
  brevoPlantillaId?: number;
  brevoCampanaId?: number;
  borradorId?: string;
}

function archivoBiblioteca(): string {
  return (
    process.env.PLANTILLAS_BIBLIOTECA_PATH ??
    path.resolve(process.cwd(), "data", "plantillas-biblioteca.json")
  );
}

async function leerTodos(): Promise<PlantillaBiblioteca[]> {
  try {
    const raw = await fs.readFile(archivoBiblioteca(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlantillaBiblioteca[]) : [];
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

async function escribirTodos(items: PlantillaBiblioteca[]): Promise<void> {
  const archivo = archivoBiblioteca();
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  await fs.writeFile(archivo, JSON.stringify(items, null, 2), "utf8");
}

export async function listarPlantillasBiblioteca(): Promise<PlantillaBiblioteca[]> {
  return (await leerTodos()).sort((a, b) =>
    b.actualizadoEn.localeCompare(a.actualizadoEn),
  );
}

export async function obtenerPlantillaBiblioteca(
  id: string,
): Promise<PlantillaBiblioteca | null> {
  return (await leerTodos()).find((p) => p.id === id) ?? null;
}

export async function guardarEnBiblioteca(input: {
  id?: string;
  nombre: string;
  asunto: string;
  htmlContent: string;
  remitente: { nombre: string; email: string };
  instrucciones?: string;
  destino?: string;
  origen: PlantillaBiblioteca["origen"];
  brevoPlantillaId?: number;
  brevoCampanaId?: number;
  borradorId?: string;
}): Promise<PlantillaBiblioteca> {
  const todos = await leerTodos();
  const ahora = new Date().toISOString();

  if (input.id) {
    const idx = todos.findIndex((p) => p.id === input.id);
    if (idx >= 0) {
      const actualizado: PlantillaBiblioteca = {
        ...todos[idx],
        nombre: input.nombre,
        asunto: input.asunto,
        htmlContent: input.htmlContent,
        remitente: input.remitente,
        actualizadoEn: ahora,
        origen: input.origen,
        ...(input.instrucciones !== undefined
          ? { instrucciones: input.instrucciones }
          : {}),
        ...(input.destino !== undefined ? { destino: input.destino } : {}),
        ...(input.brevoPlantillaId !== undefined
          ? { brevoPlantillaId: input.brevoPlantillaId }
          : {}),
        ...(input.brevoCampanaId !== undefined
          ? { brevoCampanaId: input.brevoCampanaId }
          : {}),
        ...(input.borradorId !== undefined
          ? { borradorId: input.borradorId }
          : {}),
      };
      todos[idx] = actualizado;
      await escribirTodos(todos);
      return actualizado;
    }
  }

  // Deduplicar por borradorId si existe
  if (input.borradorId) {
    const idx = todos.findIndex((p) => p.borradorId === input.borradorId);
    if (idx >= 0) {
      return guardarEnBiblioteca({ ...input, id: todos[idx].id });
    }
  }

  const creado: PlantillaBiblioteca = {
    id: randomUUID(),
    nombre: input.nombre,
    asunto: input.asunto,
    htmlContent: input.htmlContent,
    remitente: input.remitente,
    creadoEn: ahora,
    actualizadoEn: ahora,
    origen: input.origen,
    ...(input.instrucciones !== undefined
      ? { instrucciones: input.instrucciones }
      : {}),
    ...(input.destino !== undefined ? { destino: input.destino } : {}),
    ...(input.brevoPlantillaId !== undefined
      ? { brevoPlantillaId: input.brevoPlantillaId }
      : {}),
    ...(input.brevoCampanaId !== undefined
      ? { brevoCampanaId: input.brevoCampanaId }
      : {}),
    ...(input.borradorId !== undefined ? { borradorId: input.borradorId } : {}),
  };
  todos.push(creado);
  await escribirTodos(todos);
  return creado;
}
