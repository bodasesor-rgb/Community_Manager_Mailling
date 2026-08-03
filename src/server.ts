/**
 * Servidor HTTP mínimo para Hostinger (Node nativo, sin Express/axios).
 * Integra Brevo + Gemini + Kommo.
 */

import http from "node:http";
import { BrevoProvider, type EmailProvider, type Remitente } from "./email-provider.js";
import { generarContenidoEmail } from "./gemini/generar-contenido.js";
import { KommoClient } from "./kommo/cliente.js";
import { sincronizarContactoKommo } from "./kommo/sincronizar.js";
import {
  generarPlantillaHtml,
  type GenerarPlantillaHtmlInput,
} from "./plantillas/generador.js";
import {
  crearEnvio,
  type CrearEnvioInput,
  type ModoEnvio,
} from "./servicios/crear-envio.js";

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

const servidor = http.createServer((req, res) => {
  void (async () => {
    const method = req.method ?? "GET";
    const path = rutaSinQuery(req.url);

    try {
      if (method === "GET" && (path === "/" || path === "/health")) {
        enviarJson(res, 200, {
          ok: true,
          servicio: "Community Manager Mailling",
          provider: "brevo",
          integraciones: {
            brevo: Boolean(process.env.BREVO_API_KEY),
            gemini: Boolean(process.env.GEMINI_API_KEY),
            kommo: Boolean(
              process.env.KOMMO_BASE_URL && process.env.KOMMO_CLAVE_SECRETA,
            ),
          },
          authRequerida: Boolean(serviceApiKey),
        });
        return;
      }

      if (method === "GET" && path === "/conexion") {
        const ok = await provider.verificarConexion();
        const kommo = kommoOpcional();
        let kommoOk: boolean | null = null;
        if (kommo) {
          try {
            kommoOk = await kommo.verificarConexion();
          } catch {
            kommoOk = false;
          }
        }
        enviarJson(res, 200, {
          ok,
          brevo: ok,
          kommo: kommoOk,
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

      // ---- Gemini ----
      if (method === "POST" && path === "/contenido/generar") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          brief?: string;
          marca?: string;
          tono?: string;
          idioma?: string;
        };
        if (!body.brief) {
          enviarJson(res, 400, { error: "brief es requerido" });
          return;
        }
        const generado = await generarContenidoEmail({
          brief: body.brief,
          ...(body.marca !== undefined ? { marca: body.marca } : {}),
          ...(body.tono !== undefined ? { tono: body.tono } : {}),
          ...(body.idioma !== undefined ? { idioma: body.idioma } : {}),
        });
        const htmlContent = generarPlantillaHtml(generado.contenido);
        enviarJson(res, 200, {
          asunto: generado.asunto,
          contenido: generado.contenido,
          htmlContent,
        });
        return;
      }

      /** Vista previa determinista (sin Gemini ni Brevo). */
      if (method === "POST" && path === "/plantillas/vista-previa") {
        const body = (await leerJson(req)) as Partial<GenerarPlantillaHtmlInput>;
        if (!body.marca || !body.titular) {
          enviarJson(res, 400, { error: "marca y titular son requeridos" });
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
        });
        enviarJson(res, 200, { htmlContent });
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

        if (!contenido && body.brief) {
          const generado = await generarContenidoEmail({
            brief: body.brief,
            ...(body.marca !== undefined ? { marca: body.marca } : {}),
            ...(body.tono !== undefined ? { tono: body.tono } : {}),
          });
          asunto = asunto ?? generado.asunto;
          contenido = generado.contenido;
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

servidor.listen(puerto, () => {
  console.log(`Servidor escuchando en puerto ${puerto}`);
});
