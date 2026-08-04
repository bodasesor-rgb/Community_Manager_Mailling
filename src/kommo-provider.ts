/**
 * Adaptador Kommo (CRM), mismo espíritu que BrevoProvider:
 * toda la lógica de Kommo vive aquí; el resto de la app solo usa la interfaz.
 *
 * Auth por entorno:
 * - KOMMO_SUBDOMAIN + KOMMO_TOKEN (preferidos)
 * - compat: KOMMO_BASE_URL / KOMMO_CLAVE_SECRETA / KOMMO_ACCESS_TOKEN
 */

export interface KommoContactoEmail {
  nombre: string;
  email: string;
}

interface KommoCustomFieldValue {
  field_code?: string;
  field_type?: string;
  field_name?: string;
  values?: Array<{
    value?: string | number | boolean;
    enum_code?: string;
    enum?: string;
  }>;
}

interface KommoContactRaw {
  id: number;
  name?: string;
  custom_fields_values?: KommoCustomFieldValue[] | null;
}

interface KommoContactsResponse {
  _embedded?: {
    contacts?: KommoContactRaw[];
  };
  _links?: {
    next?: { href?: string };
  };
}

export interface KommoProvider {
  verificarConexion(): Promise<boolean>;
  /**
   * Lista TODOS los contactos con email.
   * Omite contactos sin correo.
   */
  listarContactos(): Promise<KommoContactoEmail[]>;
}

export class KommoCrmProvider implements KommoProvider {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(opciones?: { subdomain?: string; token?: string; baseUrl?: string }) {
    const token =
      opciones?.token ??
      process.env.KOMMO_TOKEN ??
      process.env.KOMMO_ACCESS_TOKEN ??
      process.env.KOMMO_CLAVE_SECRETA ??
      "";

    const subdomain =
      opciones?.subdomain ?? process.env.KOMMO_SUBDOMAIN ?? "";

    let root = (opciones?.baseUrl ?? "").trim();
    if (!root && subdomain) {
      root = `https://${subdomain}.kommo.com`;
    }
    if (!root) {
      root = (process.env.KOMMO_BASE_URL ?? "").trim();
    }

    root = root.replace(/\/+$/, "").replace(/\/api\/v4$/i, "");

    if (!root) {
      throw new Error(
        "Kommo no configurado: define KOMMO_SUBDOMAIN (o KOMMO_BASE_URL) y KOMMO_TOKEN",
      );
    }
    if (!token) {
      throw new Error(
        "KOMMO_TOKEN no configurado (token de larga duración de Kommo)",
      );
    }

    this.baseUrl = `${root}/api/v4`;
    this.token = token;
  }

  /**
   * Helper HTTP único para llamadas a Kommo (fetch nativo).
   */
  private async request<T>(pathOrUrl: string): Promise<T> {
    const url = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `${this.baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const detalle = await response.text();
      throw new Error(
        `Kommo GET ${url} falló (${response.status}): ${detalle}`,
      );
    }

    return (await response.json()) as T;
  }

  async verificarConexion(): Promise<boolean> {
    const cuenta = await this.request<{ id?: number }>("/account");
    return Boolean(cuenta?.id ?? cuenta);
  }

  /**
   * GET /contacts?with=custom_fields_values
   * Paginado siguiendo _links.next hasta traer todos.
   */
  async listarContactos(): Promise<KommoContactoEmail[]> {
    const resultados: KommoContactoEmail[] = [];
    let siguiente: string | null =
      "/contacts?with=custom_fields_values&limit=250";

    while (siguiente) {
      const pagina: KommoContactsResponse =
        await this.request<KommoContactsResponse>(siguiente);
      const lote: KommoContactRaw[] = pagina._embedded?.contacts ?? [];

      for (const raw of lote) {
        const email = this.extraerEmail(raw);
        if (!email) {
          continue;
        }
        resultados.push({
          nombre: (raw.name ?? "").trim() || email,
          email,
        });
      }

      const nextHref: string | undefined = pagina._links?.next?.href;
      siguiente = nextHref && nextHref.length > 0 ? nextHref : null;
    }

    return resultados;
  }

  /**
   * Extrae email desde custom_fields_values.
   * Prefiere field_code EMAIL; si hay varios, WORK/PRIV primero.
   */
  private extraerEmail(raw: KommoContactRaw): string | null {
    const campos = raw.custom_fields_values ?? [];
    const emailField =
      campos.find((c) => (c.field_code ?? "").toUpperCase() === "EMAIL") ??
      campos.find((c) => (c.field_type ?? "").toLowerCase() === "multitext") ??
      campos.find((c) => (c.field_type ?? "").toLowerCase() === "email");

    if (!emailField?.values?.length) {
      return null;
    }

    const preferidos = ["WORK", "PRIV", "OTHER", "HOME"];
    const ordenados = [...emailField.values].sort((a, b) => {
      const ca = (a.enum_code ?? a.enum ?? "").toUpperCase();
      const cb = (b.enum_code ?? b.enum ?? "").toUpperCase();
      const ia = preferidos.indexOf(ca);
      const ib = preferidos.indexOf(cb);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    for (const v of ordenados) {
      if (v.value === undefined || v.value === null) {
        continue;
      }
      const email = String(v.value).trim();
      if (email.includes("@")) {
        return email;
      }
    }
    return null;
  }
}
