export {
  BrevoProvider,
  type EmailProvider,
  type Contacto,
  type SincronizarContactoInput,
  type Remitente,
  type RemitenteVerificado,
  type CrearPlantillaInput,
  type ActualizarPlantillaInput,
  type CrearCampañaInput,
  type IdResultado,
} from "./email-provider.js";

export {
  JsonSupresionStore,
  type ContactoSuprimido,
  type SupresionStore,
} from "./supresion/index.js";

export {
  generarPlantillaHtml,
  escaparHtml,
  type GenerarPlantillaHtmlInput,
  type BloqueContenido,
  type BloqueTexto,
  type BloqueImagen,
  type BloqueCta,
} from "./plantillas/generador.js";

export {
  crearEnvio,
  type CrearEnvioInput,
  type CrearEnvioResultado,
  type ModoEnvio,
} from "./servicios/crear-envio.js";

export { KommoClient, type KommoContacto } from "./kommo/cliente.js";
export {
  sincronizarContactoKommo,
  type SyncKommoResultado,
} from "./kommo/sincronizar.js";

export {
  KommoCrmProvider,
  type KommoProvider,
  type KommoContactoEmail,
} from "./kommo-provider.js";

export { esEmailValido, normalizarEmail } from "./validar-email.js";

export {
  syncContactosKommoBrevo,
  type SyncContactosReporte,
  type SyncContactosOpciones,
} from "./servicios/sync-kommo-brevo.js";

export {
  generarContenidoEmail,
  listarModelosGemini,
  type GenerarContenidoInput,
  type ContenidoGenerado,
} from "./gemini/generar-contenido.js";

export {
  generarImagenEmail,
  rutaMediaSegura,
  type GenerarImagenInput,
  type ImagenGenerada,
} from "./gemini/generar-imagen.js";

export {
  conectarAgentesSolicitados,
  type ConexionModelo,
} from "./gemini/conectar.js";
