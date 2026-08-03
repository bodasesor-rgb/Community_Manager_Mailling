/**
 * Servidor HTTP mínimo para Hostinger (Node nativo, sin Express/axios).
 * Expone la interfaz EmailProvider por HTTP.
 */

import http from "node:http";
import { BrevoProvider, type EmailProvider } from "./email-provider.js";

const puerto = Number(process.env.PORT ?? 3000);
const provider: EmailProvider = new BrevoProvider();

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
        });
        return;
      }

      if (method === "GET" && path === "/conexion") {
        const ok = await provider.verificarConexion();
        enviarJson(res, 200, { ok });
        return;
      }

      if (method === "GET" && path === "/contactos") {
        const contactos = await provider.listarContactos();
        enviarJson(res, 200, { total: contactos.length, contactos });
        return;
      }

      if (method === "POST" && path === "/contactos/sincronizar") {
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

      if (method === "POST" && path === "/plantillas") {
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

      if (method === "POST" && path === "/supresion") {
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
