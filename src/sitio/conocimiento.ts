/**
 * Conocimiento del sitio Bodasesor para emails (productos, blog, redes).
 * El HTML de bodasesor.com bloquea muchos bots (403); el sitemap sí es legible.
 * Redes / WhatsApp se configuran a mano en el panel hasta permitir nuestro User-Agent.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export interface EnlaceSocial {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
}

export interface ProductoSitio {
  slug: string;
  nombre: string;
  url: string;
  categoria: string;
  descripcion?: string;
  headline?: string;
}

export interface ArticuloBlog {
  slug: string;
  titulo: string;
  url: string;
  fecha?: string;
  categoria?: string;
  imagen?: string;
  extracto?: string;
}

export interface MenuSitio {
  slug: string;
  nombre: string;
  url: string;
  hijos: number;
}

export interface SitioConocimiento {
  baseUrl: string;
  actualizadoEn: string;
  resumen: string;
  cotizarUrl: string;
  blogUrl: string;
  redes: EnlaceSocial;
  /** Inventario completo de productos/servicios. */
  productos: ProductoSitio[];
  articulosBlog: ArticuloBlog[];
  /** Menús raíz del sitio (con conteo de URLs hijas). */
  menus?: MenuSitio[];
  /** Ciudades detectadas en el sitemap. */
  ciudades: string[];
  notas?: string;
  /** Último sync / inspección. */
  sitemapSyncEn?: string;
  sitemapTotalUrls?: number;
  inspeccionEn?: string;
}

const PRODUCTOS_SEMILLA: Array<{ slug: string; nombre: string; categoria: string }> = [
  { slug: "banquetes", nombre: "Banquetes", categoria: "alimentos" },
  { slug: "banquetes-catering", nombre: "Banquetes y catering", categoria: "alimentos" },
  { slug: "alimentos-empresas", nombre: "Alimentos para empresas", categoria: "corporativo" },
  { slug: "floreria", nombre: "Florería", categoria: "decoracion" },
  { slug: "mobiliario", nombre: "Mobiliario", categoria: "mobiliario" },
  { slug: "sillas", nombre: "Sillas", categoria: "mobiliario" },
  { slug: "mesas", nombre: "Mesas", categoria: "mobiliario" },
  { slug: "carpas", nombre: "Carpas", categoria: "infraestructura" },
  { slug: "audio-iluminacion-video", nombre: "Audio, iluminación y video", categoria: "produccion" },
  { slug: "fotografia", nombre: "Fotografía", categoria: "produccion" },
  { slug: "musica", nombre: "Música", categoria: "produccion" },
  { slug: "shows", nombre: "Shows", categoria: "entretenimiento" },
  { slug: "wedding-planner", nombre: "Wedding planner", categoria: "planeacion" },
  { slug: "reposteria", nombre: "Repostería", categoria: "alimentos" },
  { slug: "barras", nombre: "Barras", categoria: "alimentos" },
  { slug: "bodas", nombre: "Bodas", categoria: "eventos" },
  { slug: "espacios-eventos", nombre: "Espacios para eventos", categoria: "venues" },
];

function archivoConocimiento(): string {
  return (
    process.env.SITIO_CONOCIMIENTO_PATH ??
    path.resolve(process.cwd(), "data", "sitio-conocimiento.json")
  );
}

function seed(): SitioConocimiento {
  const base = (process.env.SITIO_BASE_URL ?? "https://bodasesor.com").replace(
    /\/+$/,
    "",
  );
  return {
    baseUrl: base,
    actualizadoEn: new Date().toISOString(),
    resumen:
      "Bodasesor: banquetes, catering, mobiliario y servicios premium para bodas, quinceañeras, eventos corporativos y celebraciones en México.",
    cotizarUrl: `${base}/`,
    blogUrl: `${base}/blog`,
    redes: {
      ...(process.env.SITIO_FACEBOOK?.trim()
        ? { facebook: process.env.SITIO_FACEBOOK.trim() }
        : {}),
      ...(process.env.SITIO_INSTAGRAM?.trim()
        ? { instagram: process.env.SITIO_INSTAGRAM.trim() }
        : {}),
      ...(process.env.SITIO_WHATSAPP?.trim()
        ? { whatsapp: process.env.SITIO_WHATSAPP.trim() }
        : {}),
      linkedin:
        process.env.SITIO_LINKEDIN?.trim() ||
        "https://www.linkedin.com/company/bodasesor",
    },
    productos: PRODUCTOS_SEMILLA.map((p) => ({
      ...p,
      url: `${base}/${p.slug}`,
    })),
    articulosBlog: [],
    menus: [],
    ciudades: [],
    notas:
      "Pulsa «Inspeccionar página» en /panel/sitio para cargar el catálogo completo (sitemap + menús + blog + productos).",
  };
}

