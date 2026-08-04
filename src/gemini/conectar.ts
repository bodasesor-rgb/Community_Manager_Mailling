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
 * Verifica los agentes pedidos: Flash 2.0 (texto) e Imagen 3.
 * También reporta Imagen 4 si 3 ya no existe en la API.
 * No genera contenido.
 */
export async function conectarAgentesSolicitados(): Promise<{
  apiKeyPresente: boolean;
  texto: ConexionModelo;
  imagen: ConexionModelo;
  imagenAlternativa: ConexionModelo | null;
  listos: boolean;
  nota?: string;
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
      imagenAlternativa: null,
      listos: false,
    };
  }

  const texto = await getModelo(apiKey, "gemini-2.0-flash");
  let imagen = await getModelo(apiKey, "imagen-3.0-generate-002");
  if (!imagen.conectado) {
    const alt3 = await getModelo(apiKey, "imagen-3.0-generate-001");
    if (alt3.conectado) {
      imagen = alt3;
    }
  }

  let imagenAlternativa: ConexionModelo | null = null;
  if (!imagen.conectado) {
    imagenAlternativa = await getModelo(apiKey, "imagen-4.0-generate-001");
  }

  const listos = texto.conectado && imagen.conectado;
  const listosConAlt =
    texto.conectado && (imagen.conectado || Boolean(imagenAlternativa?.conectado));

  return {
    apiKeyPresente: true,
    texto,
    imagen,
    imagenAlternativa,
    listos,
    ...(listos
      ? {}
      : {
          nota: listosConAlt
            ? "Flash 2.0 OK. Imagen 3 no existe en esta API key; Imagen 4 sí está visible (sin generar aún)."
            : "No se pudo conectar el par solicitado Flash 2.0 + Imagen 3.",
        }),
  };
}
