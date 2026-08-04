/**
 * Pruebas del verificador determinista de HTML email (Capa 2).
 * Ejecutar: npx tsx scripts/probar-verificar-html.ts
 */

import assert from "node:assert/strict";
import {
  asegurarHtmlEmail,
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
  ok("wrapped pasa tras limpia", verificarHtmlEmail(wrapped).ok);
}

{
  const bad = EJEMPLO_HTML_EMAIL_OK.replaceAll("{{ unsubscribe }}", "#out");
  const r = verificarHtmlEmail(bad);
  ok("rechaza sin unsubscribe", !r.ok);
  ok(
    "mensaje unsubscribe",
    r.errores.some((e) => e.includes("unsubscribe")),
  );
}

{
  const bad = EJEMPLO_HTML_EMAIL_OK.replace(
    "{{ contact.FIRSTNAME }}",
    "{{contact.FIRSTNAME}}",
  );
  const r = verificarHtmlEmail(bad);
  ok("rechaza FIRSTNAME sin espacios exactos", !r.ok);
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
  const bad = EJEMPLO_HTML_EMAIL_OK.replace(
    'alt="Bodasesor Eventos"',
    "",
  );
  const r = verificarHtmlEmail(bad);
  ok("rechaza img sin alt", !r.ok);
}

{
  let lanzo = false;
  try {
    asegurarHtmlEmail("<p>hola</p>");
  } catch {
    lanzo = true;
  }
  ok("asegurar lanza si inválido", lanzo);
}

console.log("todas las pruebas OK");
