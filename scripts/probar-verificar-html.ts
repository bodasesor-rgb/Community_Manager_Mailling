/**
 * Pruebas del verificador determinista de HTML email (Capa 2).
 * Ejecutar: npx tsx scripts/probar-verificar-html.ts
 */

import assert from "node:assert/strict";
import {
  asegurarHtmlEmail,
  BREVO_FIRSTNAME,
  BREVO_UNSUBSCRIBE,
  EJEMPLO_HTML_EMAIL_OK,
  limpiarEnvoltorioHtml,
  verificarHtmlEmail,
} from "../src/servicios/verificar-html-email.js";
import { generarEmailPromocionalHtml } from "../src/plantillas/email-promocional.js";
import { generarPlantillaHtml } from "../src/plantillas/generador.js";

function ok(nombre: string, cond: boolean): void {
  assert.equal(cond, true, nombre);
  console.log(`  ✓ ${nombre}`);
}

console.log("verificar-html-email");

{
  const r = verificarHtmlEmail(EJEMPLO_HTML_EMAIL_OK);
  ok("ejemplo referencia pasa", r.ok);
  ok("sin auto-fixes innecesarios", r.avisos.length === 0);
}

{
  const html = generarEmailPromocionalHtml({
    destino: "CDMX",
    heroTitulo: "Prueba",
    assetsBaseUrl: "https://example.com",
    navItems: [{ nombre: "Inicio", url: "https://bodasesor.com/" }],
    productos: [
      { titulo: "A", descripcion: "d", foto: "https://x/a.jpg" },
      { titulo: "B", descripcion: "d", foto: "https://x/b.jpg" },
    ],
  });
  const r = verificarHtmlEmail(html);
  ok("plantilla promocional pasa", r.ok);
  ok("asegurar no lanza", asegurarHtmlEmail(html).startsWith("<!DOCTYPE"));
}

{
  const html = generarPlantillaHtml({
    marca: "Bodasesor",
    titular: "Hola",
    apoyo: "Prueba",
  });
  const r = verificarHtmlEmail(html);
  ok("plantilla simple pasa", r.ok);
}

{
  const wrapped =
    "Aquí el mail:\n```html\n" + EJEMPLO_HTML_EMAIL_OK + "\n```\nlisto";
  const { limpio } = limpiarEnvoltorioHtml(wrapped);
  ok("limpia fence markdown", limpio);
  const r = verificarHtmlEmail(wrapped);
  ok("wrapped pasa tras limpia", r.ok);
  ok(
    "aviso auto-fix envoltorio",
    r.avisos.some((a) => /envolvente|markdown/i.test(a)),
  );
}

{
  // Auto-repara variante mal espaciada de FIRSTNAME
  const bad = EJEMPLO_HTML_EMAIL_OK.replace(
    BREVO_FIRSTNAME,
    "{{contact.FIRSTNAME}}",
  );
  const r = verificarHtmlEmail(bad);
  ok("auto-repara FIRSTNAME spacing", r.ok && r.html.includes(BREVO_FIRSTNAME));
  ok(
    "aviso repair firstname",
    r.hallazgos.some((h) => h.codigo === "brevo-var"),
  );
}

{
  // Auto-repara variante mal espaciada de unsubscribe
  const bad = EJEMPLO_HTML_EMAIL_OK.replace(
    BREVO_UNSUBSCRIBE,
    "{{unsubscribe}}",
  );
  const r = verificarHtmlEmail(bad);
  ok(
    "auto-repara unsubscribe spacing",
    r.ok && r.html.includes(`href="${BREVO_UNSUBSCRIBE}"`),
  );
}

{
  // Auto-repara img sin alt
  const bad = EJEMPLO_HTML_EMAIL_OK.replace('alt="Bodasesor Eventos"', "");
  const r = verificarHtmlEmail(bad);
  ok("auto-repara img sin alt", r.ok);
  ok(
    "aviso repair alt",
    r.hallazgos.some((h) => h.codigo === "img-alt" && h.severidad === "auto-fix"),
  );
}

{
  // Auto-inserta unsubscribe si falta
  const bad = EJEMPLO_HTML_EMAIL_OK.replaceAll(BREVO_UNSUBSCRIBE, "#out").replace(
    /<a href="#out"[^>]*>Cancelar suscripción<\/a>/,
    "",
  );
  const r = verificarHtmlEmail(bad);
  ok(
    "auto-inserta unsubscribe link",
    r.ok && r.html.includes(`href="${BREVO_UNSUBSCRIBE}"`),
  );
}

{
  // Auto-inserta FIRSTNAME si falta
  const bad = EJEMPLO_HTML_EMAIL_OK.replaceAll(BREVO_FIRSTNAME, "cliente");
  const r = verificarHtmlEmail(bad);
  ok("auto-inserta FIRSTNAME", r.ok && r.html.includes(BREVO_FIRSTNAME));
}

{
  const bad = EJEMPLO_HTML_EMAIL_OK.replace("[[LOGO]]", "[[LOGO_INVENTADO]]");
  const r = verificarHtmlEmail(bad);
  ok("rechaza placeholder inventado", !r.ok);
}

{
  const bad = EJEMPLO_HTML_EMAIL_OK.replace(
    "</body>",
    '<div style="display:flex">x</div></body>',
  );
  const r = verificarHtmlEmail(bad);
  ok("rechaza flex en div", !r.ok);
}

{
  let lanzo = false;
  try {
    asegurarHtmlEmail("<p>hola</p>");
  } catch {
    lanzo = true;
  }
  ok("asegurar lanza si inválido irreparable", lanzo);
}

console.log("todas las pruebas OK");
