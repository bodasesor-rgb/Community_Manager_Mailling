import { promises as fs } from "node:fs";
import path from "node:path";
import type { ContactoSuprimido, SupresionStore } from "./tipos.js";

/**
 * Placeholder de `contactos_suprimidos` respaldado en un archivo JSON local.
 * Cuando exista base de datos, se reemplaza esta clase por una implementación
 * SQL/ORM manteniendo la misma interfaz `SupresionStore`.
 */
export class JsonSupresionStore implements SupresionStore {
  private readonly archivo: string;

  constructor(archivo?: string) {
    this.archivo =
      archivo ?? path.resolve(process.cwd(), "suprimidos.json");
  }

  async estaSuprimido(email: string): Promise<boolean> {
    const normalizado = this.normalizar(email);
    const registros = await this.leer();
    return registros.some((r) => r.email === normalizado);
  }

  async suprimir(email: string, motivo?: string): Promise<void> {
    const normalizado = this.normalizar(email);
    const registros = await this.leer();
    const existente = registros.findIndex((r) => r.email === normalizado);

    const registro: ContactoSuprimido = {
      email: normalizado,
      fecha: new Date().toISOString(),
      ...(motivo !== undefined ? { motivo } : {}),
    };

    if (existente >= 0) {
      registros[existente] = registro;
    } else {
      registros.push(registro);
    }

    await this.escribir(registros);
  }

  async listar(): Promise<ContactoSuprimido[]> {
    return this.leer();
  }

  private normalizar(email: string): string {
    return email.trim().toLowerCase();
  }

  private async leer(): Promise<ContactoSuprimido[]> {
    try {
      const raw = await fs.readFile(this.archivo, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed as ContactoSuprimido[];
    } catch (error: unknown) {
      // Si el archivo aún no existe, partimos de una lista vacía.
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

  private async escribir(registros: ContactoSuprimido[]): Promise<void> {
    const dir = path.dirname(this.archivo);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.archivo,
      JSON.stringify(registros, null, 2),
      "utf8",
    );
  }
}
