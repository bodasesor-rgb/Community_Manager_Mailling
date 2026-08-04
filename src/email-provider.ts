/**
 * Adaptador de email marketing.
 * La app solo habla con `EmailProvider`. Toda la lógica específica de Brevo
 * vive dentro de `BrevoProvider` para poder migrar a Amazon SES sin tocar
 * el resto del código.
 */

import {
  JsonSupresionStore,
  type SupresionStore,
} from "./supresion/index.js";
import { asegurarHtmlEmail } from "./servicios/verificar-html-email.js";

// ---------------------------------------------------------------------------
// Tipos públicos (contrato de la interfaz)
// ---------------------------------------------------------------------------

/** Contacto tipado tal como lo consume la app. */
export interface Contacto {
  id: number;
  email: string;
  atributos: Record<string, unknown>;
  listIds: number[];
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt?: string;
  modifiedAt?: string;
}

export interface SincronizarContactoInput {
  email: string;
  atributos?: Record<string, unknown>;
  listIds?: number[];
}

export interface Remitente {
  nombre: string;
  email: string;
}

export interface CrearPlantillaInput {
  nombre: string;
  asunto: string;
  /** HTML ya generado por otro módulo; aquí solo se sube. */
  htmlContent: string;
  remitente: Remitente;
}

export interface ActualizarPlantillaInput {
  nombre?: string;
  asunto?: string;
  htmlContent?: string;
  remitente?: Remitente;
}

export interface CrearCampañaInput {
  nombre: string;
  asunto: string;
  remitente: Remitente;
  /** Contenido HTML directo O id de plantilla (uno de los dos). */
  htmlContent?: string;
  templateId?: number;
  listIds: number[];
  /** Si viene, se agenda; si no, queda en borrador. ISO 8601. */
  scheduledAt?: string;
}

export interface IdResultado {
  id: number;
}

/** Remitente verificado en el proveedor (Brevo senders). */
export interface RemitenteVerificado {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
}

/**
 * Contrato del proveedor de email.
 * Implementaciones: Brevo hoy, Amazon SES después.
 */
export interface EmailProvider {
  /** Comprueba que la API key y la cuenta respondan. */
  verificarConexion(): Promise<boolean>;

  /** Lista remitentes verificados disponibles para enviar. */
  listarRemitentes(): Promise<RemitenteVerificado[]>;

  /** Baja TODOS los contactos (paginado en el proveedor). */
  listarContactos(): Promise<Contacto[]>;

  /**
   * Upsert de un contacto.
   * Si el email está en la lista de supresión local, NO se sincroniza.
   * Devuelve el id remoto, o null si estaba suprimido.
   */
  sincronizarContacto(input: SincronizarContactoInput): Promise<IdResultado | null>;

  /** Crea una plantilla SMTP. El htmlContent llega ya generado. */
  crearPlantilla(input: CrearPlantillaInput): Promise<IdResultado>;

  /** Actualiza una plantilla existente. */
  actualizarPlantilla(
    id: number,
    input: ActualizarPlantillaInput,
  ): Promise<void>;

  /**
   * Crea una campaña. Con `scheduledAt` se agenda; sin él, queda en borrador.
   * NO envía de forma inmediata desde este método.
   */
  crearCampaña(input: CrearCampañaInput): Promise<IdResultado>;

  /** Agrega el email a la lista de supresión LOCAL. */
  suprimir(email: string, motivo?: string): Promise<void>;

