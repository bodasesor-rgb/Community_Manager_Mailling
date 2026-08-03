/**
 * Almacén local de contactos suprimidos (bajas).
 * Fuente de verdad de nuestro lado — no depende de Brevo —
 * para que la migración a Amazon SES reutilice la misma lógica.
 */

/** Registro de un email en la lista de supresión local. */
export interface ContactoSuprimido {
  email: string;
  /** Motivo opcional de la baja. */
  motivo?: string;
  /** Fecha ISO de la supresión. */
  fecha: string;
}

/**
 * Contrato del almacén de supresión.
 * Implementación actual: JSON local.
 * Futuro: reemplazar por una tabla `contactos_suprimidos` en DB
 * sin cambiar a los consumidores (EmailProvider).
 */
export interface SupresionStore {
  /** Indica si el email está en la lista de bajas. */
  estaSuprimido(email: string): Promise<boolean>;

  /** Agrega (o actualiza) un email a la lista de bajas. */
  suprimir(email: string, motivo?: string): Promise<void>;

  /** Lectura de todos los registros (útil para auditoría / migración). */
  listar(): Promise<ContactoSuprimido[]>;
}
