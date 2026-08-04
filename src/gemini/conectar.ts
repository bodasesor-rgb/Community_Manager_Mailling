/**
 * Conexión ligera a los modelos solicitados (sin flujos de email).
 * Usa GET /models/{id} para validar acceso — NO genera copy ni imágenes (no gasta cuota de generación).
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
 * Verifica SOLO los agentes configurados en env:
 * - GEMINI_MODEL (default gemini-2.5-flash; 2.0-flash se remapea porque Google lo retiró)
 * - IMAGEN_MODEL (default imagen-3.0-generate-002)
 * Sin alternativas ni generación.
 */
export async function conectarAgentesSolicitados(): Promise<{
  apiKeyPresente: boolean;
  texto: ConexionModelo;
  imagen: ConexionModelo;
  listos: boolean;
  nota?: string;
}> {
  const { modeloTextoActivo } = await import("./probe.js");
  const modeloTexto = modeloTextoActivo();
  const modeloImagen =
    process.env.IMAGEN_MODEL?.trim() || "imagen-3.0-generate-002";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      apiKeyPresente: false,
      texto: {
        modelo: modeloTexto,
        conectado: false,
        detalle: "GEMINI_API_KEY no configurada",
      },
      imagen: {
        modelo: modeloImagen,
        conectado: false,
        detalle: "GEMINI_API_KEY no configurada",
      },
      listos: false,
    };
  }

  const texto = await getModelo(apiKey, modeloTexto);
  const imagen = await getModelo(apiKey, modeloImagen);
  const listos = texto.conectado && imagen.conectado;

  return {
    apiKeyPresente: true,
    texto,
    imagen,
    listos,
    ...(listos
      ? {
          nota: "Metadata OK. No se generó contenido (sin gasto de generación).",
        }
      : {
          nota: `No se pudo conectar el par solicitado ${modeloTexto} + ${modeloImagen}.`,
        }),
  };
}
