/**
 * Orquesta el composer: instrucciones en lenguaje natural → copy → HTML.
 * Usa conocimiento del sitio (productos/blog/redes) y biblioteca de imágenes.
 */

import { generarContenidoEmail } from "../gemini/generar-contenido.js";
import { generarImagenEmail } from "../gemini/generar-imagen.js";
import { generarEmailPromocionalHtml } from "../plantillas/email-promocional.js";
import {
  buscarMediaCompatible,
  registrarMedia,
  obtenerMedia,
  type MediaItem,
} from "../panel/media-store.js";
import {
  articuloBlogAleatorio,
  conocimientoParaPrompt,
  enlaceWhatsAppCotizar,
  leerConocimiento,
  navPrincipalSitio,
  sugerirProductosParaBrief,
  tresParrafosBlog,
} from "../sitio/conocimiento.js";
import { leerReglasComposer } from "../panel/reglas-composer.js";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface ComposerInput {
  brief: string;
  ideaTitulo?: string;
  destino?: string;
  logoId?: string;
  generarImagenes?: boolean;
  baseUrl: string;
  marca?: string;
}

export interface ComposerResultado {
  asunto: string;
  nombre: string;
  htmlContent: string;
  modeloTexto: string;
  destino: string;
  instrucciones: string;
  imagenes: {
    logo?: MediaItem;
    hero?: MediaItem;
    productos: MediaItem[];
    reutilizadas: number;
    generadas: number;
  };
  advertencia?: string;
}

async function resolverOGenerar(input: {
  tipo: "logo" | "hero" | "producto";
  destino: string;
  texto: string;
  prompt: string;
  baseUrl: string;
  generar: boolean;
  forzarId?: string;
}): Promise<{ item: MediaItem | null; reutilizada: boolean; generada: boolean }> {
  if (input.forzarId) {
    const fijo = await obtenerMedia(input.forzarId);
    if (fijo) return { item: fijo, reutilizada: true, generada: false };
  }

  const existente = await buscarMediaCompatible({
    tipo: input.tipo,
    destino: input.destino,
    texto: input.texto,
  });
  if (existente) {
    const url = existente.urlPublica.startsWith("http")
      ? existente.urlPublica
      : `${input.baseUrl}/media/${existente.archivo}`;
    return {
      item: { ...existente, urlPublica: url },
      reutilizada: true,
      generada: false,
    };
  }

  if (!input.generar || input.tipo === "logo") {
    return { item: null, reutilizada: false, generada: false };
  }

  const generada = await generarImagenEmail({
    prompt: input.prompt,
    aspectRatio: input.tipo === "hero" ? "16:9" : "4:3",
    baseUrl: input.baseUrl,
  });

  const bytes = await fs.readFile(generada.archivo);
  const item = await registrarMedia({
    bytes,
    mimeType: generada.mimeType,
    tipo: input.tipo,
    prompt: input.prompt,
    destino: input.destino,
    etiquetas: [input.destino, input.tipo],
    modelo: generada.modelo,
    baseUrl: input.baseUrl,
    archivoExistente: path.basename(generada.archivo),
    idExistente: generada.id,
  });

  return { item, reutilizada: false, generada: true };
}

