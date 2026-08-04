/**
 * Validación determinista de correos.
 * Sin LLM, sin red: solo formato.
 */

/** Normaliza email: trim + minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Valida formato razonable: sin espacios, con local@dominio.tld
 * (TLD de al menos 2 letras).
 */
export function esEmailValido(email: string): boolean {
  const normalizado = normalizarEmail(email);
  if (!normalizado || /\s/.test(normalizado)) {
    return false;
  }

  // local@dominio.tld — evita dobles puntos y extremos inválidos
  const regex =
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;

  if (!regex.test(normalizado)) {
    return false;
  }

  const [local, dominio] = normalizado.split("@");
  if (!local || !dominio) {
    return false;
  }
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  if (dominio.startsWith("-") || dominio.includes("..")) {
    return false;
  }

  return true;
}
