/**
 * Rutas de datos durables en Hostinger.
 * Por defecto vive en $HOME/bodasesor-mail-data (fuera del checkout git),
 * para que un redeploy no borre plantillas, media ni conocimiento.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

let migracionHecha = false;

/** Directorio raíz de datos persistentes. */
export function dataDir(): string {
  const fromEnv = process.env.DATA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const home = process.env.HOME?.trim();
  if (home) {
    return path.join(home, "bodasesor-mail-data");
  }

  // Fallback local / sin HOME
  return path.resolve(process.cwd(), "data");
}

export function mediaDirPersistente(): string {
  const fromEnv = process.env.MEDIA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(dataDir(), "media");
}

export function rutaDatos(...partes: string[]): string {
  return path.join(dataDir(), ...partes);
}

export function rutasPersistencia(): {
  dataDir: string;
  mediaDir: string;
  borradores: string;
  biblioteca: string;
  mediaLibrary: string;
  sitio: string;
  reglas: string;
  suprimidos: string;
} {
  return {
    dataDir: dataDir(),
    mediaDir: mediaDirPersistente(),
    borradores:
      process.env.BORRADORES_PATH?.trim() ||
      rutaDatos("borradores.json"),
    biblioteca:
      process.env.PLANTILLAS_BIBLIOTECA_PATH?.trim() ||
      rutaDatos("plantillas-biblioteca.json"),
    mediaLibrary:
      process.env.MEDIA_LIBRARY_PATH?.trim() ||
      rutaDatos("media-library.json"),
    sitio:
      process.env.SITIO_CONOCIMIENTO_PATH?.trim() ||
      rutaDatos("sitio-conocimiento.json"),
    reglas:
      process.env.REGLAS_COMPOSER_PATH?.trim() ||
      rutaDatos("reglas-composer.json"),
    suprimidos:
      process.env.SUPRIMIDOS_PATH?.trim() ||
      rutaDatos("suprimidos.json"),
  };
}

async function existe(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copiarSiFalta(origen: string, destino: string): Promise<void> {
  if (!(await existe(origen))) return;
  if (await existe(destino)) return;
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.copyFile(origen, destino);
}

async function copiarDirSiFalta(
  origen: string,
  destino: string,
): Promise<void> {
  if (!(await existe(origen))) return;
  await fs.mkdir(destino, { recursive: true });
  const entradas = await fs.readdir(origen, { withFileTypes: true });
  for (const e of entradas) {
    const from = path.join(origen, e.name);
    const to = path.join(destino, e.name);
    if (e.isDirectory()) {
      await copiarDirSiFalta(from, to);
    } else if (!(await existe(to))) {
      await fs.copyFile(from, to);
    }
  }
}

/**
 * Copia datos del viejo `cwd/data` y `cwd/media` a la carpeta durable
 * la primera vez (si el destino aún no los tiene).
 */
export async function asegurarPersistencia(): Promise<void> {
  if (migracionHecha) return;
  migracionHecha = true;

  const rutas = rutasPersistencia();
  await fs.mkdir(rutas.dataDir, { recursive: true });
  await fs.mkdir(rutas.mediaDir, { recursive: true });

  const viejoData = path.resolve(process.cwd(), "data");
  const viejoMedia = path.resolve(process.cwd(), "media");

  // Solo migrar si el dataDir durable no es el mismo que cwd/data
  if (path.resolve(rutas.dataDir) !== path.resolve(viejoData)) {
    await copiarSiFalta(
      path.join(viejoData, "borradores.json"),
      rutas.borradores,
    );
    await copiarSiFalta(
      path.join(viejoData, "plantillas-biblioteca.json"),
      rutas.biblioteca,
    );
    await copiarSiFalta(
      path.join(viejoData, "media-library.json"),
      rutas.mediaLibrary,
    );
    await copiarSiFalta(
      path.join(viejoData, "sitio-conocimiento.json"),
      rutas.sitio,
    );
    await copiarSiFalta(
      path.join(viejoData, "reglas-composer.json"),
      rutas.reglas,
    );
  }

  if (path.resolve(rutas.mediaDir) !== path.resolve(viejoMedia)) {
    await copiarDirSiFalta(viejoMedia, rutas.mediaDir);
  }

  const viejoSuprimidos = path.resolve(process.cwd(), "suprimidos.json");
  if (path.resolve(rutas.suprimidos) !== viejoSuprimidos) {
    await copiarSiFalta(viejoSuprimidos, rutas.suprimidos);
  }
}
