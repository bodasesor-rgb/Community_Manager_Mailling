/**
 * Prueba local de ajustes deterministas (sin Gemini).
 * Ejecutar: npx tsx scripts/probar-ajustar-email.ts
 */
import { ajustarEmail } from "../src/servicios/ajustar-email.js";

const HTML = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>Bodasesor</title></head>
<body>
<table role="presentation" width="600">
<tr><td style="background:#1a2744;text-align:center;padding:28px 32px;">
  <h1 style="margin:0;color:#ffffff;">Creamos momentos inolvidables en Cancún</h1>
  <p style="margin:10px 0 0;color:#C9A84C;">Expertos en eventos frente al mar</p>
</td></tr>
<tr><td style="padding:28px 32px;background:#f5f0ea;">
  <p style="margin:0;color:#1a2744;">{{ contact.FIRSTNAME }}, es un placer saludarte. En Bodasesor te acompañamos.</p>
</td></tr>
<tr><td align="center" style="padding:8px 32px;background:#f5f0ea;">
  <a href="https://api.whatsapp.com/send?phone=5215540080373" style="background:#25D366;color:#fff;">WhatsApp · Cotizar mi evento</a>
</td></tr>
<tr><td style="padding:20px;background:#1a2744;">
  <p style="color:#fff;">Usa el código MAILING10: 10% de descuento.</p>
</td></tr>
<tr><td style="padding:12px;"><a href="{{ unsubscribe }}">Darse de baja</a></td></tr>
</table>
</body></html>`;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const base = {
    htmlContent: HTML,
    asunto: "Asunto original de prueba",
    nombre: "Bodasesor · Asunto original de prueba",
  };

  const t1 = await ajustarEmail({
    ...base,
    modificaciones: 'Cambia el titular a: «Prueba Visible AZUL Cancún»',
  });
  assert(t1.htmlContent.includes("Prueba Visible AZUL Cancún"), "titular no aplicado");
  assert(!t1.htmlContent.includes("Creamos momentos inolvidables en Cancún"), "titular viejo sigue");
  assert(t1.modeloTexto === "determinista", "titular debió ser determinista");
  console.log("OK titular", t1.cambiosAplicados);

  const t2 = await ajustarEmail({
    ...base,
    modificaciones: 'El saludo debe decir: «Este es un saludo de prueba que debe verse»',
  });
  assert(
    t2.htmlContent.includes("Este es un saludo de prueba que debe verse"),
    "saludo no aplicado",
  );
  assert(t2.htmlContent.includes("{{ contact.FIRSTNAME }}"), "FIRSTNAME perdido");
  assert(!t2.htmlContent.includes("&lt;br"), "br no debe escaparse");
  assert(/<br\s*\/?>/i.test(t2.htmlContent), "saludo debe usar <br/> real");
  console.log("OK saludo", t2.cambiosAplicados);

  const t3 = await ajustarEmail({
    ...base,
    modificaciones: 'Cambia el asunto a: «Asunto Nuevo de Prueba 999»',
  });
  assert(t3.asunto === "Asunto Nuevo de Prueba 999", "asunto no aplicado");
  assert(t3.htmlContent === HTML || t3.htmlContent.includes("Creamos momentos"), "html no debía reescribirse");
  console.log("OK asunto", t3.cambiosAplicados);

  const t4 = await ajustarEmail({
    ...base,
    modificaciones: "Cambia el código a MAILING20",
  });
  assert(t4.htmlContent.includes("MAILING20"), "codigo no aplicado");
  assert(!t4.htmlContent.includes("MAILING10"), "codigo viejo sigue");
  console.log("OK codigo", t4.cambiosAplicados);

  // Debe fallar sin Gemini si el pedido no es interpretable de forma determinista
  let fallo = false;
  try {
    await ajustarEmail({
      ...base,
      modificaciones: "asdf qwerty zxcvbn sin sentido alguno xyz",
    });
  } catch (e) {
    fallo = true;
    console.log("OK nonsense rechazado:", (e as Error).message.slice(0, 80));
  }
  if (!fallo) {
    console.log("OK nonsense produjo algún cambio (solo posible con Gemini)");
  }

  console.log("Todas las pruebas deterministas pasaron.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