export async function componerEmail(input: ComposerInput): Promise<ComposerResultado> {
  const instrucciones = input.brief.trim();
  const sitio = await leerConocimiento();
  const reglas = await leerReglasComposer();
  const briefAmpliado = [
    instrucciones,
    input.ideaTitulo ? `Idea elegida: ${input.ideaTitulo}` : "",
    input.destino ? `Destino/tema: ${input.destino}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const generado = await generarContenidoEmail({
    brief: briefAmpliado,
    baseUrl: input.baseUrl,
    generarImagen: false,
    contextoSitio: conocimientoParaPrompt(sitio),
    reglas: reglas.texto,
    ...(input.marca !== undefined ? { marca: input.marca } : {}),
  });

  const promo = generado.contenido.promocional;
  if (!promo) {
    throw new Error("Gemini no devolvió estructura promocional");
  }

  const destino = input.destino?.trim() || promo.destino;
  const textoMatch = `${briefAmpliado} ${promo.heroTitulo} ${promo.heroSubtitulo ?? ""}`;
  const quiereGen = input.generarImagenes !== false;
  const advertencias: string[] = [];
  let reutilizadas = 0;
  let generadas = 0;

  // Enlaces reales del sitio (WhatsApp con mensaje desde el correo)
  const ctaUrl = enlaceWhatsAppCotizar(
    sitio.redes.whatsapp || sitio.cotizarUrl,
  );
  const sugeridos = sugerirProductosParaBrief(sitio, briefAmpliado, 8);
  const blogSug = articuloBlogAleatorio(sitio);

  let productos = [...(promo.productos ?? [])];
  if (productos.length < 8 && sugeridos.length > 0) {
    const usados = new Set(
      productos.map((p) => (p.url || p.titulo).toLowerCase()),
    );
    for (const s of sugeridos) {
      if (productos.length >= 8) break;
      const key = s.url.toLowerCase();
      if (usados.has(key) || usados.has(s.nombre.toLowerCase())) continue;
      productos.push({
        titulo: s.nombre,
        descripcion: s.descripcion || `Servicio Bodasesor: ${s.nombre}.`,
        url: s.url,
      });
      usados.add(key);
    }
  }
  productos = productos.slice(0, 8).map((p, i) => {
    const match = sugeridos[i];
    return {
      ...p,
      url: p.url && p.url.startsWith("http") ? p.url : match?.url,
      descripcion:
        p.descripcion ||
        match?.descripcion ||
        `Servicio Bodasesor: ${p.titulo}.`,
    };
  });

  const blogBase = blogSug;
  const blog = {
    titulo: blogBase?.titulo ?? "Ideas en el blog Bodasesor",
    extracto: blogBase
      ? tresParrafosBlog(blogBase)
      : "Consejos y tendencias para tu celebración.\n\nEn Bodasesor compartimos ideas prácticas para bodas y eventos.\n\nDescubre más en nuestro blog.",
    url: blogBase?.url ?? sitio.blogUrl,
  };

  const logoRes = await resolverOGenerar({
    tipo: "logo",
    destino,
    texto: "bodasesor logo marca",
    prompt: "Bodasesor logo",
    baseUrl: input.baseUrl,
    generar: false,
    ...(input.logoId !== undefined ? { forzarId: input.logoId } : {}),
  });
  if (logoRes.reutilizada) reutilizadas += 1;

  let heroItem: MediaItem | null = null;
  try {
    const heroRes = await resolverOGenerar({
      tipo: "hero",
      destino,
      texto: textoMatch,
      prompt:
        generado.imagePrompt ??
        `Editorial wedding lifestyle photo in ${destino}, warm light, no text, tasteful celebration atmosphere`,
      baseUrl: input.baseUrl,
      generar: quiereGen,
    });
    heroItem = heroRes.item;
    if (heroRes.reutilizada) reutilizadas += 1;
    if (heroRes.generada) generadas += 1;
  } catch (error: unknown) {
    advertencias.push(
      `Hero: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const productosMedia: MediaItem[] = [];
  for (let i = 0; i < productos.length; i++) {
    const p = productos[i]!;
    try {
      const res = await resolverOGenerar({
        tipo: "producto",
        destino,
        texto: `${textoMatch} ${p.titulo} ${p.descripcion}`,
        prompt: `Wedding event detail photo for "${p.titulo}" in ${destino}, no text, photorealistic`,
        baseUrl: input.baseUrl,
        generar: quiereGen,
      });
      if (res.item) {
        productosMedia.push(res.item);
        productos[i] = { ...p, foto: res.item.urlPublica };
        if (res.reutilizada) reutilizadas += 1;
        if (res.generada) generadas += 1;
      }
    } catch (error: unknown) {
      advertencias.push(
        `Producto ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (!sitio.redes.instagram && !sitio.redes.facebook) {
    advertencias.push(
      "Redes sociales pendientes: configúralas en /panel/sitio",
    );
  }

  const htmlContent = generarEmailPromocionalHtml({
    ...promo,
    destino,
    ctaUrl,
    blog,
    productos,
    navItems: navPrincipalSitio(sitio),
    descuento: {
      porcentaje: 10,
      codigo: "MAILING10",
      texto:
        "Menciona este código al cotizar por WhatsApp y recibe 10% de descuento por mailing.",
    },
    facebookUrl: sitio.redes.facebook ?? "[[ENLACE_FACEBOOK]]",
    instagramUrl: sitio.redes.instagram ?? "[[ENLACE_INSTAGRAM]]",
    whatsappUrl: ctaUrl,
    ...(logoRes.item ? { logoUrl: logoRes.item.urlPublica } : {}),
    ...(heroItem ? { heroFoto: heroItem.urlPublica } : {}),
  });

  if (generado.advertencia) advertencias.push(generado.advertencia);

  const asunto = (generado.asunto || `Bodasesor · ${destino}`).trim();
  // Nombre interno = etiqueta del proyecto a partir del mismo asunto/brief.
  const nombre = (asunto.toLowerCase().startsWith("bodasesor")
    ? asunto
    : `Bodasesor · ${asunto}`)
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim();

  return {
    asunto,
    nombre,
    htmlContent,
    modeloTexto: generado.modeloTexto,
    destino,
    instrucciones,
    imagenes: {
      ...(logoRes.item ? { logo: logoRes.item } : {}),
      ...(heroItem ? { hero: heroItem } : {}),
      productos: productosMedia,
      reutilizadas,
      generadas,
    },
    ...(advertencias.length > 0
      ? { advertencia: advertencias.join(" · ") }
      : {}),
  };
}
