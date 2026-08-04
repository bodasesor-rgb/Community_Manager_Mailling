/**
 * Plantilla promocional Bodasesor para Brevo.
 * Tablas + CSS inline, 600px, navy / cream / gold.
 * Placeholders [[...]] y variables Brevo {{ ... }} se dejan sin escapar.
 */

/** Paleta oficial del email promocional. */
export const COLORES_BODASESOR = {
  navy: "#1a2744",
  cream: "#f5f0ea",
  gold: "#C9A84C",
  blanco: "#ffffff",
  texto: "#333333",
  muted: "#5a5a5a",
} as const;

/** Escapa texto para insertarlo en HTML. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ProductoPromocional {
  titulo: string;
  descripcion: string;
  /** URL o placeholder, p.ej. [[FOTO_PRODUCTO_1]] */
  foto?: string;
}

export interface TestimonialPromocional {
  cita: string;
  autor: string;
}

export interface BlogPromocional {
  titulo: string;
  extracto: string;
  url?: string;
}

export interface EmailPromocionalInput {
  /** Destino o tema de la semana (p.ej. "Posadas"). */
  destino: string;
  /** Titular del hero. */
  heroTitulo: string;
  /** Subtítulo bajo el hero. */
  heroSubtitulo?: string;
  /**
   * Cuerpo del saludo. Puede incluir `{{ contact.FIRSTNAME }}`.
   * Si no se pasa, se genera uno genérico con el destino.
   */
  saludo?: string;
  /** Texto del botón CTA principal. */
  ctaTexto?: string;
  /** URL o [[ENLACE_COTIZAR]]. */
  ctaUrl?: string;
  /** Hasta 3 productos / experiencias. */
  productos?: ProductoPromocional[];
  testimonial?: TestimonialPromocional;
  blog?: BlogPromocional;
  /** Bloque de urgencia / escasez. */
  urgencia?: string;
  /** Logo URL o [[LOGO]]. */
  logoUrl?: string;
  /** Hero URL o [[FOTO_HERO]]. */
  heroFoto?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  whatsappUrl?: string;
  /** Texto legal corto del footer. */
  pieLegal?: string;
}

const PLACEHOLDER = /^\[\[.+\]\]$/;
const BREVO_VAR = /\{\{\s*[\w.\s]+\s*\}\}/;

/** Escapa HTML salvo placeholders [[X]] y variables Brevo {{ x }}. */
export function escaparConPlaceholders(valor: string): string {
  if (PLACEHOLDER.test(valor.trim()) || BREVO_VAR.test(valor)) {
    // Mezcla texto + vars: escapar tramos no-var.
    return valor
      .split(/(\{\{\s*[\w.\s]+\s*\}\}|\[\[[^\]]+\]\])/g)
      .map((parte) => {
        if (PLACEHOLDER.test(parte) || BREVO_VAR.test(parte)) return parte;
        return escaparHtml(parte);
      })
      .join("");
  }
  return escaparHtml(valor);
}

function filaLogo(logoUrl: string): string {
  const src = escaparConPlaceholders(logoUrl);
  return `<tr>
  <td align="center" style="padding:28px 24px 16px;background:${COLORES_BODASESOR.navy};">
    <img src="${src}" alt="Bodasesor" width="180" style="display:block;width:180px;max-width:70%;height:auto;border:0;"/>
  </td>
</tr>`;
}

function filaHero(
  foto: string,
  titulo: string,
  subtitulo: string | undefined,
): string {
  const src = escaparConPlaceholders(foto);
  const t = escaparConPlaceholders(titulo);
  const s = subtitulo
    ? `<p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.45;color:${COLORES_BODASESOR.cream};">${escaparConPlaceholders(subtitulo)}</p>`
    : "";
  return `<tr>
  <td style="padding:0;background:${COLORES_BODASESOR.navy};">
    <img src="${src}" alt="${t}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/>
  </td>
</tr>
<tr>
  <td style="padding:28px 32px 8px;background:${COLORES_BODASESOR.navy};text-align:center;">
    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:${COLORES_BODASESOR.blanco};font-weight:normal;">${t}</h1>
    ${s}
  </td>
</tr>`;
}

function filaSaludo(saludo: string): string {
  const cuerpo = escaparConPlaceholders(saludo).replace(/\n/g, "<br/>");
  return `<tr>
  <td style="padding:28px 32px 12px;background:${COLORES_BODASESOR.cream};">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${COLORES_BODASESOR.texto};">${cuerpo}</p>
  </td>
</tr>`;
}

