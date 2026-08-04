import "server-only";

import { BrevoProvider, type EmailProvider } from "@adapters/email-provider";
import { KommoCrmProvider, type KommoProvider } from "@adapters/kommo-provider";

/** Instancia Brevo solo en servidor. */
export function getEmailProvider(): EmailProvider {
  return new BrevoProvider();
}

/** Instancia Kommo solo en servidor. */
export function getKommoProvider(): KommoProvider {
  return new KommoCrmProvider();
}

export function listIdsDesdeEnv(): number[] | undefined {
  const raw = process.env.BREVO_DEFAULT_LIST_IDS;
  if (!raw) return undefined;
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ids.length > 0 ? ids : undefined;
}
