/**
 * HTML del panel para Hostinger (sin Next.js).
 * Formularios visibles en /panel/contactos y /panel/plantillas.
 */

function layout(titulo: string, activo: "inicio" | "contactos" | "plantillas", cuerpo: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${titulo} · Bodasesor Correos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root{--bg:#f3f1ec;--ink:#1c1b19;--muted:#5e5a52;--line:#d8d2c6;--brand:#2f5d50;--brand2:#23463c;--card:#fffcf7;--danger:#8b3a3a;--warn:#f7efe3}
    *{box-sizing:border-box} body{margin:0;font-family:"Source Sans 3",system-ui,sans-serif;color:var(--ink);background:radial-gradient(900px 400px at 0% 0%,#dfece4,transparent 55%),var(--bg)}
    .shell{max-width:1100px;margin:0 auto;padding:24px 16px 56px}
    h1{font-family:Fraunces,Georgia,serif;color:var(--brand);font-size:clamp(2rem,4vw,2.7rem);margin:0}
    h1 span{display:block;margin-top:6px;font-family:"Source Sans 3",sans-serif;font-size:.95rem;font-weight:500;color:var(--muted)}
    nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 24px}
    nav a{padding:10px 14px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,252,247,.8)}
    nav a.activo,nav a:hover{background:var(--brand);border-color:var(--brand);color:#fff}
    .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;box-shadow:0 18px 40px rgba(35,40,32,.08)}
    h2{font-family:Fraunces,Georgia,serif;margin:0 0 8px}
    .lead{color:var(--muted);margin:0 0 18px}
    label{display:grid;gap:6px;font-weight:600;margin-bottom:12px}
    input,textarea,button,select{font:inherit}
    input,textarea{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#fff}
    textarea{min-height:220px;font-family:ui-monospace,Menlo,monospace;font-size:.9rem}
    .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0}
    button{appearance:none;border:0;border-radius:10px;padding:11px 16px;background:var(--brand);color:#fff;font-weight:700;cursor:pointer}
    button.sec{background:transparent;color:var(--brand);border:1px solid var(--brand)}
    button:disabled{opacity:.55;cursor:not-allowed}
    .grid{display:grid;grid-template-columns:1.05fr .95fr;gap:16px}
    @media(max-width:900px){.grid{grid-template-columns:1fr}}
    iframe{width:100%;min-height:520px;border:1px solid var(--line);border-radius:12px;background:#fff}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0}
    .stat{background:#e7efe9;border-radius:12px;padding:12px}
    .stat strong{display:block;font-family:Fraunces,Georgia,serif;font-size:1.5rem}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}
    .err{background:#f8ecec;border:1px solid #e5c7c7;color:var(--danger);padding:10px 12px;border-radius:10px}
    .ok{background:var(--warn);border:1px solid #e5d3b4;padding:10px 12px;border-radius:10px}
    .muted{color:var(--muted)}
  </style>
</head>
<body>
  <div class="shell">
    <h1>Bodasesor<span>Panel de correos</span></h1>
    <nav>
      <a href="/panel" class="${activo === "inicio" ? "activo" : ""}">Inicio</a>
      <a href="/panel/contactos" class="${activo === "contactos" ? "activo" : ""}">Contactos</a>
      <a href="/panel/plantillas" class="${activo === "plantillas" ? "activo" : ""}">Plantillas</a>
    </nav>
    ${cuerpo}
  </div>
</body>
</html>`;
}

export function paginaInicioHtml(): string {
  return layout(
    "Inicio",
    "inicio",
    `<section class="card">
      <h2>Bienvenido</h2>
      <p class="lead">Desde aquí sincronizas contactos Kommo→Brevo y creas plantillas con previsualización antes de aprobarlas.</p>
      <div class="row">
        <a href="/panel/contactos"><button type="button">Ir a Contactos</button></a>
        <a href="/panel/plantillas"><button type="button" class="sec">Ir a Plantillas</button></a>
      </div>
      <p class="muted">API JSON sigue en <code>/health</code>. Este panel es la interfaz visual.</p>
    </section>`,
  );
}

export function paginaContactosHtml(): string {
  return layout(
    "Contactos",
    "contactos",
    `<section class="card">
      <h2>Contactos</h2>
      <p class="lead">Sincroniza desde Kommo. Solo se guardan correos válidos; los inválidos aparecen abajo.</p>
      <form id="form-sync">
        <div class="row">
          <label style="display:flex;gap:8px;align-items:center;font-weight:500;margin:0">
            <input type="checkbox" id="dryRun" checked/>
            Simulación (dryRun) — no escribe en Brevo
          </label>
          <button type="submit" id="btn-sync">Sincronizar desde Kommo</button>
        </div>
      </form>
      <div id="msg"></div>
      <div id="resultado"></div>
    </section>
    <script>
      const form = document.getElementById('form-sync');
      const msg = document.getElementById('msg');
      const resultado = document.getElementById('resultado');
      const btn = document.getElementById('btn-sync');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true; btn.textContent = 'Sincronizando…';
        msg.innerHTML = ''; resultado.innerHTML = '';
        try {
          const dryRun = document.getElementById('dryRun').checked;
          const res = await fetch('/api/sync-contactos', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ dryRun })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error de sync');
          msg.innerHTML = '<div class="ok">Modo: <strong>' + (data.dryRun ? 'dryRun (sin escribir)' : 'escritura en Brevo') + '</strong></div>';
          resultado.innerHTML = \`
            <div class="stats">
              <div class="stat"><strong>\${data.total}</strong><span>Total c/email</span></div>
              <div class="stat"><strong>\${data.nuevosOActualizados}</strong><span>\${data.dryRun ? 'Válidos' : 'Sync OK'}</span></div>
              <div class="stat"><strong>\${data.invalidos.length}</strong><span>Inválidos</span></div>
              <div class="stat"><strong>\${data.suprimidos}</strong><span>Suprimidos</span></div>
            </div>
            <h3>Correos inválidos</h3>
            \${data.invalidos.length === 0 ? '<p class="muted">Ninguno</p>' : '<table><thead><tr><th>Nombre</th><th>Email</th></tr></thead><tbody>' +
              data.invalidos.map(c => '<tr><td>' + escapeHtml(c.nombre) + '</td><td>' + escapeHtml(c.email) + '</td></tr>').join('') +
              '</tbody></table>'}
          \`;
        } catch (err) {
          msg.innerHTML = '<div class="err">' + escapeHtml(err.message || String(err)) + '</div>';
        } finally {
          btn.disabled = false; btn.textContent = 'Sincronizar desde Kommo';
        }
      });
      function escapeHtml(s){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
    </script>`,
  );
}

const HTML_EJEMPLO = `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:0;background:#f3f1ec;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table width="600" style="max-width:600px;width:100%;background:#fff;">
<tr><td style="padding:28px;color:#2F5D50;font-size:28px;">Bodasesor</td></tr>
<tr><td style="padding:0 28px 12px;font-size:22px;color:#1a1a1a;">Ideas para tu próxima publicación</td></tr>
<tr><td style="padding:0 28px 24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">
Comparte bastidores reales, un tip práctico y una historia corta de cliente.
</td></tr>
<tr><td style="padding:0 28px 28px;" align="center">
<a href="https://bodasesor.com" style="background:#2F5D50;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-family:Arial,sans-serif;">Ver guía</a>
</td></tr>
</table></td></tr></table></body></html>`;

export function paginaPlantillasHtml(): string {
  const ejemploEscapado = HTML_EJEMPLO
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  return layout(
    "Plantillas",
    "plantillas",
    `<section class="card">
      <h2>Plantillas</h2>
      <p class="lead">Edita el HTML, previsualízalo y guarda borrador local. Solo al aprobar se crea en Brevo (campaña en borrador, sin envío).</p>
      <div class="row">
        <button type="button" class="sec" id="btn-nuevo">Nuevo</button>
        <button type="button" class="sec" id="btn-guardar">Guardar borrador</button>
        <button type="button" id="btn-aprobar">Aprobar y enviar a Brevo</button>
        <span id="estado" class="muted">estado: borrador</span>
      </div>
      <div id="msg"></div>
      <div class="grid">
        <form id="form-plantilla">
          <input type="hidden" id="id"/>
          <label>Nombre interno<input id="nombre" value="Newsletter Bodasesor" required/></label>
          <label>Asunto<input id="asunto" value="Ideas para tu próxima publicación" required/></label>
          <label>Remitente nombre<input id="remNombre" value="Bodasesor" required/></label>
          <label>Remitente email<input id="remEmail" value="hola@bodasesor.com" required/></label>
          <label>listIds Brevo (ej. 21)<input id="listIds" placeholder="o usa BREVO_DEFAULT_LIST_IDS"/></label>
          <label>htmlContent<textarea id="htmlContent" required></textarea></label>
        </form>
        <div>
          <h3 style="font-family:Fraunces,Georgia,serif;margin-top:0">Pre-visualización</h3>
          <iframe id="preview" title="Vista previa"></iframe>
        </div>
      </div>
      <h3 style="font-family:Fraunces,Georgia,serif;margin-top:28px">Borradores guardados</h3>
      <div id="lista"></div>
    </section>
    <script>
      const HTML_EJEMPLO = \`${ejemploEscapado}\`;
      const htmlContent = document.getElementById('htmlContent');
      const preview = document.getElementById('preview');
      const msg = document.getElementById('msg');
      const estadoEl = document.getElementById('estado');
      htmlContent.value = HTML_EJEMPLO;
      function refreshPreview(){ preview.srcdoc = htmlContent.value; }
      htmlContent.addEventListener('input', refreshPreview);
      refreshPreview();

      function setMsg(ok, text){ msg.innerHTML = '<div class="' + (ok?'ok':'err') + '">' + escapeHtml(text) + '</div>'; }
      function escapeHtml(s){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

      async function cargarLista(){
        const res = await fetch('/api/borradores');
        const data = await res.json();
        const items = data.borradores || [];
        if (!items.length) { document.getElementById('lista').innerHTML = '<p class="muted">Aún no hay borradores.</p>'; return; }
        document.getElementById('lista').innerHTML = '<table><thead><tr><th>Nombre</th><th>Asunto</th><th>Estado</th><th></th></tr></thead><tbody>' +
          items.map(b => '<tr><td>'+escapeHtml(b.nombre)+'</td><td>'+escapeHtml(b.asunto)+'</td><td>'+escapeHtml(b.estado)+'</td><td><button type="button" class="sec" data-id="'+b.id+'">Abrir</button></td></tr>').join('') +
          '</tbody></table>';
        document.querySelectorAll('#lista button[data-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const r = await fetch('/api/borradores/' + btn.getAttribute('data-id'));
            const b = await r.json();
            document.getElementById('id').value = b.id;
            document.getElementById('nombre').value = b.nombre;
            document.getElementById('asunto').value = b.asunto;
            document.getElementById('remNombre').value = b.remitente.nombre;
            document.getElementById('remEmail').value = b.remitente.email;
            htmlContent.value = b.htmlContent;
            estadoEl.textContent = 'estado: ' + b.estado;
            refreshPreview();
          });
        });
      }
      cargarLista();

      document.getElementById('btn-nuevo').onclick = () => {
        document.getElementById('id').value = '';
        document.getElementById('nombre').value = 'Nueva plantilla';
        document.getElementById('asunto').value = '';
        htmlContent.value = HTML_EJEMPLO;
        estadoEl.textContent = 'estado: borrador';
        refreshPreview();
        msg.innerHTML = '';
      };

      document.getElementById('btn-guardar').onclick = async () => {
        try {
          const body = {
            id: document.getElementById('id').value || undefined,
            nombre: document.getElementById('nombre').value,
            asunto: document.getElementById('asunto').value,
            htmlContent: htmlContent.value,
            remitente: {
              nombre: document.getElementById('remNombre').value,
              email: document.getElementById('remEmail').value
            }
          };
          const res = await fetch('/api/borradores', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
          document.getElementById('id').value = data.id;
          estadoEl.textContent = 'estado: ' + data.estado;
          setMsg(true, 'Borrador guardado en local (aún no está en Brevo).');
          cargarLista();
        } catch (err) { setMsg(false, err.message || String(err)); }
      };

      document.getElementById('btn-aprobar').onclick = async () => {
        const id = document.getElementById('id').value;
        if (!id) { setMsg(false, 'Guarda el borrador antes de aprobar.'); return; }
        try {
          const ids = document.getElementById('listIds').value.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0);
          const res = await fetch('/api/plantillas/aprobar', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ borradorId: id, ...(ids.length ? { listIds: ids } : {}) })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo aprobar');
          estadoEl.textContent = 'estado: aprobado';
          setMsg(true, 'Aprobado: plantilla #' + data.plantillaId + ', campaña borrador #' + data.campanaId + '. No se envió.');
          cargarLista();
        } catch (err) { setMsg(false, err.message || String(err)); }
      };
    </script>`,
  );
}