function filaCta(texto: string, url: string): string {
  const t = escaparConPlaceholders(texto);
  const href = escaparConPlaceholders(url);
  return `<tr>
  <td align="center" style="padding:8px 32px 28px;background:${COLORES_BODASESOR.cream};">
    <a href="${href}" style="display:inline-block;background:${COLORES_BODASESOR.gold};color:${COLORES_BODASESOR.navy};text-decoration:none;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;border-radius:4px;">${t}</a>
  </td>
</tr>`;
}

function filaProductos(productos: ProductoPromocional[]): string {
  if (productos.length === 0) return "";
  const filas = productos
    .map((p, i) => {
      const foto = p.foto ?? `[[FOTO_PRODUCTO_${i + 1}]]`;
      const titulo = escaparConPlaceholders(p.titulo);
      const desc = escaparConPlaceholders(p.descripcion).replace(/\n/g, "<br/>");
      const src = escaparConPlaceholders(foto);
      return `<tr>
  <td style="padding:16px 32px;background:${COLORES_BODASESOR.blanco};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td width="160" valign="top" style="padding:0 16px 0 0;">
          <img src="${src}" alt="${titulo}" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;"/>
        </td>
        <td valign="top">
          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.3;color:${COLORES_BODASESOR.navy};">${titulo}</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${COLORES_BODASESOR.muted};">${desc}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
    })
    .join("\n");

  return `<tr>
  <td style="padding:24px 32px 4px;background:${COLORES_BODASESOR.blanco};">
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${COLORES_BODASESOR.navy};border-bottom:2px solid ${COLORES_BODASESOR.gold};padding-bottom:10px;">Experiencias destacadas</p>
  </td>
</tr>
${filas}`;
}

function filaTestimonial(t: TestimonialPromocional): string {
  const cita = escaparConPlaceholders(t.cita);
  const autor = escaparConPlaceholders(t.autor);
  return `<tr>
  <td style="padding:28px 32px;background:${COLORES_BODASESOR.cream};">
    <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:${COLORES_BODASESOR.navy};font-style:italic;">“${cita}”</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORES_BODASESOR.gold};font-weight:bold;">— ${autor}</p>
  </td>
</tr>`;
}

function filaBlog(blog: BlogPromocional): string {
  const titulo = escaparConPlaceholders(blog.titulo);
  const extracto = escaparConPlaceholders(blog.extracto);
  const url = escaparConPlaceholders(blog.url ?? "[[ENLACE_BLOG]]");
  return `<tr>
  <td style="padding:28px 32px;background:${COLORES_BODASESOR.blanco};">
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORES_BODASESOR.gold};">Del blog</p>
    <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${COLORES_BODASESOR.navy};">${titulo}</p>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${COLORES_BODASESOR.muted};">${extracto}</p>
    <a href="${url}" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLORES_BODASESOR.navy};font-weight:bold;text-decoration:underline;">Leer más</a>
  </td>
</tr>`;
}

function filaUrgencia(texto: string): string {
  const t = escaparConPlaceholders(texto);
  return `<tr>
  <td align="center" style="padding:20px 32px;background:${COLORES_BODASESOR.navy};">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${COLORES_BODASESOR.cream};">${t}</p>
  </td>
</tr>`;
}

function filaSocial(
  facebook: string,
  instagram: string,
  whatsapp: string,
): string {
  const link = (href: string, label: string) =>
    `<a href="${escaparConPlaceholders(href)}" style="display:inline-block;margin:0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORES_BODASESOR.navy};text-decoration:none;border-bottom:1px solid ${COLORES_BODASESOR.gold};">${label}</a>`;
  return `<tr>
  <td align="center" style="padding:24px 32px 8px;background:${COLORES_BODASESOR.cream};">
    <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${COLORES_BODASESOR.muted};">Síguenos</p>
    ${link(facebook, "Facebook")}
    ${link(instagram, "Instagram")}
    ${link(whatsapp, "WhatsApp")}
  </td>
</tr>`;
}

function filaFooter(pieLegal: string): string {
  const pie = escaparConPlaceholders(pieLegal);
  return `<tr>
  <td style="padding:24px 32px 32px;background:${COLORES_BODASESOR.cream};border-top:1px solid #e0d8ce;">
    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLORES_BODASESOR.muted};text-align:center;">${pie}</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLORES_BODASESOR.muted};text-align:center;">
      <a href="{{ unsubscribe }}" style="color:${COLORES_BODASESOR.navy};text-decoration:underline;">Cancelar suscripción</a>
      &nbsp;·&nbsp; Bodasesor · <a href="https://bodasesor.com" style="color:${COLORES_BODASESOR.navy};text-decoration:underline;">bodasesor.com</a>
    </p>
  </td>
