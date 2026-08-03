/**
 * Servidor HTTP mínimo para Hostinger (Node nativo, sin Express/axios).
 * Expone EmailProvider + flujo de creación de envíos.
 */

import http from "node:http";
import { BrevoProvider, type EmailProvider } from "./email-provider.js";
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

function remitenteDesdeEnv(): { nombre: string; email: string } | null {
  const email = process.env.REMITENTE_EMAIL ?? process.env.BREVO_TEST_SENDER_EMAIL;
  if (!email) {
    return null;
  }
  const nombre =
    process.env.REMITENTE_NOMBRE ??
    process.env.BREVO_TEST_SENDER_NAME ??
    "Community Manager";
  return { nombre, email };
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
          authRequerida: Boolean(serviceApiKey),
        });
        return;
      }

      if (method === "GET" && path === "/conexion") {
        const ok = await provider.verificarConexion();
        enviarJson(res, 200, { ok });
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

      /** Vista previa: genera HTML sin tocar Brevo. */
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
        const resultado = await provider.crearPlantilla({
          nombre: body.nombre,
          asunto: body.asunto,
          htmlContent: body.htmlContent,
          remitente: {
            nombre: body.remitente.nombre,
            email: body.remitente.email,
          },
        });
        enviarJson(res, 201, resultado);
        return;
      }

      /**
       * Flujo de creación recomendado:
       * genera HTML → crea plantilla; opcionalmente campaña en borrador.
       * Default modo=plantilla (no crea campaña).
       */
      if (method === "POST" && path === "/envios") {
        if (!requiereAuth(req, res)) return;
        const body = (await leerJson(req)) as {
          nombre?: string;
          asunto?: string;
          remitente?: { nombre?: string; email?: string };
          contenido?: GenerarPlantillaHtmlInput;
          modo?: ModoEnvio;
          listIds?: number[];
          scheduledAt?: string;
        };

        const remitenteEnv = remitenteDesdeEnv();
        const remitente = body.remitente?.email
          ? {
              nombre: body.remitente.nombre ?? "Community Manager",
              email: body.remitente.email,
            }
          : remitenteEnv;

        if (!body.nombre || !body.asunto || !body.contenido || !remitente) {
          enviarJson(res, 400, {
            error:
              "nombre, asunto, contenido y remitente (o REMITENTE_EMAIL) son requeridos",
          });
          return;
        }

        if (!body.contenido.marca || !body.contenido.titular) {
          enviarJson(res, 400, {
            error: "contenido.marca y contenido.titular son requeridos",
          });
          return;
        }

        const input: CrearEnvioInput = {
          nombre: body.nombre,
          asunto: body.asunto,
          remitente,
          contenido: body.contenido,
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
          // No devolvemos el HTML completo en prod para no inflar logs;
          // usa /plantillas/vista-previa si lo necesitas.
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
        const remitenteEnv = remitenteDesdeEnv();
        const remitente = body.remitente?.email
          ? {
              nombre: body.remitente.nombre ?? "Community Manager",
              email: body.remitente.email,
            }
          : remitenteEnv;

        if (!body.nombre || !body.asunto || !remitente || !body.listIds?.length) {
          enviarJson(res, 400, {
            error:
              "nombre, asunto, listIds y remitente (o REMITENTE_EMAIL) son requeridos",
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
