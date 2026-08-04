/**
 * Orquesta el composer: instrucciones → copy IA → HTML con estructura FORZADA por reglas.
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
  elegirProductosVariados,
  enlaceWhatsAppCotizar,
  leerConocimiento,
  navPrincipalSitio,
  tresParrafosBlog,
} from "../sitio/conocimiento.js";
import { leerReglasComposer } from "../panel/reglas-composer.js";
import { interpretarReglasEstructura } from "./aplicar-reglas-estructura.js";
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
  estructura: string[];
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
  excluirIds?: string[];
}): Promise<{ item: MediaItem | null; reutilizada: boolean; generada: boolean }> {
  if (input.forzarId) {
    const fijo = await obtenerMedia(input.forzarId);
    if (fijo) return { item: fijo, reutilizada: true, generada: false };
  }

  const existente = await buscarMediaCompatible({
    tipo: input.tipo,
    destino: input.destino,
    texto: input.texto,
    ...(input.excluirIds?.length ? { excluirIds: input.excluirIds } : {}),
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
  const estructura = interpretarReglasEstructura(reglas.texto);

  const briefAmpliado = [
    instrucciones,
    input.ideaTitulo ? `Idea elegida: ${input.ideaTitulo}` : "",
    input.destino ? `Destino/tema: ${input.destino}` : "",
    `Estructura ya fijada por el sistema: ${estructura.checklist.join(" · ")}`,
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

  const ctaUrl = enlaceWhatsAppCotizar(
    sitio.redes.whatsapp || sitio.cotizarUrl,
  );

  // Productos: catálogo real variado (no inventados por la IA).
  const delCatalogo = elegirProductosVariados(
    sitio,
    briefAmpliado,
    estructura.requiereProductos,
  );
  const productos: Array<{
    titulo: string;
    descripcion: string;
    url: string;
    foto?: string;
  }> = delCatalogo.map((p) => ({
    titulo: p.nombre,
    descripcion:
      (p.descripcion || p.headline || `Servicio Bodasesor: ${p.nombre}.`).slice(
        0,
        160,
      ),
    url: p.url,
  }));
  if (productos.length < estructura.requiereProductos) {
    advertencias.push(
      `Solo hay ${productos.length}/${estructura.requiereProductos} productos en el catálogo. Inspecciona el sitio en /panel/sitio.`,
    );
  }

  // Blog: siempre aleatorio del sitio + 3 párrafos.
  const blogBase = articuloBlogAleatorio(sitio);
  const blog = {
    titulo: blogBase?.titulo ?? "Ideas en el blog Bodasesor",
    extracto: blogBase
      ? tresParrafosBlog(blogBase)
      : "Consejos y tendencias para tu celebración.\n\nEn Bodasesor compartimos ideas prácticas para bodas y eventos.\n\nDescubre más en nuestro blog.",
    url: blogBase?.url ?? sitio.blogUrl,
  };
  if (!blogBase) {
    advertencias.push(
      "No hay artículos de blog en el catálogo; inspecciona el sitio para rellenarlos.",
    );
  }

  const usadosIds = new Set<string>();
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
  if (logoRes.item) usadosIds.add(logoRes.item.id);
  if (!logoRes.item && estructura.requiereLogo) {
    advertencias.push("Sube el logo en Crear mail para que aparezca arriba.");
  }

  let heroItem: MediaItem | null = null;
  if (estructura.mostrarHero) {
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
        excluirIds: [...usadosIds],
      });
      heroItem = heroRes.item;
      if (heroRes.reutilizada) reutilizadas += 1;
      if (heroRes.generada) generadas += 1;
      if (heroItem) usadosIds.add(heroItem.id);
    } catch (error: unknown) {
      advertencias.push(
        `Hero: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const productosMedia: MediaItem[] = [];
  for (let i = 0; i < productos.length; i++) {
    const p = productos[i]!;
    try {
      const res = await resolverOGenerar({
        tipo: "producto",
        destino,
        texto: `${p.titulo} ${p.descripcion} ${destino}`,
        prompt: `Unique wedding/event service photo for "${p.titulo}": ${p.descripcion}. Location mood ${destino}. No text, photorealistic, different composition from other shots`,
        baseUrl: input.baseUrl,
        generar: quiereGen,
        excluirIds: [...usadosIds],
      });
      if (res.item) {
        // Nunca repetir la misma imagen dentro del mismo mail
        if (usadosIds.has(res.item.id)) {
          advertencias.push(
            `Producto ${i + 1}: se omitió imagen repetida (${p.titulo}).`,
          );
        } else {
          usadosIds.add(res.item.id);
          productosMedia.push(res.item);
          productos[i] = { ...p, foto: res.item.urlPublica };
          if (res.reutilizada) reutilizadas += 1;
          if (res.generada) generadas += 1;
        }
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

  const saludo =
    promo.saludo?.includes("{{ contact.FIRSTNAME }}")
      ? promo.saludo
      : `Hola {{ contact.FIRSTNAME }},\n\n${promo.saludo || `En Bodasesor preparamos tu celebración en ${destino} con el mismo cuidado que ves en nuestra web.`}`;

  const htmlContent = generarEmailPromocionalHtml({
    destino,
    heroTitulo: promo.heroTitulo || `Tu evento con Bodasesor en ${destino}`,
    ...(promo.heroSubtitulo !== undefined
      ? { heroSubtitulo: promo.heroSubtitulo }
      : {}),
    saludo,
    ctaTexto: promo.ctaTexto?.toLowerCase().includes("whatsapp")
      ? promo.ctaTexto
      : `WhatsApp · ${promo.ctaTexto || "Cotizar mi evento"}`,
    ctaUrl,
    blog,
    productos,
    mostrarHero: estructura.mostrarHero,
    navItems: estructura.requiereNavbar ? navPrincipalSitio(sitio) : [],
    descuento: {
      porcentaje: estructura.porcentajeDescuento,
      codigo: estructura.codigoDescuento,
      texto: `Menciona el código ${estructura.codigoDescuento} al cotizar por WhatsApp y recibe ${estructura.porcentajeDescuento}% de descuento por mailing.`,
    },
    urgencia:
      promo.urgencia ||
      `Reserva tu fecha y usa ${estructura.codigoDescuento} para ${estructura.porcentajeDescuento}% de descuento por mailing.`,
    facebookUrl: sitio.redes.facebook || "https://www.facebook.com/",
    instagramUrl: sitio.redes.instagram || "https://www.instagram.com/",
    whatsappUrl: ctaUrl,
    assetsBaseUrl: input.baseUrl,
    logoUrl: logoRes.item
      ? logoRes.item.urlPublica.startsWith("http")
        ? logoRes.item.urlPublica
        : `${input.baseUrl}${logoRes.item.urlPublica.startsWith("/") ? "" : "/"}${logoRes.item.urlPublica}`
      : `${input.baseUrl}/assets/logo-white.svg`,
    ...(heroItem ? { heroFoto: heroItem.urlPublica } : {}),
  });

  if (generado.advertencia) advertencias.push(generado.advertencia);

  // Validación dura de reglas
  const faltantes: string[] = [];
  if (estructura.requiereNavbar && !htmlContent.includes("Inicio")) {
    faltantes.push("navbar");
  }
  if (estructura.requiereBlog && !htmlContent.includes("Ver más")) {
    faltantes.push("blog/Ver más");
  }
  if ((htmlContent.match(/Ver servicio/g) || []).length < estructura.requiereProductos) {
    faltantes.push(`${estructura.requiereProductos} productos`);
  }
  if (!htmlContent.includes(estructura.codigoDescuento)) {
    faltantes.push(`código ${estructura.codigoDescuento}`);
  }
  if (faltantes.length) {
    advertencias.push(`Revisa estructura: faltó ${faltantes.join(", ")}`);
  }

  const asunto = (generado.asunto || `Bodasesor · ${destino}`).trim();
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
    estructura: estructura.checklist,
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
