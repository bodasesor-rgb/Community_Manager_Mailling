import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type EstadoBorrador = "borrador" | "aprobado";

export interface BorradorPlantilla {
  id: string;
  nombre: string;
  asunto: string;
  remitente: { nombre: string; email: string };
  htmlContent: string;
  estado: EstadoBorrador;
  creadoEn: string;
  actualizadoEn: string;
  brevoPlantillaId?: number;
  brevoCampanaId?: number;
}

function archivoBorradores(): string {
  return (
    process.env.BORRADORES_PATH ??
    path.resolve(process.cwd(), "data", "borradores.json")
  );
}

async function leerTodos(): Promise<BorradorPlantilla[]> {
  const archivo = archivoBorradores();
  try {
    const raw = await fs.readFile(archivo, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BorradorPlantilla[]) : [];
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

async function escribirTodos(items: BorradorPlantilla[]): Promise<void> {
  const archivo = archivoBorradores();
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  await fs.writeFile(archivo, JSON.stringify(items, null, 2), "utf8");
}

export async function listarBorradores(): Promise<BorradorPlantilla[]> {
  const todos = await leerTodos();
  return todos.sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

export async function obtenerBorrador(
  id: string,
): Promise<BorradorPlantilla | null> {
  const todos = await leerTodos();
  return todos.find((b) => b.id === id) ?? null;
}

export async function guardarBorrador(input: {
  id?: string;
  nombre: string;
  asunto: string;
  remitente: { nombre: string; email: string };
  htmlContent: string;
}): Promise<BorradorPlantilla> {
  const todos = await leerTodos();
  const ahora = new Date().toISOString();

  if (input.id) {
    const idx = todos.findIndex((b) => b.id === input.id);
    if (idx < 0) {
      throw new Error("Borrador no encontrado");
    }
    const actual = todos[idx];
    if (actual.estado === "aprobado") {
      throw new Error("El borrador ya fue aprobado; crea uno nuevo para editar");
    }
    const actualizado: BorradorPlantilla = {
      ...actual,
      nombre: input.nombre,
      asunto: input.asunto,
      remitente: input.remitente,
      htmlContent: input.htmlContent,
      actualizadoEn: ahora,
    };
    todos[idx] = actualizado;
    await escribirTodos(todos);
    return actualizado;
  }

  const creado: BorradorPlantilla = {
    id: randomUUID(),
    nombre: input.nombre,
    asunto: input.asunto,
    remitente: input.remitente,
    htmlContent: input.htmlContent,
    estado: "borrador",
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  todos.push(creado);
  await escribirTodos(todos);
  return creado;
}

export async function marcarAprobado(
  id: string,
  brevoPlantillaId: number,
  brevoCampanaId: number,
): Promise<BorradorPlantilla> {
  const todos = await leerTodos();
  const idx = todos.findIndex((b) => b.id === id);
  if (idx < 0) {
    throw new Error("Borrador no encontrado");
  }
  const actualizado: BorradorPlantilla = {
    ...todos[idx],
    estado: "aprobado",
    brevoPlantillaId,
    brevoCampanaId,
    actualizadoEn: new Date().toISOString(),
  };
  todos[idx] = actualizado;
  await escribirTodos(todos);
  return actualizado;
}
