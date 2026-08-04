/**
 * Inspección completa de bodasesor.com con progreso y ETA.
 * Fuentes: llms.txt + sitemap completo + bundles JS (productos/blog/búsqueda).
 */

import {
  guardarConocimiento,
  leerConocimiento,
  type ArticuloBlog,
  type ProductoSitio,
  type SitioConocimiento,
} from "./conocimiento.js";

export type EstadoInspeccion =
  | "idle"
  | "corriendo"
  | "completada"
  | "error";

export interface InspeccionProgreso {
  estado: EstadoInspeccion;
  progreso: number; // 0-100
  etapa: string;
  detalle: string;
  iniciadoEn: string | null;
  terminadoEn: string | null;
  etaSegundos: number | null;
  segundosTranscurridos: number;
  error: string | null;
  contadores: {
    urlsSitemap: number;
    productos: number;
    blogs: number;
    menus: number;
    ciudades: number;
  };
}

const CIUDADES = new Set([
  "acapulco","aguascalientes","cancun","ciudad-de-mexico","cozumel","cuernavaca",
  "estado-de-mexico","guadalajara","leon","los-cabos","merida","monterrey","morelia",
  "oaxaca","pachuca","puebla","puerto-vallarta","queretaro","san-luis-potosi",
  "san-miguel-allende","tijuana","toluca","torreon","valle-de-bravo","veracruz",
]);

const PAGINAS_ESTATICAS = new Set([
  "aviso-de-privacidad","quienes-somos","galeria","buscar","empresas","blog",
  "contacto","terminos","catalogos","llms.txt","cotizar","sitemap.xml",
]);

