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
}

export interface ArticuloBlog {
  slug: string;
  titulo: string;
  url: string;
}

export interface SitioConocimiento {
  baseUrl: string;
  actualizadoEn: string;
  resumen: string;
  cotizarUrl: string;
  blogUrl: string;
  redes: EnlaceSocial;
  /** Categorías / productos principales (desde sitemap + overrides). */
  productos: ProductoSitio[];
  articulosBlog: ArticuloBlog[];
  /** Ciudades detectadas en el sitemap. */
  ciudades: string[];
  notas?: string;
  /** Último sync del sitemap. */
  sitemapSyncEn?: string;
  sitemapTotalUrls?: number;
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
    ciudades: [],
    notas:
      "Sitemap legible. HTML de páginas a menudo 403 para bots: configura redes a mano o permite el User-Agent del microservicio.",
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

/**
 * Sincroniza productos/blog/ciudades desde sitemap.xml (no requiere HTML).
 */
export async function sincronizarDesdeSitemap(
  baseUrl?: string,
): Promise<SitioConocimiento> {
  const actual = await leerConocimiento();
  const base = (baseUrl ?? actual.baseUrl).replace(/\/+$/, "");
  const sitemapUrl = `${base}/sitemap.xml`;
  const response = await fetch(sitemapUrl, {
    headers: {
      accept: "application/xml,text/xml,*/*",
      "user-agent":
        process.env.SITIO_USER_AGENT?.trim() ||
        "BodasesorMailingBot/1.0 (+https://bodasesor.com; panel-correos)",
    },
  });
  if (!response.ok) {
    throw new Error(`Sitemap ${response.status}: no se pudo leer ${sitemapUrl}`);
  }
  const xml = await response.text();
  const locs = [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)].map((m) =>
    m[1]!.trim(),
  );

  const ciudades = new Set<string>();
  const blog: ArticuloBlog[] = [];
  const porCategoria = new Map<string, ProductoSitio>();

  for (const loc of locs) {
    if (!loc.startsWith(base)) continue;
    const pathPart = loc.slice(base.length).replace(/^\//, "");
    if (!pathPart) continue;
    const parts = pathPart.split("/").filter(Boolean);
    const root = parts[0]!;

    // Ciudades sueltas: /cancun
    if (parts.length === 1 && !PRODUCTOS_SEMILLA.some((p) => p.slug === root)) {
      const ciudadLike = /^[a-z0-9-]+$/i.test(root) && root.length < 40;
      const knownCityRoots = new Set([
        "acapulco","aguascalientes","cancun","ciudad-de-mexico","cozumel","cuernavaca",
        "estado-de-mexico","guadalajara","leon","los-cabos","merida","monterrey","morelia",
        "oaxaca","pachuca","puebla","puerto-vallarta","queretaro","san-luis-potosi",
        "san-miguel-allende","tijuana","toluca","torreon","valle-de-bravo","veracruz",
      ]);
      if (ciudadLike && (knownCityRoots.has(root) || parts.length === 1)) {
        if (knownCityRoots.has(root)) ciudades.add(slugATitulo(root));
      }
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
    if (semilla && parts.length === 1) {
      porCategoria.set(root, {
        slug: root,
        nombre: semilla.nombre,
        url: loc,
        categoria: semilla.categoria,
      });
    }
  }

  // Asegurar semillas aunque no estén como URL depth-1
  for (const p of PRODUCTOS_SEMILLA) {
    if (!porCategoria.has(p.slug)) {
      porCategoria.set(p.slug, {
        ...p,
        url: `${base}/${p.slug}`,
      });
    }
  }

  return guardarConocimiento({
    ...actual,
    baseUrl: base,
    productos: [...porCategoria.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    ),
    articulosBlog: blog,
    ciudades: [...ciudades].sort((a, b) => a.localeCompare(b, "es")),
    blogUrl: `${base}/blog`,
    sitemapSyncEn: new Date().toISOString(),
    sitemapTotalUrls: locs.length,
    notas:
      "Productos/blog desde sitemap. Completa Facebook/Instagram/WhatsApp en el panel. Para leer textos completos de páginas, permite el User-Agent BodasesorMailingBot en el firewall/WAF del sitio.",
  });
}

/** Texto compacto para inyectar en prompts de Gemini. */
export function conocimientoParaPrompt(c: SitioConocimiento): string {
  const productos = c.productos
    .slice(0, 20)
    .map((p) => `- ${p.nombre}: ${p.url}`)
    .join("\n");
  const blog = c.articulosBlog
    .slice(0, 8)
    .map((a) => `- ${a.titulo}: ${a.url}`)
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
Cotizar: ${c.cotizarUrl || c.redes.whatsapp || c.baseUrl}
Blog: ${c.blogUrl}
Ciudades (muestra): ${c.ciudades.slice(0, 15).join(", ") || "todo México"}
Redes:
${redes || "(pendiente configurar en panel)"}
Productos/servicios (usar URLs reales en CTAs y bloques):
${productos}
Artículos de blog recientes (enlazar uno si aplica):
${blog || "(sincroniza sitemap)"}`;
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
