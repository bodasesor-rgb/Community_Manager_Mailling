/**
 * Orquesta el composer: brief → copy → imágenes (reuso o generación) → HTML.
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
import { promises as fs } from "node:fs";
import path from "node:path";

export interface ComposerInput {
  brief: string;
  /** Idea elegida (opcional). */
  ideaTitulo?: string;
  destino?: string;
  logoId?: string;
  /** Si true, genera imágenes nuevas cuando no hay compatibles. Default true. */
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
    // Refrescar URL absoluta por si cambió el host
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
  const briefAmpliado = [
    input.brief.trim(),
    input.ideaTitulo ? `Idea elegida: ${input.ideaTitulo}` : "",
    input.destino ? `Destino/tema: ${input.destino}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const generado = await generarContenidoEmail({
    brief: briefAmpliado,
    baseUrl: input.baseUrl,
    generarImagen: false,
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
  const productos = [...(promo.productos ?? [])];
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

  const htmlContent = generarEmailPromocionalHtml({
    ...promo,
    destino,
    ...(logoRes.item ? { logoUrl: logoRes.item.urlPublica } : {}),
    ...(heroItem ? { heroFoto: heroItem.urlPublica } : {}),
    productos,
  });

  if (generado.advertencia) advertencias.push(generado.advertencia);

  return {
    asunto: generado.asunto,
    nombre: `Newsletter ${destino}`,
    htmlContent,
    modeloTexto: generado.modeloTexto,
    destino,
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