/** Chrome UA: el WAF deja pasar assets JS; BodasesorMailingBot a veces recibe 403 en /assets. */
function uaNavegador(): string {
  return (
    process.env.SITIO_BROWSER_UA?.trim() ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
}

function uaBot(): string {
  return (
    process.env.SITIO_USER_AGENT?.trim() ||
    "BodasesorMailingBot/1.0 (+https://bodasesor.com; panel-correos)"
  );
}

function slugATitulo(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

let job: InspeccionProgreso = estadoIdle();
let corriendo = false;

function estadoIdle(): InspeccionProgreso {
  return {
    estado: "idle",
    progreso: 0,
    etapa: "En espera",
    detalle: "Pulsa «Inspeccionar página» para revisar todo el sitio.",
    iniciadoEn: null,
    terminadoEn: null,
    etaSegundos: null,
    segundosTranscurridos: 0,
    error: null,
    contadores: {
      urlsSitemap: 0,
      productos: 0,
      blogs: 0,
      menus: 0,
      ciudades: 0,
    },
  };
}

export function obtenerInspeccion(): InspeccionProgreso {
  if (job.estado === "corriendo" && job.iniciadoEn) {
    const elapsed = Math.floor(
      (Date.now() - new Date(job.iniciadoEn).getTime()) / 1000,
    );
    job = { ...job, segundosTranscurridos: elapsed };
  }
  return { ...job, contadores: { ...job.contadores } };
}

function actualizar(
  parcial: Partial<InspeccionProgreso> & {
    contadores?: Partial<InspeccionProgreso["contadores"]>;
  },
): void {
  const inicio = job.iniciadoEn ? new Date(job.iniciadoEn).getTime() : Date.now();
  const elapsed = Math.floor((Date.now() - inicio) / 1000);
  const progreso = parcial.progreso ?? job.progreso;
  let eta: number | null = null;
  if (progreso > 2 && progreso < 100) {
    const totalEst = elapsed / (progreso / 100);
    eta = Math.max(0, Math.ceil(totalEst - elapsed));
  } else if (progreso >= 100) {
    eta = 0;
  }
  job = {
    ...job,
    ...parcial,
    contadores: { ...job.contadores, ...(parcial.contadores ?? {}) },
    segundosTranscurridos: elapsed,
    etaSegundos: eta,
  };
}

export function iniciarInspeccion(): InspeccionProgreso {
  if (corriendo) {
    return obtenerInspeccion();
  }
  corriendo = true;
  job = {
    ...estadoIdle(),
    estado: "corriendo",
    iniciadoEn: new Date().toISOString(),
    etapa: "Iniciando",
    detalle: "Preparando revisión completa del sitio…",
    progreso: 1,
    etaSegundos: 90,
  };
  void correrInspeccion().finally(() => {
    corriendo = false;
  });
  return obtenerInspeccion();
}

async function fetchTexto(
  url: string,
  ua: string,
): Promise<{ ok: boolean; status: number; texto: string }> {
  const response = await fetch(url, {
    headers: {
      accept: "*/*",
      "user-agent": ua,
    },
  });
  const texto = await response.text();
  return { ok: response.ok, status: response.status, texto };
}

async function correrInspeccion(): Promise<void> {
  try {
    const actual = await leerConocimiento();
    const base = actual.baseUrl.replace(/\/+$/, "");

    actualizar({
      progreso: 5,
      etapa: "llms.txt",
      detalle: "Leyendo resumen oficial del sitio…",
      etaSegundos: 85,
    });
    const llms = await fetchTexto(`${base}/llms.txt`, uaBot());
    let resumen = actual.resumen;
    let whatsapp = actual.redes.whatsapp;
    const productosLlms: ProductoSitio[] = [];
    if (llms.ok) {
      const parsed = parseLlms(llms.texto, base);
      resumen = parsed.resumen || resumen;
      whatsapp = parsed.whatsapp || whatsapp;
      productosLlms.push(...parsed.productos);
    }

    actualizar({
      progreso: 15,
      etapa: "Sitemap",
      detalle: "Descargando mapa completo de URLs…",
      etaSegundos: 70,
    });
    const sm = await fetchTexto(`${base}/sitemap.xml`, uaBot());
    if (!sm.ok) {
      throw new Error(`No se pudo leer sitemap (${sm.status})`);
    }

    actualizar({
      progreso: 35,
      etapa: "Analizando menús y catálogo",
      detalle: `Procesando ${sm.texto.length.toLocaleString("es-MX")} caracteres del sitemap…`,
      etaSegundos: 55,
    });
    await sleep(30);
    const desdeSm = parseSitemapCompleto(sm.texto, base);
    actualizar({
      progreso: 50,
      etapa: "Menús detectados",
      detalle: `${desdeSm.menus.length} menús · ${desdeSm.productos.length} productos · ${desdeSm.blogs.length} blogs`,
      contadores: {
        urlsSitemap: desdeSm.totalUrls,
        productos: desdeSm.productos.length,
        blogs: desdeSm.blogs.length,
        menus: desdeSm.menus.length,
        ciudades: desdeSm.ciudades.length,
      },
      etaSegundos: 45,
    });

    actualizar({
      progreso: 58,
      etapa: "Bundles del sitio",
      detalle: "Buscando catálogo JS (productos, blog, buscador)…",
      etaSegundos: 40,
    });
    const home = await fetchTexto(`${base}/`, uaNavegador());
    const assets = descubrirAssets(home.ok ? home.texto : "");

    let productosJs: ProductoSitio[] = [];
    let blogsJs: ArticuloBlog[] = [];
    let busqueda: ProductoSitio[] = [];

    if (assets.products) {
      actualizar({
        progreso: 65,
        etapa: "Catálogo de productos",
        detalle: `Descargando ${assets.products}…`,
      });
      const js = await fetchTexto(`${base}${assets.products}`, uaNavegador());
      if (js.ok) {
        productosJs = parseProductsJs(js.texto, base);
      }
    }

    if (assets.blog) {
      actualizar({
        progreso: 75,
        etapa: "Artículos del blog",
        detalle: `Descargando ${assets.blog}…`,
      });
      const js = await fetchTexto(`${base}${assets.blog}`, uaNavegador());
      if (js.ok) {
        blogsJs = parseBlogJs(js.texto, base);
      }
    }

    if (assets.search) {
      actualizar({
        progreso: 85,
        etapa: "Índice de búsqueda",
        detalle: `Descargando ${assets.search}…`,
      });
      const js = await fetchTexto(`${base}${assets.search}`, uaNavegador());
      if (js.ok) {
        busqueda = parseSearchJs(js.texto, base);
      }
    }

    actualizar({
      progreso: 92,
      etapa: "Unificando inventario",
      detalle: "Mezclando sitemap + llms + catálogo JS…",
      etaSegundos: 8,
    });
    await sleep(40);

    const productos = unificarProductos([
      ...productosLlms,
      ...desdeSm.productos,
      ...productosJs,
      ...busqueda,
    ]);
    const blogs = unificarBlogs([...blogsJs, ...desdeSm.blogs]);

    const conocimiento: SitioConocimiento = {
      ...actual,
      baseUrl: base,
      resumen,
      cotizarUrl:
        whatsapp ||
        actual.cotizarUrl ||
        "https://api.whatsapp.com/send?phone=5215540080373&text=Hola%2C%20me%20gustar%C3%ADa%20cotizar%20un%20evento",
      blogUrl: `${base}/blog`,
      redes: {
        ...actual.redes,
        ...(whatsapp ? { whatsapp } : {}),
      },
      productos,
      articulosBlog: blogs,
      ciudades: desdeSm.ciudades,
      menus: desdeSm.menus,
      sitemapSyncEn: new Date().toISOString(),
      sitemapTotalUrls: desdeSm.totalUrls,
      inspeccionEn: new Date().toISOString(),
      notas: [
        `Inspección completa: ${desdeSm.totalUrls} URLs en sitemap.`,
        `${productos.length} productos/servicios únicos.`,
        `${blogs.length} artículos de blog.`,
        `${desdeSm.menus.length} menús raíz.`,
        llms.ok ? "llms.txt OK." : "llms.txt no disponible.",
        productosJs.length
          ? `JS productos: ${productosJs.length} fichas ricas.`
          : "JS productos no leído.",
        blogsJs.length
          ? `JS blog: ${blogsJs.length} artículos con extracto.`
          : "JS blog no leído.",
        busqueda.length
          ? `Buscador: ${busqueda.length} ítems.`
          : "Índice búsqueda no leído.",
        "Instagram/Facebook: pégalos en el panel si no salen en el sitio.",
      ].join(" "),
    };

    await guardarConocimiento(conocimiento);

    actualizar({
      estado: "completada",
      progreso: 100,
      etapa: "Listo",
      detalle: `Revisión terminada: ${productos.length} productos, ${blogs.length} blogs, ${desdeSm.menus.length} menús.`,
      terminadoEn: new Date().toISOString(),
      etaSegundos: 0,
      contadores: {
        urlsSitemap: desdeSm.totalUrls,
        productos: productos.length,
        blogs: blogs.length,
        menus: desdeSm.menus.length,
        ciudades: desdeSm.ciudades.length,
      },
    });
  } catch (error: unknown) {
    actualizar({
      estado: "error",
      progreso: job.progreso,
      etapa: "Error",
      detalle: error instanceof Error ? error.message : "Falló la inspección",
      error: error instanceof Error ? error.message : String(error),
      terminadoEn: new Date().toISOString(),
      etaSegundos: null,
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseLlms(
  texto: string,
  base: string,
): { resumen: string; productos: ProductoSitio[]; whatsapp?: string } {
  const productos: ProductoSitio[] = [];
  let resumen = "";
  let whatsapp: string | undefined;
  for (const linea of texto.split(/\r?\n/)) {
    const q = linea.match(/^>\s*(.+)$/);
    if (q && !resumen) resumen = q[1]!.trim();
    const wa = linea.match(/https?:\/\/api\.whatsapp\.com\/send\?[^\s)]+/i);
    if (wa) whatsapp = wa[0]!.replace(/&amp;/g, "&");
    const link = linea.match(
      /^-\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\):\s*(.+)$/,
    );
    if (link) {
      const url = link[2]!.trim();
      if (!url.startsWith(base) || url.includes("whatsapp")) continue;
      const slug = url
        .replace(base, "")
        .replace(/^\//, "")
        .replace(/\/$/, "");
      productos.push({
        slug: slug || link[1]!.trim(),
        nombre: link[1]!.trim(),
        url,
        categoria: link[3]!.trim().slice(0, 120),
        descripcion: link[3]!.trim(),
      });
    }
  }
  return {
    resumen,
    productos,
    ...(whatsapp ? { whatsapp } : {}),
  };
}

function parseSitemapCompleto(
  xml: string,
  base: string,
): {
  totalUrls: number;
  productos: ProductoSitio[];
  blogs: ArticuloBlog[];
  menus: NonNullable<SitioConocimiento["menus"]>;
  ciudades: string[];
} {
  const locs = [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)].map((m) =>
    m[1]!.trim(),
  );
  const productPaths = new Map<string, ProductoSitio>();
  const blogs: ArticuloBlog[] = [];
  const menuCount = new Map<string, number>();
  const ciudades = new Set<string>();

  for (const loc of locs) {
    if (!loc.startsWith(base)) continue;
    const pathPart = loc.slice(base.length).replace(/^\//, "");
    const parts = pathPart.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    if (parts[0] === "blog") {
      if (parts.length > 1) {
        const slug = parts.slice(1).join("/");
        blogs.push({
          slug,
          titulo: slugATitulo(slug),
          url: loc,
        });
      }
      continue;
    }

    if (parts.length === 1 && CIUDADES.has(parts[0]!)) {
      ciudades.add(slugATitulo(parts[0]!));
      continue;
    }

    const segs = [...parts];
    while (segs.length && CIUDADES.has(segs[segs.length - 1]!)) {
      segs.pop();
    }
    if (segs.length === 0) continue;
    if (PAGINAS_ESTATICAS.has(segs[0]!)) continue;

    const root = segs[0]!;
    menuCount.set(root, (menuCount.get(root) ?? 0) + 1);
    const slug = segs.join("/");
    if (!productPaths.has(slug)) {
      productPaths.set(slug, {
        slug,
        nombre: slugATitulo(segs[segs.length - 1]!),
        url: `${base}/${slug}`,
        categoria: root,
      });
    }
  }

  const menus = [...menuCount.entries()]
    .map(([slug, hijos]) => ({
      slug,
      nombre: slugATitulo(slug),
      url: `${base}/${slug}`,
      hijos,
    }))
    .sort((a, b) => b.hijos - a.hijos || a.nombre.localeCompare(b.nombre, "es"));

  return {
    totalUrls: locs.length,
    productos: [...productPaths.values()].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    ),
    blogs,
    menus,
    ciudades: [...ciudades].sort((a, b) => a.localeCompare(b, "es")),
  };
}

function descubrirAssets(html: string): {
  products?: string;
  blog?: string;
  search?: string;
} {
  const products = html.match(/\/assets\/products-[^"']+\.js/)?.[0];
  const blog = html.match(/\/assets\/blog-data-[^"']+\.js/)?.[0];
  const search = html.match(/\/assets\/search-index-[^"']+\.js/)?.[0];
  return {
    ...(products ? { products } : {}),
    ...(blog ? { blog } : {}),
    ...(search ? { search } : {}),
  };
}

function parseProductsJs(js: string, base: string): ProductoSitio[] {
  const out: ProductoSitio[] = [];
  const re =
    /\{slug:`([^`]+)`,title:`([^`]*)`,headline:`([^`]*)`,seoTitle:`([^`]*)`,seoDescription:`([^`]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(js))) {
    const slug = m[1]!;
    out.push({
      slug,
      nombre: m[2]!.trim() || slugATitulo(slug),
      url: `${base}/${slug}`,
      categoria: slug.split("/")[0] ?? slug,
      descripcion: m[5]!.trim(),
      headline: m[3]!.trim(),
    });
  }
  // fallback: any slug:`x` near title
  if (out.length === 0) {
    const slugs = [...js.matchAll(/\{slug:`([^`]+)`/g)].map((x) => x[1]!);
    for (const slug of new Set(slugs)) {
      out.push({
        slug,
        nombre: slugATitulo(slug.split("/").pop()!),
        url: `${base}/${slug}`,
        categoria: slug.split("/")[0] ?? slug,
      });
    }
  }
  return out;
}

function parseBlogJs(js: string, base: string): ArticuloBlog[] {
  const out: ArticuloBlog[] = [];
  const re =
    /\{slug:`([^`]+)`,title:`([^`]*)`,date:`([^`]*)`,category:`([^`]*)`,image:`([^`]*)`,excerpt:`([^`]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(js))) {
    out.push({
      slug: m[1]!,
      titulo: m[2]!.trim(),
      url: `${base}/blog/${m[1]!}`,
      fecha: m[3]!.trim(),
      categoria: m[4]!.trim(),
      imagen: m[5]!.trim(),
      extracto: m[6]!.trim(),
    });
  }
  return out;
}

function parseSearchJs(js: string, base: string): ProductoSitio[] {
  const out: ProductoSitio[] = [];
  const re = /\{href:`([^`]+)`,name:`([^`]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(js))) {
    const href = m[1]!.trim();
    if (!href.startsWith("/") || href.startsWith("/blog")) continue;
    const slug = href.replace(/^\//, "");
    const root = slug.split("/")[0] ?? slug;
    if (CIUDADES.has(root) || PAGINAS_ESTATICAS.has(root)) continue;
    out.push({
      slug,
      nombre: m[2]!.trim() || slugATitulo(slug.split("/").pop()!),
      url: `${base}${href}`,
      categoria: root,
    });
  }
  return out;
}

function unificarProductos(items: ProductoSitio[]): ProductoSitio[] {
  const map = new Map<string, ProductoSitio>();
  for (const p of items) {
    const key = p.slug.replace(/^\/+|\/+$/g, "");
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...p, slug: key });
      continue;
    }
    map.set(key, {
      ...prev,
      nombre:
        (p.nombre?.length ?? 0) > (prev.nombre?.length ?? 0)
          ? p.nombre
          : prev.nombre,
      descripcion: p.descripcion || prev.descripcion,
      headline: p.headline || prev.headline,
      categoria: prev.categoria || p.categoria,
      url: prev.url || p.url,
    });
  }
  return [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function unificarBlogs(items: ArticuloBlog[]): ArticuloBlog[] {
  const map = new Map<string, ArticuloBlog>();
  for (const a of items) {
    const prev = map.get(a.slug);
    if (!prev) {
      map.set(a.slug, a);
      continue;
    }
    map.set(a.slug, {
      ...prev,
      titulo: a.titulo.length > prev.titulo.length ? a.titulo : prev.titulo,
      extracto: a.extracto || prev.extracto,
      fecha: a.fecha || prev.fecha,
      categoria: a.categoria || prev.categoria,
      imagen: a.imagen || prev.imagen,
    });
  }
  return [...map.values()].sort((a, b) =>
    (b.fecha || "").localeCompare(a.fecha || ""),
  );
}