  /** Consulta la lista de supresión LOCAL. */
  estaSuprimido(email: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Tipos internos de respuesta Brevo (solo usados dentro de BrevoProvider)
// ---------------------------------------------------------------------------

interface BrevoContactoRaw {
  id: number;
  email: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  createdAt?: string;
  modifiedAt?: string;
}

interface BrevoListarContactosResponse {
  contacts?: BrevoContactoRaw[];
  count?: number;
}

interface BrevoIdResponse {
  id: number;
}

interface BrevoAccountResponse {
  email?: string;
  companyName?: string;
}

interface BrevoSenderRaw {
  id: number;
  name?: string;
  email: string;
  active?: boolean;
}

interface BrevoSendersResponse {
  senders?: BrevoSenderRaw[];
}

// ---------------------------------------------------------------------------
// Implementación Brevo
// ---------------------------------------------------------------------------

export class BrevoProvider implements EmailProvider {
  private readonly baseUrl = "https://api.brevo.com/v3";
  private readonly supresion: SupresionStore;

  constructor(supresion?: SupresionStore) {
    // Por defecto: JSON local como placeholder de `contactos_suprimidos`.
    this.supresion = supresion ?? new JsonSupresionStore();
  }

  /**
   * Helper HTTP único para TODAS las llamadas a Brevo.
   * Usa fetch nativo (Node 18+). Sin SDK, sin axios, sin node-fetch.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error(
        "BREVO_API_KEY no configurada. Define la variable de entorno antes de llamar a Brevo.",
      );
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "api-key": apiKey,
    };

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      const detalle = await response.text();
      throw new Error(
        `Brevo ${method} ${path} falló (${response.status}): ${detalle}`,
      );
    }

    // 204 / cuerpo vacío → sin payload tipado.
    if (response.status === 204) {
      return undefined as T;
    }

    const texto = await response.text();
    if (!texto) {
      return undefined as T;
    }

    return JSON.parse(texto) as T;
  }

  /** Verifica conexión contra GET /account. */
  async verificarConexion(): Promise<boolean> {
    const cuenta = await this.request<BrevoAccountResponse>("GET", "/account");
    return Boolean(cuenta);
  }

  /** Lista remitentes (GET /senders). */
  async listarRemitentes(): Promise<RemitenteVerificado[]> {
    const respuesta = await this.request<BrevoSendersResponse>(
      "GET",
      "/senders",
    );
    return (respuesta.senders ?? []).map((s) => ({
      id: s.id,
      nombre: s.name ?? s.email,
      email: s.email,
      activo: s.active ?? false,
    }));
  }

  /**
   * Lista TODOS los contactos con paginación limit=50 y offset incremental.
   */
  async listarContactos(): Promise<Contacto[]> {
    const limite = 50;
    let offset = 0;
    const todos: Contacto[] = [];

    for (;;) {
      const pagina = await this.request<BrevoListarContactosResponse>(
        "GET",
        `/contacts?limit=${limite}&offset=${offset}`,
      );

      const lote = pagina.contacts ?? [];
      for (const raw of lote) {
        todos.push(this.mapearContacto(raw));
      }

      if (lote.length < limite) {
        break;
      }

      offset += limite;
    }

    return todos;
  }

  /**
   * Upsert de contacto (POST /contacts con updateEnabled:true).
   * Si el email está en la supresión local, no se sincroniza.
   */
  async sincronizarContacto(
    input: SincronizarContactoInput,
  ): Promise<IdResultado | null> {
    if (await this.estaSuprimido(input.email)) {
      return null;
    }

    const payload: Record<string, unknown> = {
      email: input.email,
      updateEnabled: true,
    };

    if (input.atributos !== undefined) {
      payload.attributes = input.atributos;
    }

    if (input.listIds !== undefined) {
      payload.listIds = input.listIds;
    }

    // Al crear, Brevo devuelve { id }. Al actualizar, a menudo 204 sin cuerpo.
    const respuesta = await this.request<BrevoIdResponse | undefined>(
      "POST",
      "/contacts",
      payload,
    );

    if (respuesta?.id !== undefined) {
      return { id: respuesta.id };
    }

    // Actualización sin id: consultamos el contacto por email para devolver el id real.
    const existente = await this.request<BrevoContactoRaw>(
      "GET",
      `/contacts/${encodeURIComponent(input.email)}`,
    );
    return { id: existente.id };
  }

  /** Crea plantilla SMTP. htmlContent ya viene generado. */
  async crearPlantilla(input: CrearPlantillaInput): Promise<IdResultado> {
    const htmlContent = asegurarHtmlEmail(input.htmlContent);
    const respuesta = await this.request<BrevoIdResponse>(
      "POST",
      "/smtp/templates",
      {
        templateName: input.nombre,
        subject: input.asunto,
        htmlContent,
        sender: {
          name: input.remitente.nombre,
          email: input.remitente.email,
        },
        isActive: true,
      },
    );

    return { id: respuesta.id };
  }

  /** Actualiza plantilla existente (PUT /smtp/templates/{id}). */
  async actualizarPlantilla(
    id: number,
    input: ActualizarPlantillaInput,
  ): Promise<void> {
    const payload: Record<string, unknown> = {};

    if (input.nombre !== undefined) {
      payload.templateName = input.nombre;
    }
    if (input.asunto !== undefined) {
      payload.subject = input.asunto;
    }
    if (input.htmlContent !== undefined) {
      payload.htmlContent = asegurarHtmlEmail(input.htmlContent);
    }
    if (input.remitente !== undefined) {
      payload.sender = {
        name: input.remitente.nombre,
        email: input.remitente.email,
      };
    }

    await this.request<undefined>("PUT", `/smtp/templates/${id}`, payload);
  }

  /**
   * Crea campaña (POST /emailCampaigns).
   * Con scheduledAt → se agenda. Sin scheduledAt → borrador.
   */
  async crearCampaña(input: CrearCampañaInput): Promise<IdResultado> {
    if (input.htmlContent === undefined && input.templateId === undefined) {
      throw new Error(
        "crearCampaña requiere htmlContent o templateId (al menos uno).",
      );
    }

    if (input.listIds.length === 0) {
      throw new Error("crearCampaña requiere al menos un listId.");
    }

    const payload: Record<string, unknown> = {
      name: input.nombre,
      subject: input.asunto,
      sender: {
        name: input.remitente.nombre,
        email: input.remitente.email,
      },
      recipients: {
        listIds: input.listIds,
      },
    };

    if (input.templateId !== undefined) {
      payload.templateId = input.templateId;
    } else if (input.htmlContent !== undefined) {
      payload.htmlContent = asegurarHtmlEmail(input.htmlContent);
    }

    if (input.scheduledAt !== undefined) {
      // Brevo agenda la campaña cuando recibe scheduledAt.
      payload.scheduledAt = input.scheduledAt;
    }

    const respuesta = await this.request<BrevoIdResponse>(
      "POST",
      "/emailCampaigns",
      payload,
    );

    return { id: respuesta.id };
  }

  /** Suprime un email en la lista LOCAL (no en Brevo). */
  async suprimir(email: string, motivo?: string): Promise<void> {
    await this.supresion.suprimir(email, motivo);
  }

  /** Consulta la lista de supresión LOCAL. */
  async estaSuprimido(email: string): Promise<boolean> {
    return this.supresion.estaSuprimido(email);
  }

  private mapearContacto(raw: BrevoContactoRaw): Contacto {
    return {
      id: raw.id,
      email: raw.email,
      atributos: raw.attributes ?? {},
      listIds: raw.listIds ?? [],
      emailBlacklisted: raw.emailBlacklisted ?? false,
      smsBlacklisted: raw.smsBlacklisted ?? false,
      ...(raw.createdAt !== undefined ? { createdAt: raw.createdAt } : {}),
      ...(raw.modifiedAt !== undefined ? { modifiedAt: raw.modifiedAt } : {}),
    };
  }
}
