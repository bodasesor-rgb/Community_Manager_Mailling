/**
 * Interpreta las reglas fijas del composer y fuerza la estructura del mail.
 * La IA solo aporta copy; el layout lo decide el código.
 */

export interface EstructuraForzada {
  requiereNavbar: boolean;
  requiereLogo: boolean;
  requiereBlog: boolean;
  requiereProductos: number;
  codigoDescuento: string;
  porcentajeDescuento: number;
  requiereContacto: boolean;
  /** Sin hero grande: más parecido a la web. */
  mostrarHero: boolean;
  checklist: string[];
}

const DEFAULT: EstructuraForzada = {
  requiereNavbar: true,
  requiereLogo: true,
  requiereBlog: true,
  requiereProductos: 8,
  codigoDescuento: "MAILING5",
  porcentajeDescuento: 5,
  requiereContacto: true,
  mostrarHero: false,
  checklist: [],
};

/** Extrae requisitos estructurales del texto de reglas (con defaults seguros). */
export function interpretarReglasEstructura(reglasTexto: string): EstructuraForzada {
  const t = (reglasTexto || "").toLowerCase();
  const out: EstructuraForzada = { ...DEFAULT, checklist: [] };

  out.requiereNavbar =
    !t.includes("sin navbar") && !t.includes("sin nav bar");
  out.requiereLogo = !t.includes("sin logo");
  out.requiereBlog =
    t.includes("blog") || t.includes("artículo") || t.includes("articulo");
  if (!t.trim()) out.requiereBlog = true;

  const mProd = t.match(/(\d+)\s*product/);
  if (mProd) out.requiereProductos = Math.min(12, Math.max(1, Number(mProd[1])));
  else if (t.includes("8 product") || t.includes("ocho product")) {
    out.requiereProductos = 8;
  }

  const mCod = reglasTexto.match(
    /c[oó]digo\s*[:=]?\s*([A-Z0-9_-]{4,20})/i,
  );
  if (mCod?.[1]) out.codigoDescuento = mCod[1].toUpperCase();

  const mPct = t.match(/(\d+)\s*%\s*(de\s*)?descuento/);
  if (mPct) out.porcentajeDescuento = Number(mPct[1]);

  // Las reglas del usuario piden web-like: navbar + logo + blog + productos + descuento
  out.mostrarHero = t.includes("con hero") || t.includes("imagen hero");
  out.requiereContacto =
    t.includes("contacto") ||
    t.includes("whatsapp") ||
    t.includes("cotiz") ||
    true;

  out.checklist = [
    out.requiereNavbar ? "navbar principal linkeada (sin submenús)" : "",
    out.requiereLogo ? "logo visible" : "",
    out.requiereBlog ? "blog aleatorio con ~3 párrafos y Ver más" : "",
    `${out.requiereProductos} productos con enlace directo`,
    `código ${out.codigoDescuento} (${out.porcentajeDescuento}% descuento)`,
    out.requiereContacto ? "botones de contacto" : "",
  ].filter(Boolean);

  return out;
}

/** Mezcla array (Fisher–Yates). */
export function barajar<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}
