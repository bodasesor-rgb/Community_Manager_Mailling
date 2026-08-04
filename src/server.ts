/**
 * Servidor HTTP mínimo para Hostinger (Node nativo, sin Express/axios).
 * Integra Brevo + Gemini + Kommo.
 */

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BrevoProvider, type EmailProvider, type Remitente } from "./email-provider.js";
import {
  generarContenidoEmail,
  listarModelosGemini,
} from "./gemini/generar-contenido.js";
import {
  generarImagenEmail,
  rutaMediaSegura,
} from "./gemini/generar-imagen.js";
import { conectarAgentesSolicitados } from "./gemini/conectar.js";
import { probeModelosGemini } from "./gemini/probe.js";
import { KommoClient } from "./kommo/cliente.js";
import { sincronizarContactoKommo } from "./kommo/sincronizar.js";
import {
  generarPlantillaHtml,
  generarEmailPromocionalHtml,
  TEMAS_EJEMPLO,
  type GenerarPlantillaHtmlInput,
  type EmailPromocionalInput,
} from "./plantillas/generador.js";
import {
  crearEnvio,
  type CrearEnvioInput,
  type ModoEnvio,
} from "./servicios/crear-envio.js";
import { KommoCrmProvider } from "./kommo-provider.js";
import { syncContactosKommoBrevo } from "./servicios/sync-kommo-brevo.js";
import {
  guardarBorrador,
  listarBorradores,
  marcarAprobado,
  obtenerBorrador,
} from "./panel/borradores-store.js";
import {
  paginaContactosHtml,
  paginaCrearHtml,
  paginaInicioHtml,
  paginaPlantillasHtml,
  paginaSitioHtml,
} from "./panel/html.js";
import { BUILD_ISO, BUILD_LABEL } from "./build-info.js";
import {
  listarMedia,
  subirMediaBase64,
  type TipoMedia,
} from "./panel/media-store.js";
import { generarIdeasTemas } from "./gemini/generar-ideas.js";
import { componerEmail } from "./servicios/componer-email.js";
import {
  actualizarConocimientoParcial,
  leerConocimiento,
  sincronizarDesdeSitemap,
  type EnlaceSocial,
} from "./sitio/conocimiento.js";
import {
  guardarEnBiblioteca,
  listarPlantillasBiblioteca,
  obtenerPlantillaBiblioteca,
} from "./panel/plantillas-biblioteca.js";

const puerto = Number(process.env.PORT ?? 3000);
const provider: EmailProvider = new BrevoProvider();
/** Si está definida, las rutas de escritura exigen header x-api-key. */
const serviceApiKey = process.env.SERVICE_API_KEY;

type Json = object | unknown[] | string | number | boolean | null;

function enviarJson(
  res: http.ServerResponse,
  status: number,
  body: Json,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function leerJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw) as unknown;
}

function rutaSinQuery(url: string | undefined): string {
  if (!url) {
    return "/";
  }
  const q = url.indexOf("?");
  return q >= 0 ? url.slice(0, q) : url;
}

function requiereAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): boolean {
  if (!serviceApiKey) {
    return true;
  }
  const key = req.headers["x-api-key"];
  if (key === serviceApiKey) {
    return true;
  }
  enviarJson(res, 401, { error: "x-api-key inválida o ausente" });
  return false;
}

function remitenteDesdeEnv(): Remitente | null {
  const email = process.env.REMITENTE_EMAIL ?? process.env.BREVO_TEST_SENDER_EMAIL;
  if (!email) {
    return null;
  }
  const nombre =
    process.env.REMITENTE_NOMBRE ??
    process.env.BREVO_TEST_SENDER_NAME ??
    "Bodasesor";
  return { nombre, email };
}

/** body → env → primer remitente activo de Brevo. */
async function resolverRemitente(
  parcial?: { nombre?: string; email?: string },
): Promise<Remitente | null> {
  if (parcial?.email) {
    return {
      nombre: parcial.nombre ?? "Bodasesor",
      email: parcial.email,
    };
  }
  const desdeEnv = remitenteDesdeEnv();
  if (desdeEnv) {
    return desdeEnv;
  }
  const remitentes = await provider.listarRemitentes();
  const activo = remitentes.find((r) => r.activo) ?? remitentes[0];
  if (!activo) {
    return null;
  }
  return { nombre: activo.nombre, email: activo.email };
}

function kommoOpcional(): KommoClient | null {
  if (!process.env.KOMMO_BASE_URL || !process.env.KOMMO_CLAVE_SECRETA) {
    return null;
  }
  return new KommoClient();
}

/** Base pública del request (Hostinger) para URLs de imágenes en emails. */
function baseUrlDesdeRequest(req: http.IncomingMessage): string {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  }
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    req.headers.host ??
    "localhost";
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function enviarHtml(res: http.ServerResponse, html: string): void {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(html);
}

