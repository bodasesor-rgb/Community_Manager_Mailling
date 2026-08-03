/**
 * Cliente Kommo (CRM).
 * Usa KOMMO_BASE_URL + KOMMO_CLAVE_SECRETA (Bearer).
 * Solo fetch nativo; sin SDKs.
 */

export interface KommoContacto {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  raw?: unknown;
}

interface KommoCustomFieldValue {
  field_code?: string;
  field_type?: string;
  values?: Array<{ value?: string | number | boolean }>;
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
  _page?: number;
  _links?: {
    next?: { href?: string };
  };
}

export class KommoClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl?: string, token?: string) {
    // Acepta https://cuenta.kommo.com o .../api/v4
    let url = (baseUrl ?? process.env.KOMMO_BASE_URL ?? "").trim();
    url = url.replace(/\/+$/, "");
    url = url.replace(/\/api\/v4$/i, "");

    const clave =
      token ??
      process.env.KOMMO_ACCESS_TOKEN ??
      process.env.KOMMO_CLAVE_SECRETA ??
      "";

    if (!url) {
      throw new Error("KOMMO_BASE_URL no configurada");
    }
    if (!clave) {
      throw new Error(
        "KOMMO_CLAVE_SECRETA / KOMMO_ACCESS_TOKEN no configurada",
      );
    }
    this.baseUrl = url;
    this.token = clave;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const detalle = await response.text();
      const pista =
        response.status === 401
          ? " (usa un long-lived token de Kommo en KOMMO_CLAVE_SECRETA; la clave secreta de webhook no sirve para la API)"
          : "";
      throw new Error(
        `Kommo GET ${path} falló (${response.status}): ${detalle}${pista}`,
      );
    }

    return (await response.json()) as T;
  }

  /** Verifica que el token responda (GET /api/v4/account). */
  async verificarConexion(): Promise<boolean> {
    const cuenta = await this.request<{ id?: number }>("/api/v4/account");
    return Boolean(cuenta?.id ?? cuenta);
  }

  /**
   * Lista contactos (paginado).
   * limit máximo típico de Kommo: 250.
   */
  async listarContactos(opciones?: {
    limit?: number;
    page?: number;
    query?: string;
  }): Promise<KommoContacto[]> {
    const limit = opciones?.limit ?? 50;
    const page = opciones?.page ?? 1;
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });
    if (opciones?.query) {
      params.set("query", opciones.query);
    }

    const data = await this.request<KommoContactsResponse>(
      `/api/v4/contacts?${params.toString()}`,
    );

    return (data._embedded?.contacts ?? []).map((c) => this.mapear(c));
  }

  /** Obtiene un contacto por id. */
  async obtenerContacto(id: number): Promise<KommoContacto> {
    const raw = await this.request<KommoContactRaw>(`/api/v4/contacts/${id}`);
    return this.mapear(raw);
  }

  private mapear(raw: KommoContactRaw): KommoContacto {
    return {
      id: raw.id,
      nombre: raw.name ?? "",
      email: this.extraerCampo(raw, "EMAIL") ?? this.extraerPorTipo(raw, "email"),
      telefono:
        this.extraerCampo(raw, "PHONE") ?? this.extraerPorTipo(raw, "phone"),
      raw,
    };
  }

  private extraerCampo(
    raw: KommoContactRaw,
    fieldCode: string,
  ): string | null {
    const campos = raw.custom_fields_values ?? [];
    const campo = campos.find(
      (c) => (c.field_code ?? "").toUpperCase() === fieldCode.toUpperCase(),
    );
    const valor = campo?.values?.[0]?.value;
    return valor === undefined || valor === null ? null : String(valor);
  }

  private extraerPorTipo(
    raw: KommoContactRaw,
    fieldType: string,
  ): string | null {
    const campos = raw.custom_fields_values ?? [];
    const campo = campos.find(
      (c) => (c.field_type ?? "").toLowerCase() === fieldType.toLowerCase(),
    );
    const valor = campo?.values?.[0]?.value;
    return valor === undefined || valor === null ? null : String(valor);
  }
}
