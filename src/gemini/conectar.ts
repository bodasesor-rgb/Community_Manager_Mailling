/**
 * Conexión ligera a los modelos solicitados (sin flujos de email).
 * Usa GET /models/{id} para validar acceso, sin generar copy ni imágenes.
 */

export interface ConexionModelo {
  modelo: string;
  conectado: boolean;
  status?: number;
  detalle?: string;
  methods?: string[];
}

async function getModelo(
  apiKey: string,
  modelo: string,
): Promise<ConexionModelo> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const data = (await response.json()) as {
      name?: string;
      supportedGenerationMethods?: string[];
      error?: { message?: string };
    };
    if (!response.ok) {
      return {
        modelo,
        conectado: false,
        status: response.status,
        detalle: data.error?.message ?? "no accesible",
      };
    }
    return {
      modelo,
      conectado: true,
      status: response.status,
      methods: data.supportedGenerationMethods ?? [],
    };
  } catch (error: unknown) {
    return {
      modelo,
      conectado: false,
      detalle: error instanceof Error ? error.message : "error de red",
    };
  }
}

/**
 * Verifica solo los agentes pedidos: Flash 2.0 (texto) e Imagen 3.
 * No genera contenido.
 */
export async function conectarAgentesSolicitados(): Promise<{
  apiKeyPresente: boolean;
  texto: ConexionModelo;
  imagen: ConexionModelo;
  listos: boolean;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      apiKeyPresente: false,
      texto: {
        modelo: "gemini-2.0-flash",
        conectado: false,
        detalle: "GEMINI_API_KEY no configurada",
      },
      imagen: {
        modelo: "imagen-3.0-generate-002",
        conectado: false,
        detalle: "GEMINI_API_KEY no configurada",
      },
      listos: false,
    };
  }

  const textoModelo = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const imagenModelo =
    process.env.IMAGEN_MODEL?.trim() || "imagen-3.0-generate-002";

  // Pedidos explícitos del proyecto (también probamos alias 001 de Imagen 3).
  const texto = await getModelo(apiKey, textoModelo);
  let imagen = await getModelo(apiKey, imagenModelo);
  if (!imagen.conectado && imagenModelo === "imagen-3.0-generate-002") {
    const alt = await getModelo(apiKey, "imagen-3.0-generate-001");
    if (alt.conectado) {
      imagen = alt;
    }
  }

  // Si el default operativo no es 2.0, igual reportamos el 2.0 pedido.
  let textoFlash20 = texto;
  if (textoModelo !== "gemini-2.0-flash") {
    textoFlash20 = await getModelo(apiKey, "gemini-2.0-flash");
  }

  return {
    apiKeyPresente: true,
    texto: textoFlash20.conectado ? textoFlash20 : texto,
    imagen,
    listos: (textoFlash20.conectado || texto.conectado) && imagen.conectado,
  };
}