export async function leerConocimiento(): Promise<SitioConocimiento> {
  try {
    const raw = await fs.readFile(archivoConocimiento(), "utf8");
    const parsed = JSON.parse(raw) as SitioConocimiento;
    return { ...seed(), ...parsed, redes: { ...seed().redes, ...parsed.redes } };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      const s = seed();
      await guardarConocimiento(s);
      return s;
    }
    throw error;
  }
}

export async function guardarConocimiento(
  data: SitioConocimiento,
): Promise<SitioConocimiento> {
  const archivo = archivoConocimiento();
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  const next: SitioConocimiento = {
    ...data,
    actualizadoEn: new Date().toISOString(),
  };
  await fs.writeFile(archivo, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function actualizarConocimientoParcial(
  parcial: Partial<SitioConocimiento> & { redes?: EnlaceSocial },
): Promise<SitioConocimiento> {
  const actual = await leerConocimiento();
  return guardarConocimiento({
    ...actual,
    ...parcial,
    redes: { ...actual.redes, ...(parcial.redes ?? {}) },
  });
}

function slugATitulo(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function userAgent(): string {
  return (
    process.env.SITIO_USER_AGENT?.trim() ||
    "BodasesorMailingBot/1.0 (+https://bodasesor.com; panel-correos)"
  );
}

async function fetchTexto(url: string): Promise<{ ok: boolean; status: number; texto: string }> {
  const response = await fetch(url, {
    headers: {
      accept: "text/plain,text/html,application/xml,*/*",
      "user-agent": userAgent(),
    },
  });
  const texto = await response.text();
  return { ok: response.ok, status: response.status, texto };
}

function parseLlmsTxt(
  texto: string,
  base: string,
): {
  resumen: string;
  productos: ProductoSitio[];
  whatsapp?: string;
  telefono?: string;
} {
  const lineas = texto.split(/\r?\n/);
  let resumen = "";
  const productos: ProductoSitio[] = [];
  let whatsapp: string | undefined;
  let telefono: string | undefined;

  for (const linea of lineas) {
    const quote = linea.match(/^>\s*(.+)$/);
    if (quote && !resumen) {
      resumen = quote[1]!.trim();
    }
    const wa = linea.match(
      /https?:\/\/api\.whatsapp\.com\/send\?[^\s)]+/i,
    );
    if (wa) {
      whatsapp = wa[0]!.replace(/&amp;/g, "&");
    }
    const tel = linea.match(/\+52\s*[\d\s]+/);
    if (tel && !telefono) {
      telefono = tel[0]!.replace(/\s+/g, " ").trim();
    }
    const link = linea.match(
      /^-\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\):\s*(.+)$/,
    );
    if (link) {
      const nombre = link[1]!.trim();
      const url = link[2]!.trim();
      const desc = link[3]!.trim();
      if (!url.startsWith(base) && !url.includes("whatsapp")) {
        continue;
      }
      if (url.includes("whatsapp")) continue;
      const slug = url
        .replace(base, "")
        .replace(/^\//, "")
        .split("/")[0] || nombre.toLowerCase().replace(/\s+/g, "-");
      productos.push({
        slug,
        nombre,
        url,
        categoria: desc.slice(0, 80),
      });
    }
  }

  return {
    resumen:
      resumen ||
      "Bodasesor: productora de eventos integrales en México.",
    productos,
    ...(whatsapp ? { whatsapp } : {}),
    ...(telefono ? { telefono } : {}),
  };
}

/**
 * Sincroniza conocimiento del sitio:
 * 1) /llms.txt (abierto para nuestro bot: resumen, servicios, WhatsApp)
 * 2) /sitemap.xml (blog + ciudades + catálogo amplio)
 */
export async function sincronizarDesdeSitemap(
  baseUrl?: string,
): Promise<SitioConocimiento> {
  const actual = await leerConocimiento();
  const base = (baseUrl ?? actual.baseUrl).replace(/\/+$/, "");

  // --- llms.txt ---
  const llms = await fetchTexto(`${base}/llms.txt`);
  let desdeLlms: ReturnType<typeof parseLlmsTxt> | null = null;
  if (llms.ok && llms.texto.includes("Bodasesor")) {
    desdeLlms = parseLlmsTxt(llms.texto, base);
  }

  // --- sitemap ---
  const sm = await fetchTexto(`${base}/sitemap.xml`);
  if (!sm.ok) {
    throw new Error(`Sitemap ${sm.status}: no se pudo leer ${base}/sitemap.xml`);
  }
  const locs = [...sm.texto.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)].map(
    (m) => m[1]!.trim(),
  );

  const ciudades = new Set<string>();
  const blog: ArticuloBlog[] = [];
  const porCategoria = new Map<string, ProductoSitio>();

  // Preferir productos del llms.txt (mejores nombres/descripciones)
  if (desdeLlms) {
    for (const p of desdeLlms.productos) {
      porCategoria.set(p.slug, p);
    }
  }

  for (const loc of locs) {
    if (!loc.startsWith(base)) continue;
    const pathPart = loc.slice(base.length).replace(/^\//, "");
    if (!pathPart) continue;
    const parts = pathPart.split("/").filter(Boolean);
    const root = parts[0]!;

    const knownCityRoots = new Set([
      "acapulco","aguascalientes","cancun","ciudad-de-mexico","cozumel","cuernavaca",
      "estado-de-mexico","guadalajara","leon","los-cabos","merida","monterrey","morelia",
      "oaxaca","pachuca","puebla","puerto-vallarta","queretaro","san-luis-potosi",
      "san-miguel-allende","tijuana","toluca","torreon","valle-de-bravo","veracruz",
    ]);
    if (parts.length === 1 && knownCityRoots.has(root)) {
      ciudades.add(slugATitulo(root));
    }

    if (root === "blog") {
      if (parts.length === 1) continue;
      const slug = parts.slice(1).join("/");
      if (blog.length < 80) {
        blog.push({
          slug,
          titulo: slugATitulo(slug),
          url: loc,
        });
      }
      continue;
    }

    const semilla = PRODUCTOS_SEMILLA.find((p) => p.slug === root);
    if (semilla && parts.length === 1 && !porCategoria.has(root)) {
      porCategoria.set(root, {
        slug: root,
        nombre: semilla.nombre,
        url: loc,
        categoria: semilla.categoria,
      });
    }
  }

  for (const p of PRODUCTOS_SEMILLA) {
    if (!porCategoria.has(p.slug)) {
      porCategoria.set(p.slug, {
        ...p,
        url: `${base}/${p.slug}`,
      });
    }
  }

  const whatsapp =
    desdeLlms?.whatsapp ||
    actual.redes.whatsapp ||
    "https://api.whatsapp.com/send?phone=5215540080373&text=Hola%2C%20me%20gustar%C3%ADa%20cotizar%20un%20evento";

  return guardarConocimiento({
    ...actual,
    baseUrl: base,
    resumen: desdeLlms?.resumen || actual.resumen,
    cotizarUrl: whatsapp,
    productos: [...porCategoria.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    ),
    articulosBlog: blog,
    ciudades: [...ciudades].sort((a, b) => a.localeCompare(b, "es")),
    blogUrl: `${base}/blog`,
    redes: {
      ...actual.redes,
      whatsapp,
    },
    sitemapSyncEn: new Date().toISOString(),
    sitemapTotalUrls: locs.length,
    notas: [
      llms.ok
        ? "llms.txt leído OK (resumen + servicios + WhatsApp)."
        : `llms.txt no disponible (${llms.status}).`,
      "Sitemap OK para blog/ciudades.",
      "HTML de muchas páginas aún puede dar 403 a bots; llms.txt y sitemap bastan para armar mails con enlaces reales.",
      "Si tienes Instagram/Facebook, pégalos en el panel (no aparecen en llms.txt).",
    ].join(" "),
  });
}

/** Texto compacto para inyectar en prompts de Gemini. */
export function conocimientoParaPrompt(c: SitioConocimiento): string {
  const menus = (c.menus ?? [])
    .slice(0, 30)
    .map((m) => `- ${m.nombre} (${m.hijos} urls): ${m.url}`)
    .join("\n");
  const productos = c.productos
    .slice(0, 40)
    .map(
      (p) =>
        `- ${p.nombre}: ${p.url}${p.descripcion ? ` — ${p.descripcion.slice(0, 100)}` : ""}`,
    )
    .join("\n");
  const blog = c.articulosBlog
    .slice(0, 15)
    .map(
      (a) =>
        `- ${a.titulo}: ${a.url}${a.extracto ? ` — ${a.extracto.slice(0, 80)}` : ""}`,
    )
    .join("\n");
  const redes = [
    c.redes.instagram ? `Instagram: ${c.redes.instagram}` : null,
    c.redes.facebook ? `Facebook: ${c.redes.facebook}` : null,
    c.redes.whatsapp ? `WhatsApp: ${c.redes.whatsapp}` : null,
    c.redes.linkedin ? `LinkedIn: ${c.redes.linkedin}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Marca: Bodasesor
Sitio: ${c.baseUrl}
Resumen: ${c.resumen}
Inventario: ${c.productos.length} productos/servicios, ${c.articulosBlog.length} blogs, ${(c.menus ?? []).length} menús, ${c.sitemapTotalUrls ?? "?"} URLs sitemap.
Cotizar: ${c.cotizarUrl || c.redes.whatsapp || c.baseUrl}
Blog: ${c.blogUrl}
Ciudades (muestra): ${c.ciudades.slice(0, 15).join(", ") || "todo México"}
Redes:
${redes || "(pendiente Instagram/Facebook en panel)"}
Menús principales:
${menus || "(inspecciona el sitio)"}
Productos/servicios (muestra; hay ${c.productos.length} en total):
${productos}
Artículos de blog (muestra; hay ${c.articulosBlog.length} en total):
${blog || "(inspecciona el sitio)"}`;
}

/** Elige hasta 3 productos relevantes al brief. */
export function sugerirProductosParaBrief(
  c: SitioConocimiento,
  brief: string,
  limite = 3,
): ProductoSitio[] {
  const t = brief.toLowerCase();
  const scored = c.productos.map((p) => {
    let score = 0;
    const tokens = `${p.nombre} ${p.slug} ${p.categoria}`.toLowerCase();
    for (const w of tokens.split(/[^a-z0-9áéíóúñ]+/i)) {
      if (w.length >= 4 && t.includes(w)) score += 2;
    }
    if (t.includes("boda") && p.slug.includes("boda")) score += 3;
    if (t.includes("empresa") && p.categoria === "corporativo") score += 3;
    if (t.includes("flor") && p.slug.includes("flor")) score += 3;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, limite).map((s) => s.p);
  if (top.length >= limite) return top;
  const fill = c.productos.filter((p) => !top.some((t) => t.slug === p.slug));
  return [...top, ...fill].slice(0, limite);
}

export function sugerirArticuloBlog(
  c: SitioConocimiento,
  brief: string,
): ArticuloBlog | null {
  if (c.articulosBlog.length === 0) return null;
  const t = brief.toLowerCase();
  let mejor: { a: ArticuloBlog; score: number } | null = null;
  for (const a of c.articulosBlog) {
    let score = 0;
    for (const w of a.titulo.toLowerCase().split(/[^a-z0-9áéíóúñ]+/i)) {
      if (w.length >= 4 && t.includes(w)) score += 1;
    }
    if (!mejor || score > mejor.score) mejor = { a, score };
  }
  if (mejor && mejor.score > 0) return mejor.a;
  return c.articulosBlog[0] ?? null;
}