</tr>`;
}

/**
 * Genera HTML promocional listo para Brevo (solo tablas + estilos inline).
 */
export function generarEmailPromocionalHtml(
  input: EmailPromocionalInput,
): string {
  const destino = input.destino.trim() || "tu destino";
  const logoUrl = input.logoUrl ?? "[[LOGO]]";
  const heroFoto = input.heroFoto ?? "[[FOTO_HERO]]";
  const ctaTexto = input.ctaTexto ?? "Cotizar mi evento";
  const ctaUrl = input.ctaUrl ?? "[[ENLACE_COTIZAR]]";
  const saludo =
    input.saludo ??
    `Hola {{ contact.FIRSTNAME }},

En Bodasesor preparamos experiencias inolvidables en ${destino}. Te compartimos ideas, espacios y detalles para que tu celebración tenga el tono que buscas.`;
  const productos = input.productos ?? [];
  const urgencia =
    input.urgencia ??
    `Fechas en ${destino} se reservan con anticipación. Escríbenos y bloqueamos tu fecha.`;
  const pieLegal =
    input.pieLegal ??
    "Recibes este correo porque formas parte de la comunidad Bodasesor.";

  const testimonial =
    input.testimonial ??
    ({
      cita: `Con Bodasesor todo fluyó: el equipo, el lugar y el ambiente en ${destino} superaron lo que imaginábamos.`,
      autor: "Cliente Bodasesor",
    } satisfies TestimonialPromocional);

  const blog =
    input.blog ??
    ({
      titulo: `Guía rápida para celebrar en ${destino}`,
      extracto:
        "Ideas de ambientación, timing y proveedores locales para que tu evento se sienta auténtico desde el primer momento.",
      url: "[[ENLACE_BLOG]]",
    } satisfies BlogPromocional);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Bodasesor · ${escaparHtml(destino)}</title>
  <!--[if mso]><style type="text/css">body, table, td {font-family: Arial, Helvetica, sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${COLORES_BODASESOR.cream};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Ideas y espacios en ${escaparHtml(destino)} con Bodasesor.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORES_BODASESOR.cream};padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:${COLORES_BODASESOR.blanco};">
${filaLogo(logoUrl)}
${filaHero(heroFoto, input.heroTitulo, input.heroSubtitulo)}
${filaSaludo(saludo)}
${filaCta(ctaTexto, ctaUrl)}
${filaProductos(productos)}
${filaTestimonial(testimonial)}
${filaBlog(blog)}
${filaUrgencia(urgencia)}
${filaSocial(
  input.facebookUrl ?? "[[ENLACE_FACEBOOK]]",
  input.instagramUrl ?? "[[ENLACE_INSTAGRAM]]",
  input.whatsappUrl ?? "[[ENLACE_WHATSAPP]]",
)}
${filaFooter(pieLegal)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Temas de ejemplo listos para el panel / pruebas. */
export const TEMAS_EJEMPLO: Record<string, EmailPromocionalInput> = {
  posadas: {
    destino: "Posadas",
    heroTitulo: "Posadas te espera para decir sí",
    heroSubtitulo: "Ríos, atardeceres y celebraciones con alma",
    productos: [
      {
        titulo: "Cena a la orilla del río",
        descripcion:
          "Mesas largas, luz cálida y el sonido del agua como banda sonora de tu brindis.",
        foto: "[[FOTO_PRODUCTO_1]]",
      },
      {
        titulo: "Sesión en el malecón",
        descripcion:
          "Retratos al golden hour con el skyline de Posadas de fondo.",
        foto: "[[FOTO_PRODUCTO_2]]",
      },
      {
        titulo: "Finca íntima",
        descripcion:
          "Espacios verdes cerca de la ciudad para una recepción cercana y elegante.",
        foto: "[[FOTO_PRODUCTO_3]]",
      },
    ],
    testimonial: {
      cita: "En Posadas encontramos el equilibrio perfecto entre naturaleza y detalle. Bodasesor lo hizo posible.",
      autor: "María y Tomás",
    },
    blog: {
      titulo: "5 ideas para una boda de día en Posadas",
      extracto:
        "Desde el menú regional hasta la playlist del after: checklist corto para no olvidar nada.",
      url: "[[ENLACE_BLOG]]",
    },
    urgencia:
      "Las fechas de temporada alta en Posadas se agotan. Cotiza hoy y reserva tu lugar.",
  },
  cancun: {
    destino: "Cancún",
    heroTitulo: "Cancún: arena, brisa y tu celebración",
    heroSubtitulo: "Bodas frente al Caribe con estilo Bodasesor",
    productos: [
      {
        titulo: "Ceremonia en la playa",
        descripcion:
          "Arco floral, sillas sobre la arena y el azul del Caribe como testigo.",
        foto: "[[FOTO_PRODUCTO_1]]",
      },
      {
        titulo: "Recepción resort",
        descripcion:
          "Salones climatizados o terraza con vista al mar para el brindis y la fiesta.",
        foto: "[[FOTO_PRODUCTO_2]]",
      },
      {
        titulo: "Welcome dinner",
        descripcion:
          "Cena previa con mariscos frescos y ambiente barefoot chic para tus invitados.",
        foto: "[[FOTO_PRODUCTO_3]]",
      },
    ],
    testimonial: {
      cita: "Cancún se sintió mágico. El equipo de Bodasesor cuidó cada detalle sin estrés.",
      autor: "Laura y Diego",
    },
    blog: {
      titulo: "Qué preguntar al hotel antes de firmar en Cancún",
      extracto:
        "Horarios de playa, permisos y paquetes: evita sorpresas el día del evento.",
      url: "[[ENLACE_BLOG]]",
    },
    urgencia:
      "Temporada alta caribeña: bloquea tu fecha en Cancún antes de que se llene el calendario.",
  },
  cdmx: {
    destino: "Ciudad de México",
    heroTitulo: "CDMX: elegancia urbana para tu gran día",
    heroSubtitulo: "Rooftops, casonas y cultura en una sola celebración",
    productos: [
      {
        titulo: "Rooftop al atardecer",
        descripcion:
          "Skyline, cócteles y luces de la ciudad para una ceremonia moderna.",
        foto: "[[FOTO_PRODUCTO_1]]",
      },
      {
        titulo: "Casona colonial",
        descripcion:
          "Patios internos, piedra y floristería abundante para un look editorial.",
        foto: "[[FOTO_PRODUCTO_2]]",
      },
      {
        titulo: "After en galería",
        descripcion:
          "Música en vivo y arte contemporáneo para cerrar la noche con estilo.",
        foto: "[[FOTO_PRODUCTO_3]]",
      },
    ],
    testimonial: {
      cita: "Bodasesor entendió el ritmo de la ciudad y nos dio un evento íntimo y sofisticado.",
      autor: "Andrea y Pablo",
    },
    blog: {
      titulo: "Venues en CDMX según el número de invitados",
      extracto:
        "De 40 a 200 personas: cómo elegir sin sacrificar atmósfera ni logística.",
      url: "[[ENLACE_BLOG]]",
    },
    urgencia:
      "Los rooftops y casonas top de CDMX se reservan con meses de anticipación.",
  },
  guadalajara: {
    destino: "Guadalajara",
    heroTitulo: "Guadalajara con sabor y corazón",
    heroSubtitulo: "Tradición tapatía, diseño contemporáneo",
    productos: [
      {
        titulo: "Hacienda cerca de la ciudad",
        descripcion:
          "Arcos, jardines y mariachi de bienvenida para una recepción memorable.",
        foto: "[[FOTO_PRODUCTO_1]]",
      },
      {
        titulo: "Cena de autor",
        descripcion:
          "Menú con ingredientes de Jalisco y presentación de alta cocina.",
        foto: "[[FOTO_PRODUCTO_2]]",
      },
      {
        titulo: "Baile bajo las estrellas",
        descripcion:
          "Pista al aire libre, iluminación cálida y after hasta tarde.",
        foto: "[[FOTO_PRODUCTO_3]]",
      },
    ],
    testimonial: {
      cita: "Se sintió 100% tapatío y a la vez actual. Gracias Bodasesor por el cuidado en cada momento.",
      autor: "Sofía y Renato",
    },
    blog: {
      titulo: "Checklist de boda en Guadalajara",
      extracto:
        "Clima, horarios de hacienda y proveedores locales que conviene agendar primero.",
      url: "[[ENLACE_BLOG]]",
    },
    urgencia:
      "Las haciendas más pedidas de GDL cierran fechas rápido. Cotiza tu evento ya.",
  },
};