const assetsDirCandidates = [
  path.resolve(process.cwd(), "src/panel/assets"),
  path.resolve(process.cwd(), "dist/src/panel/assets"),
  path.resolve(process.cwd(), "panel/public"),
];

async function servirAsset(
  res: http.ServerResponse,
  nombre: string,
): Promise<boolean> {
  const base = path.basename(nombre);
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) {
    return false;
  }
  for (const dir of assetsDirCandidates) {
    const archivo = path.join(dir, base);
    try {
      const bytes = await fs.readFile(archivo);
      const ext = path.extname(base).toLowerCase();
      const mime =
        ext === ".svg"
          ? "image/svg+xml; charset=utf-8"
          : ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : "application/octet-stream";
      res.writeHead(200, {
        "content-type": mime,
        "content-length": bytes.length,
        "cache-control": "public, max-age=86400",
      });
      res.end(bytes);
      return true;
    } catch {
      // prueba el siguiente directorio
    }
  }
  return false;
}

function parseListIdsEnv(): number[] | undefined {
  const raw = process.env.BREVO_DEFAULT_LIST_IDS;
  if (!raw) {
    return undefined;
  }
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ids.length > 0 ? ids : undefined;
}

const servidor = http.createServer((req, res) => {
  void (async () => {
    const method = req.method ?? "GET";
    const path = rutaSinQuery(req.url);

    try {
      // ---- Panel HTML (lo que se ve en el navegador) ----
      if (method === "GET" && path.startsWith("/assets/")) {
        const ok = await servirAsset(res, path.slice("/assets/".length));
        if (!ok) {
          enviarJson(res, 404, { error: "asset no encontrado" });
        }
        return;
      }

      if (method === "GET" && (path === "/" || path === "/panel")) {
        enviarHtml(res, paginaInicioHtml());
        return;
      }
      if (method === "GET" && path === "/panel/contactos") {
        enviarHtml(res, paginaContactosHtml());
        return;
      }
      if (method === "GET" && path === "/panel/plantillas") {
        enviarHtml(res, paginaPlantillasHtml());
        return;
      }
      if (method === "GET" && path === "/panel/crear") {
        enviarHtml(res, paginaCrearHtml());
        return;
      }
      if (method === "GET" && path === "/panel/sitio") {
        enviarHtml(res, paginaSitioHtml());
        return;
      }

      if (method === "GET" && path === "/health") {
        enviarJson(res, 200, {
          ok: true,
          servicio: "Community Manager Mailling",
          provider: "brevo",
          panel: "/panel",
          ultimaActualizacion: BUILD_LABEL,
          ultimaActualizacionIso: BUILD_ISO,
          modelos: {
            texto: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
            imagenPredict: process.env.IMAGEN_MODEL ?? "imagen-3.0-generate-002",
            imagen:
              process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image",
          },
          integraciones: {
            brevo: Boolean(process.env.BREVO_API_KEY),
            gemini: Boolean(process.env.GEMINI_API_KEY),
            kommo: Boolean(
              (process.env.KOMMO_SUBDOMAIN || process.env.KOMMO_BASE_URL) &&
                (process.env.KOMMO_TOKEN ||
                  process.env.KOMMO_CLAVE_SECRETA ||
                  process.env.KOMMO_ACCESS_TOKEN),
            ),
          },
          authRequerida: Boolean(serviceApiKey),
        });
        return;
      }

      // ---- APIs del panel ----
      if (
        (method === "POST" || method === "GET") &&
        path === "/api/sync-contactos"
      ) {
        if (method === "POST" && !requiereAuth(req, res)) return;
        const url = new URL(req.url ?? "/", "http://localhost");
        const body =
          method === "POST"
            ? ((await leerJson(req)) as { dryRun?: boolean; listIds?: number[] })
            : {};
        const dryRun =
          body.dryRun === true ||
          url.searchParams.get("dryRun") === "true" ||
          (method === "GET" && url.searchParams.get("dryRun") !== "false");
        const listIds = body.listIds ?? parseListIdsEnv();
        const reporte = await syncContactosKommoBrevo(
          new KommoCrmProvider(),
          provider,
          {
            dryRun,
            ...(listIds ? { listIds } : {}),
          },
        );
        enviarJson(res, 200, reporte);
        return;
      }

      if (method === "GET" && path === "/api/borradores") {
        const borradores = await listarBorradores();
        enviarJson(res, 200, { total: borradores.length, borradores });
        return;
      }

      if (method === "GET" && path === "/api/media") {
        const url = new URL(req.url ?? "/", "http://localhost");
        const tipo = url.searchParams.get("tipo") as TipoMedia | null;
        const items = await listarMedia(
          tipo ? { tipo } : undefined,
        );
        // Asegurar URLs absolutas para el panel / preview srcdoc
        const base = baseUrlDesdeRequest(req);
        enviarJson(res, 200, {
          total: items.length,
          items: items.map((i) => ({
            ...i,
            urlPublica: i.urlPublica.startsWith("http")
              ? i.urlPublica
              : `${base}/media/${i.archivo}`,
          })),
        });
        return;
      }

      if (method === "POST" && path === "/api/media/upload") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          dataBase64?: string;
          mimeType?: string;
          tipo?: TipoMedia;
          destino?: string;
          etiquetas?: string[];
          prompt?: string;
        };
        if (!body.dataBase64 || !body.tipo) {
          enviarJson(res, 400, { error: "dataBase64 y tipo son requeridos" });
          return;
        }
        const tiposOk: TipoMedia[] = ["logo", "hero", "producto", "otro"];
        if (!tiposOk.includes(body.tipo)) {
          enviarJson(res, 400, { error: "tipo inválido" });
          return;
        }
        try {
          const item = await subirMediaBase64({
            dataBase64: body.dataBase64,
            mimeType: body.mimeType ?? "image/png",
            tipo: body.tipo,
            baseUrl: baseUrlDesdeRequest(req),
            ...(body.destino !== undefined ? { destino: body.destino } : {}),
            ...(body.etiquetas !== undefined ? { etiquetas: body.etiquetas } : {}),
            ...(body.prompt !== undefined ? { prompt: body.prompt } : {}),
          });
          enviarJson(res, 201, { item });
        } catch (error: unknown) {
          enviarJson(res, 400, {
            error: error instanceof Error ? error.message : "upload falló",
          });
        }
        return;
      }

      if (method === "POST" && path === "/api/ideas-temas") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as { brief?: string };
        if (!body.brief?.trim()) {
          enviarJson(res, 400, { error: "brief es requerido" });
          return;
        }
        const resultado = await generarIdeasTemas(body.brief);
        enviarJson(res, 200, resultado);
        return;
      }

      if (method === "POST" && path === "/api/composer/generar") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          brief?: string;
          ideaTitulo?: string;
          destino?: string;
          logoId?: string;
          generarImagenes?: boolean;
          marca?: string;
        };
        if (!body.brief?.trim()) {
          enviarJson(res, 400, { error: "brief es requerido" });
          return;
        }
        try {
          const resultado = await componerEmail({
            brief: body.brief,
            baseUrl: baseUrlDesdeRequest(req),
            ...(body.ideaTitulo !== undefined
              ? { ideaTitulo: body.ideaTitulo }
              : {}),
            ...(body.destino !== undefined ? { destino: body.destino } : {}),
            ...(body.logoId !== undefined ? { logoId: body.logoId } : {}),
            ...(body.generarImagenes !== undefined
              ? { generarImagenes: body.generarImagenes }
              : {}),
            ...(body.marca !== undefined ? { marca: body.marca } : {}),
          });
          enviarJson(res, 200, resultado);
        } catch (error: unknown) {
          enviarJson(res, 502, {
            error: error instanceof Error ? error.message : "composer falló",
          });
        }
        return;
      }

      if (method === "GET" && path === "/api/sitio") {
        const conocimiento = await leerConocimiento();
        enviarJson(res, 200, conocimiento);
        return;
      }

      if (method === "POST" && path === "/api/sitio") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          resumen?: string;
          cotizarUrl?: string;
          blogUrl?: string;
          baseUrl?: string;
          redes?: EnlaceSocial;
          notas?: string;
        };
        const actualizado = await actualizarConocimientoParcial({
          ...(body.resumen !== undefined ? { resumen: body.resumen } : {}),
          ...(body.cotizarUrl !== undefined
            ? { cotizarUrl: body.cotizarUrl }
            : {}),
          ...(body.blogUrl !== undefined ? { blogUrl: body.blogUrl } : {}),
          ...(body.baseUrl !== undefined ? { baseUrl: body.baseUrl } : {}),
          ...(body.notas !== undefined ? { notas: body.notas } : {}),
          ...(body.redes !== undefined ? { redes: body.redes } : {}),
        });
        enviarJson(res, 200, actualizado);
        return;
      }

      if (method === "POST" && path === "/api/sitio/sync-sitemap") {
        if (!requiereAuth(req, res)) return;
        try {
          const conocimiento = await sincronizarDesdeSitemap();
          enviarJson(res, 200, {
            ok: true,
            productos: conocimiento.productos.length,
            articulosBlog: conocimiento.articulosBlog.length,
            ciudades: conocimiento.ciudades.length,
            sitemapTotalUrls: conocimiento.sitemapTotalUrls,
            sitemapSyncEn: conocimiento.sitemapSyncEn,
            conocimiento,
          });
        } catch (error: unknown) {
          enviarJson(res, 502, {
            error:
              error instanceof Error ? error.message : "sync sitemap falló",
          });
        }
        return;
      }

      if (method === "GET" && path === "/api/biblioteca") {
        const items = await listarPlantillasBiblioteca();
        enviarJson(res, 200, {
          total: items.length,
          items: items.map((i) => ({
            id: i.id,
            nombre: i.nombre,
            asunto: i.asunto,
            destino: i.destino,
            origen: i.origen,
            actualizadoEn: i.actualizadoEn,
            brevoPlantillaId: i.brevoPlantillaId ?? null,
            instrucciones: i.instrucciones ?? null,
          })),
        });
        return;
      }

      if (method === "GET" && path.startsWith("/api/biblioteca/")) {
        const id = decodeURIComponent(path.slice("/api/biblioteca/".length));
        const item = await obtenerPlantillaBiblioteca(id);
        if (!item) {
          enviarJson(res, 404, { error: "plantilla no encontrada" });
          return;
        }
        enviarJson(res, 200, item);
        return;
      }

      if (method === "POST" && path === "/api/biblioteca") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          id?: string;
          nombre?: string;
          asunto?: string;
          htmlContent?: string;
          remitente?: { nombre?: string; email?: string };
          instrucciones?: string;
          destino?: string;
          origen?: "composer" | "borrador" | "manual" | "tema";
          borradorId?: string;
        };
        if (!body.nombre || !body.asunto || !body.htmlContent) {
          enviarJson(res, 400, {
            error: "nombre, asunto y htmlContent son requeridos",
          });
          return;
        }
        const item = await guardarEnBiblioteca({
          nombre: body.nombre,
          asunto: body.asunto,
          htmlContent: body.htmlContent,
          remitente: {
            nombre: body.remitente?.nombre ?? "Bodasesor",
            email: body.remitente?.email ?? "hola@bodasesor.com",
          },
          origen: body.origen ?? "composer",
          ...(body.id !== undefined ? { id: body.id } : {}),
          ...(body.instrucciones !== undefined
            ? { instrucciones: body.instrucciones }
            : {}),
          ...(body.destino !== undefined ? { destino: body.destino } : {}),
          ...(body.borradorId !== undefined
            ? { borradorId: body.borradorId }
            : {}),
        });
        enviarJson(res, body.id ? 200 : 201, item);
        return;
      }

      if (method === "POST" && path === "/api/borradores") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          id?: string;
          nombre?: string;
          asunto?: string;
          htmlContent?: string;
          remitente?: { nombre?: string; email?: string };
        };
        if (
          !body.nombre ||
          !body.asunto ||
          !body.htmlContent ||
          !body.remitente?.nombre ||
          !body.remitente?.email
        ) {
          enviarJson(res, 400, {
            error:
              "nombre, asunto, htmlContent y remitente.{nombre,email} son requeridos",
          });
          return;
        }
        const borrador = await guardarBorrador({
          ...(body.id ? { id: body.id } : {}),
          nombre: body.nombre,
          asunto: body.asunto,
          htmlContent: body.htmlContent,
          remitente: {
            nombre: body.remitente.nombre,
            email: body.remitente.email,
          },
        });
        enviarJson(res, body.id ? 200 : 201, borrador);
        return;
      }

      if (method === "GET" && path.startsWith("/api/borradores/")) {
        const id = decodeURIComponent(path.slice("/api/borradores/".length));
        const borrador = await obtenerBorrador(id);
        if (!borrador) {
          enviarJson(res, 404, { error: "no encontrado" });
          return;
        }
        enviarJson(res, 200, borrador);
        return;
      }

      if (method === "POST" && path === "/api/plantillas/aprobar") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          borradorId?: string;
          listIds?: number[];
        };
        if (!body.borradorId) {
          enviarJson(res, 400, { error: "borradorId es requerido" });
          return;
        }
        const borrador = await obtenerBorrador(body.borradorId);
        if (!borrador) {
          enviarJson(res, 404, { error: "borrador no encontrado" });
          return;
        }
        if (borrador.estado === "aprobado") {
          enviarJson(res, 409, {
            error: "ya aprobado",
            brevoPlantillaId: borrador.brevoPlantillaId,
            brevoCampanaId: borrador.brevoCampanaId,
          });
          return;
        }
        const listIds = body.listIds ?? parseListIdsEnv();
        if (!listIds?.length) {
          enviarJson(res, 400, {
            error:
              "listIds requerido (campo del form o BREVO_DEFAULT_LIST_IDS)",
          });
          return;
        }
        const plantilla = await provider.crearPlantilla({
          nombre: borrador.nombre,
          asunto: borrador.asunto,
          htmlContent: borrador.htmlContent,
          remitente: borrador.remitente,
        });
        const campana = await provider.crearCampaña({
          nombre: `${borrador.nombre} (borrador)`,
          asunto: borrador.asunto,
          remitente: borrador.remitente,
          templateId: plantilla.id,
          listIds,
        });
        const actualizado = await marcarAprobado(
          borrador.id,
          plantilla.id,
          campana.id,
        );
        const enBiblioteca = await guardarEnBiblioteca({
          nombre: borrador.nombre,
          asunto: borrador.asunto,
          htmlContent: borrador.htmlContent,
          remitente: borrador.remitente,
          origen: "borrador",
          borradorId: borrador.id,
          brevoPlantillaId: plantilla.id,
          brevoCampanaId: campana.id,
        });
        enviarJson(res, 200, {
          ok: true,
          borrador: actualizado,
          plantillaId: plantilla.id,
          campanaId: campana.id,
          bibliotecaId: enBiblioteca.id,
        });
        return;
      }

      /** Sirve imágenes generadas por Imagen 3. */
      if (method === "GET" && path.startsWith("/media/")) {
        const nombre = path.slice("/media/".length);
        const archivo = rutaMediaSegura(nombre);
        if (!archivo) {
          enviarJson(res, 400, { error: "nombre de media inválido" });
          return;
        }
        try {
          const bytes = await fs.readFile(archivo);
          const mime = nombre.endsWith(".jpg") || nombre.endsWith(".jpeg")
            ? "image/jpeg"
            : "image/png";
          res.writeHead(200, {
            "content-type": mime,
            "content-length": bytes.length,
            "cache-control": "public, max-age=86400",
          });
          res.end(bytes);
        } catch {
          enviarJson(res, 404, { error: "media no encontrada" });
        }
        return;
      }

      if (method === "GET" && path === "/gemini/modelos") {
        const modelos = await listarModelosGemini();
        const nombres = modelos.map((m) => m.name);
        enviarJson(res, 200, {
          total: modelos.length,
          textoPreferido: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
          imagenPreferida: process.env.IMAGEN_MODEL ?? "imagen-3.0-generate-002",
          imagenLlmFallback:
            process.env.GEMINI_IMAGE_FALLBACK === "1"
              ? process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image"
              : null,
          flash20: modelos.filter((m) => m.name.includes("2.0-flash")),
          imagen: modelos.filter((m) => m.name.includes("imagen")),
          modelos: nombres,
          detalle: modelos.filter(
            (m) => m.name.includes("2.0-flash") || m.name.includes("imagen"),
          ),
          nota: "Solo se usan GEMINI_MODEL e IMAGEN_MODEL en generación. Fallback LLM de imagen requiere GEMINI_IMAGE_FALLBACK=1.",
        });
        return;
      }

      /**
       * Conexión ligera a Flash 2.0 + Imagen 3 (GET model metadata).
       * No genera copy ni imágenes.
       */
      if (method === "GET" && path === "/gemini/conectar") {
        const conexion = await conectarAgentesSolicitados();
        enviarJson(res, conexion.listos ? 200 : 503, conexion);
        return;
      }

      /**
       * Probe de generación (gasta cuota). Apagado por defecto.
       * Solo con ?ejecutar=1 y únicamente GEMINI_MODEL / IMAGEN_MODEL.
       * Preferir GET /gemini/conectar (metadata, sin gasto de generación).
       */
      if (method === "GET" && path === "/gemini/probe") {
        const urlObj = new URL(req.url ?? "/", `http://${req.headers.host}`);
        const ejecutar = urlObj.searchParams.get("ejecutar") === "1";
        const probe = await probeModelosGemini({ ejecutar });
        enviarJson(res, 200, probe);
        return;
      }

      if (method === "GET" && path === "/conexion") {
        const ok = await provider.verificarConexion();
        const kommo = kommoOpcional();
        let kommoOk: boolean | null = null;
        let kommoError: string | null = null;
        if (kommo) {
          try {
            kommoOk = await kommo.verificarConexion();
          } catch (error: unknown) {
            kommoOk = false;
            kommoError =
              error instanceof Error ? error.message : "error kommo";
          }
        }
        enviarJson(res, 200, {
          ok,
          brevo: ok,
          kommo: kommoOk,
          kommoError,
          gemini: Boolean(process.env.GEMINI_API_KEY),
        });
        return;
      }

      if (method === "GET" && path === "/remitentes") {
        const remitentes = await provider.listarRemitentes();
        enviarJson(res, 200, { total: remitentes.length, remitentes });
        return;
      }

      if (method === "GET" && path === "/contactos") {
        if (!requiereAuth(req, res)) return;
        const contactos = await provider.listarContactos();
        enviarJson(res, 200, { total: contactos.length, contactos });
        return;
      }

      if (method === "POST" && path === "/contactos/sincronizar") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          email?: string;
          atributos?: Record<string, unknown>;
          listIds?: number[];
        };
        if (!body.email) {
          enviarJson(res, 400, { error: "email es requerido" });
          return;
        }
        const resultado = await provider.sincronizarContacto({
          email: body.email,
          ...(body.atributos !== undefined ? { atributos: body.atributos } : {}),
          ...(body.listIds !== undefined ? { listIds: body.listIds } : {}),
        });
        if (resultado === null) {
          enviarJson(res, 409, {
            error: "email suprimido localmente; no se sincronizó",
          });
          return;
        }
        enviarJson(res, 200, resultado);
        return;
      }

      // ---- Gemini Flash 2.0 + Imagen 3 ----
      if (method === "POST" && path === "/contenido/generar") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          brief?: string;
          marca?: string;
          tono?: string;
          idioma?: string;
          generarImagen?: boolean;
        };
        if (!body.brief) {
          enviarJson(res, 400, { error: "brief es requerido" });
          return;
        }
        const generado = await generarContenidoEmail({
          brief: body.brief,
          baseUrl: baseUrlDesdeRequest(req),
          ...(body.marca !== undefined ? { marca: body.marca } : {}),
          ...(body.tono !== undefined ? { tono: body.tono } : {}),
          ...(body.idioma !== undefined ? { idioma: body.idioma } : {}),
          ...(body.generarImagen !== undefined
            ? { generarImagen: body.generarImagen }
            : {}),
        });
        const htmlContent = generarPlantillaHtml(generado.contenido);
        enviarJson(res, 200, {
          asunto: generado.asunto,
          modeloTexto: generado.modeloTexto,
          advertencia: generado.advertencia ?? null,
          imagePrompt: generado.imagePrompt ?? null,
          imagen: generado.imagen
            ? {
                id: generado.imagen.id,
                url: generado.imagen.urlPublica,
                modelo: generado.imagen.modelo,
              }
            : null,
          contenido: generado.contenido,
          htmlContent,
        });
        return;
      }

      if (method === "POST" && path === "/imagenes/generar") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          prompt?: string;
          aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
        };
        if (!body.prompt) {
          enviarJson(res, 400, { error: "prompt es requerido" });
          return;
        }
        const imagen = await generarImagenEmail({
          prompt: body.prompt,
          baseUrl: baseUrlDesdeRequest(req),
          ...(body.aspectRatio !== undefined
            ? { aspectRatio: body.aspectRatio }
            : {}),
        });
        enviarJson(res, 201, {
          id: imagen.id,
          url: imagen.urlPublica,
          mimeType: imagen.mimeType,
          modelo: imagen.modelo,
        });
        return;
      }

      /** Vista previa determinista (sin Gemini ni Brevo). */
      if (method === "POST" && path === "/plantillas/vista-previa") {
        const body = (await leerJson(req)) as Partial<GenerarPlantillaHtmlInput> & {
          promocional?: EmailPromocionalInput;
          tema?: string;
        };
        if (body.tema) {
          const clave = body.tema.trim().toLowerCase();
          const tema = TEMAS_EJEMPLO[clave];
          if (!tema) {
            enviarJson(res, 404, {
              error: `Tema desconocido. Disponibles: ${Object.keys(TEMAS_EJEMPLO).join(", ")}`,
            });
            return;
          }
          const htmlContent = generarEmailPromocionalHtml(tema);
          enviarJson(res, 200, {
            htmlContent,
            asunto: `Bodasesor · ${tema.destino}`,
            tema: clave,
          });
          return;
        }
        if (body.promocional?.destino && body.promocional.heroTitulo) {
          const htmlContent = generarEmailPromocionalHtml(body.promocional);
          enviarJson(res, 200, { htmlContent });
          return;
        }
        if (!body.marca || !body.titular) {
          enviarJson(res, 400, {
            error: "marca y titular, o tema, o promocional son requeridos",
          });
          return;
        }
        const htmlContent = generarPlantillaHtml({
          marca: body.marca,
          titular: body.titular,
          ...(body.apoyo !== undefined ? { apoyo: body.apoyo } : {}),
          ...(body.bloques !== undefined ? { bloques: body.bloques } : {}),
          ...(body.pie !== undefined ? { pie: body.pie } : {}),
          ...(body.colorAcento !== undefined
            ? { colorAcento: body.colorAcento }
            : {}),
          ...(body.promocional !== undefined
            ? { promocional: body.promocional }
            : {}),
        });
        enviarJson(res, 200, { htmlContent });
        return;
      }

      /** Lista temas promocionales de ejemplo (Posadas, Cancún, CDMX, GDL). */
      if (method === "GET" && path === "/api/temas") {
        enviarJson(res, 200, {
          temas: Object.entries(TEMAS_EJEMPLO).map(([id, t]) => ({
            id,
            destino: t.destino,
            heroTitulo: t.heroTitulo,
          })),
        });
        return;
      }

      /** Genera HTML promocional desde tema de ejemplo o destino libre. */
      if (method === "POST" && path === "/api/plantillas/tema") {
        const body = (await leerJson(req)) as {
          tema?: string;
          destino?: string;
          promocional?: EmailPromocionalInput;
        };
        if (body.promocional?.destino && body.promocional.heroTitulo) {
          const htmlContent = generarEmailPromocionalHtml(body.promocional);
          enviarJson(res, 200, {
            htmlContent,
            asunto: `Bodasesor · ${body.promocional.destino}`,
            nombre: `Newsletter ${body.promocional.destino}`,
          });
          return;
        }
        if (body.tema) {
          const clave = body.tema.trim().toLowerCase();
          const tema = TEMAS_EJEMPLO[clave];
          if (!tema) {
            enviarJson(res, 404, {
              error: `Tema desconocido. Disponibles: ${Object.keys(TEMAS_EJEMPLO).join(", ")}`,
            });
            return;
          }
          const htmlContent = generarEmailPromocionalHtml(tema);
          enviarJson(res, 200, {
            htmlContent,
            asunto: `Bodasesor · ${tema.destino}`,
            nombre: `Newsletter ${tema.destino}`,
            tema: clave,
          });
          return;
        }
        if (body.destino?.trim()) {
          const destino = body.destino.trim();
          const htmlContent = generarEmailPromocionalHtml({
            destino,
            heroTitulo: `${destino} te espera para celebrar`,
            heroSubtitulo: "Experiencias Bodasesor pensadas para tu evento",
          });
          enviarJson(res, 200, {
            htmlContent,
            asunto: `Bodasesor · ${destino}`,
            nombre: `Newsletter ${destino}`,
          });
          return;
        }
        enviarJson(res, 400, {
          error: "Indica tema, destino o promocional completo",
        });
        return;
      }

      if (method === "POST" && path === "/plantillas") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          nombre?: string;
          asunto?: string;
          htmlContent?: string;
          remitente?: { nombre?: string; email?: string };
        };
        const remitente = await resolverRemitente(body.remitente);
        if (!body.nombre || !body.asunto || !body.htmlContent || !remitente) {
          enviarJson(res, 400, {
            error:
              "nombre, asunto, htmlContent y remitente (o remitente Brevo activo) son requeridos",
          });
          return;
        }
        const resultado = await provider.crearPlantilla({
          nombre: body.nombre,
          asunto: body.asunto,
          htmlContent: body.htmlContent,
          remitente,
        });
        enviarJson(res, 201, resultado);
        return;
      }

      /**
       * Flujo completo:
       * - con brief → Gemini genera contenido
       * - o con contenido estructurado
       * → HTML → plantilla Brevo (modo plantilla por defecto)
       */
      if (method === "POST" && path === "/envios") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          nombre?: string;
          asunto?: string;
          brief?: string;
          remitente?: { nombre?: string; email?: string };
          contenido?: GenerarPlantillaHtmlInput;
          modo?: ModoEnvio;
          listIds?: number[];
          scheduledAt?: string;
          marca?: string;
          tono?: string;
          generarImagen?: boolean;
        };

        const remitente = await resolverRemitente(body.remitente);
        if (!remitente) {
          enviarJson(res, 400, {
            error: "No hay remitente: define REMITENTE_EMAIL o un sender en Brevo",
          });
          return;
        }

        let asunto = body.asunto;
        let contenido = body.contenido;
        let modeloTexto: string | null = null;
        let imagenUrl: string | null = null;
        let imagenModelo: string | null = null;
        let advertencia: string | null = null;

        if (!contenido && body.brief) {
          const generado = await generarContenidoEmail({
            brief: body.brief,
            baseUrl: baseUrlDesdeRequest(req),
            ...(body.marca !== undefined ? { marca: body.marca } : {}),
            ...(body.tono !== undefined ? { tono: body.tono } : {}),
            ...(body.generarImagen !== undefined
              ? { generarImagen: body.generarImagen }
              : {}),
          });
          asunto = asunto ?? generado.asunto;
          contenido = generado.contenido;
          modeloTexto = generado.modeloTexto;
          imagenUrl = generado.imagen?.urlPublica ?? null;
          imagenModelo = generado.imagen?.modelo ?? null;
          advertencia = generado.advertencia ?? null;
        }

        const nombre =
          body.nombre ?? `Envio ${new Date().toISOString()}`;

        if (!asunto || !contenido) {
          enviarJson(res, 400, {
            error: "Se requiere contenido o brief (+ asunto si no usas Gemini)",
          });
          return;
        }

        const input: CrearEnvioInput = {
          nombre,
          asunto,
          remitente,
          contenido,
          ...(body.modo !== undefined ? { modo: body.modo } : {}),
          ...(body.listIds !== undefined ? { listIds: body.listIds } : {}),
          ...(body.scheduledAt !== undefined
            ? { scheduledAt: body.scheduledAt }
            : {}),
        };

        const resultado = await crearEnvio(provider, input);
        enviarJson(res, 201, {
          modo: resultado.modo,
          plantillaId: resultado.plantilla.id,
          campanaId: resultado.campana?.id ?? null,
          asunto,
          modeloTexto,
          imagenUrl,
          imagenModelo,
          advertencia,
          htmlLength: resultado.htmlContent.length,
        });
        return;
      }

      if (method === "POST" && path === "/campanas") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          nombre?: string;
          asunto?: string;
          remitente?: { nombre?: string; email?: string };
          htmlContent?: string;
          templateId?: number;
          listIds?: number[];
          scheduledAt?: string;
        };
        const remitente = await resolverRemitente(body.remitente);
        if (!body.nombre || !body.asunto || !remitente || !body.listIds?.length) {
          enviarJson(res, 400, {
            error: "nombre, asunto, listIds y remitente son requeridos",
          });
          return;
        }

        const resultado = await provider.crearCampaña({
          nombre: body.nombre,
          asunto: body.asunto,
          remitente,
          listIds: body.listIds,
          ...(body.htmlContent !== undefined
            ? { htmlContent: body.htmlContent }
            : {}),
          ...(body.templateId !== undefined
            ? { templateId: body.templateId }
            : {}),
          ...(body.scheduledAt !== undefined
            ? { scheduledAt: body.scheduledAt }
            : {}),
        });
        enviarJson(res, 201, resultado);
        return;
      }

      // ---- Kommo ----
      if (method === "GET" && path === "/kommo/contactos") {
        if (!requiereAuth(req, res)) return;
        const kommo = kommoOpcional();
        if (!kommo) {
          enviarJson(res, 503, {
            error: "Kommo no configurado (KOMMO_BASE_URL / KOMMO_CLAVE_SECRETA)",
          });
          return;
        }
        const contactos = await kommo.listarContactos({ limit: 50, page: 1 });
        enviarJson(res, 200, { total: contactos.length, contactos });
        return;
      }

      if (method === "POST" && path === "/kommo/sincronizar") {
        if (!requiereAuth(req, res)) return;
        const kommo = kommoOpcional();
        if (!kommo) {
          enviarJson(res, 503, {
            error: "Kommo no configurado (KOMMO_BASE_URL / KOMMO_CLAVE_SECRETA)",
          });
          return;
        }
        const body = (await leerJson(req)) as {
          kommoId?: number;
          listIds?: number[];
        };
        if (!body.kommoId) {
          enviarJson(res, 400, { error: "kommoId es requerido" });
          return;
        }
        const resultado = await sincronizarContactoKommo(
          kommo,
          provider,
          body.kommoId,
          body.listIds,
        );
        enviarJson(res, resultado.sincronizado ? 200 : 409, resultado);
        return;
      }

      /**
       * Webhook genérico de Kommo.
       * Acepta { contact_id } o payloads con _embedded.contacts[0].id
       */
      if (method === "POST" && path === "/webhooks/kommo") {
        const kommo = kommoOpcional();
        if (!kommo) {
          enviarJson(res, 503, { error: "Kommo no configurado" });
          return;
        }
        const body = (await leerJson(req)) as {
          contact_id?: number;
          kommoId?: number;
          listIds?: number[];
          _embedded?: { contacts?: Array<{ id?: number }> };
        };

        const kommoId =
          body.kommoId ??
          body.contact_id ??
          body._embedded?.contacts?.[0]?.id;

        if (!kommoId) {
          enviarJson(res, 400, { error: "No se encontró contact_id en el webhook" });
          return;
        }

        const listIds = body.listIds ?? parseListIdsEnv();
        const resultado = await sincronizarContactoKommo(
          kommo,
          provider,
          kommoId,
          listIds,
        );
        enviarJson(res, 200, resultado);
        return;
      }

      if (method === "POST" && path === "/supresion") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          email?: string;
          motivo?: string;
        };
        if (!body.email) {
          enviarJson(res, 400, { error: "email es requerido" });
          return;
        }
        await provider.suprimir(body.email, body.motivo);
        enviarJson(res, 200, { ok: true });
        return;
      }

      if (method === "GET" && path.startsWith("/supresion/")) {
        if (!requiereAuth(req, res)) return;
        const email = decodeURIComponent(path.slice("/supresion/".length));
        if (!email) {
          enviarJson(res, 400, { error: "email es requerido" });
          return;
        }
        const suprimido = await provider.estaSuprimido(email);
        enviarJson(res, 200, { email, suprimido });
        return;
      }

      enviarJson(res, 404, { error: "ruta no encontrada" });
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : "error desconocido";
      enviarJson(res, 500, { error: mensaje });
    }
  })();
});

servidor.listen(puerto, () => {
  console.log(`Servidor escuchando en puerto ${puerto}`);
});
