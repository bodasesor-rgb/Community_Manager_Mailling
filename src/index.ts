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
