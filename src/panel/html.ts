/**
 * HTML del panel para Hostinger (sin Next.js).
 * Identidad Bodasesor: azul, blanco y gris + logo.
 */

import { BUILD_ISO, BUILD_LABEL } from "../build-info.js";

type PaginaActiva = "inicio" | "crear" | "contactos" | "plantillas" | "sitio";

function layout(titulo: string, activo: PaginaActiva, cuerpo: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${titulo} · Bodasesor Correos</title>
  <link rel="icon" href="/assets/mark.svg" type="image/svg+xml"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root{
      --bg:#f4f7fb;
      --ink:#1f2937;
      --muted:#5b6b7c;
      --line:#d5deea;
      --brand:#14325c;
      --brand2:#0f2444;
      --brand-mid:#3d6ea5;
      --card:#ffffff;
      --danger:#8b3a3a;
      --ok-bg:#eaf1f8;
      --ok-line:#c5d6ea;
      --stat:#e8eef6;
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:"Source Sans 3",system-ui,sans-serif;color:var(--ink);background:
      radial-gradient(1000px 420px at 0% -10%, #d7e6f7 0%, transparent 55%),
      radial-gradient(800px 360px at 100% 0%, #e9eef4 0%, transparent 50%),
      var(--bg)}
    .topbar{background:linear-gradient(180deg,var(--brand) 0%, var(--brand2) 100%);color:#fff;padding:14px 0 0}
    .topbar-inner{max-width:1100px;margin:0 auto;padding:0 16px 14px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .logo-link{display:flex;align-items:center;gap:12px;text-decoration:none;color:#fff}
    .logo-link img{height:48px;width:auto;display:block}
    .logo-sub{font-size:.9rem;opacity:.85}
    .topbar-right{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-left:auto}
    nav{display:flex;gap:8px;flex-wrap:wrap}
    nav a{padding:9px 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;text-decoration:none;color:#fff;background:rgba(255,255,255,.06)}
    nav a.activo,nav a:hover{background:#fff;color:var(--brand);border-color:#fff}
    .build-stamp{font-size:.72rem;line-height:1.35;opacity:.88;text-align:right;color:rgba(255,255,255,.92);white-space:nowrap}
    .build-stamp strong{display:block;font-weight:600;letter-spacing:.02em}
    .shell{max-width:1100px;margin:0 auto;padding:24px 16px 56px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;box-shadow:0 18px 40px rgba(20,50,92,.08)}
    h2{font-family:Fraunces,Georgia,serif;margin:0 0 8px;color:var(--brand)}
    .lead{color:var(--muted);margin:0 0 18px}
    label{display:grid;gap:6px;font-weight:600;margin-bottom:12px}
    input,textarea,button,select{font:inherit}
    input,textarea{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#fff}
    textarea{min-height:220px;font-family:ui-monospace,Menlo,monospace;font-size:.9rem}
    .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0}
    button{appearance:none;border:0;border-radius:10px;padding:11px 16px;background:var(--brand);color:#fff;font-weight:700;cursor:pointer}
    button:hover{background:var(--brand2)}
    button.sec{background:#fff;color:var(--brand);border:1px solid var(--brand)}
    button:disabled{opacity:.55;cursor:not-allowed}
    .grid{display:grid;grid-template-columns:1.05fr .95fr;gap:16px}
    @media(max-width:900px){.grid{grid-template-columns:1fr}}
    iframe{width:100%;min-height:520px;border:1px solid var(--line);border-radius:12px;background:#fff}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0}
    .stat{background:var(--stat);border-radius:12px;padding:12px}
    .stat strong{display:block;font-family:Fraunces,Georgia,serif;font-size:1.5rem;color:var(--brand)}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}
    th{color:var(--muted);font-size:.85rem;text-transform:uppercase;letter-spacing:.04em}
    .err{background:#f8ecec;border:1px solid #e5c7c7;color:var(--danger);padding:10px 12px;border-radius:10px}
    .ok{background:var(--ok-bg);border:1px solid var(--ok-line);padding:10px 12px;border-radius:10px;color:var(--brand)}
    .muted{color:var(--muted)}
    .ideas{display:grid;gap:10px;margin:12px 0}
    .idea{border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;background:#fff;text-align:left}
    .idea:hover,.idea.sel{border-color:var(--brand);background:var(--ok-bg)}
    .idea strong{display:block;color:var(--brand);margin-bottom:4px}
    .logo-box{border:1px dashed var(--line);border-radius:12px;padding:16px;background:#fafbfd;display:grid;gap:10px;justify-items:start}
    .logo-box img{max-height:72px;max-width:220px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px}
    .gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:8px}
    .gallery figure{margin:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;cursor:pointer}
    .gallery figure.sel{outline:2px solid var(--brand)}
    .gallery img{display:block;width:100%;height:80px;object-fit:cover}
    .gallery figcaption{font-size:.7rem;padding:6px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .chip{display:inline-block;font-size:.75rem;padding:2px 8px;border-radius:999px;background:var(--stat);color:var(--brand);margin-left:6px}
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="logo-link" href="/panel">
        <img src="/assets/logo-white.svg" alt="Bodasesor Eventos"/>
        <span class="logo-sub">Panel de correos</span>
      </a>
      <div class="topbar-right">
        <nav>
          <a href="/panel" class="${activo === "inicio" ? "activo" : ""}">Inicio</a>
          <a href="/panel/crear" class="${activo === "crear" ? "activo" : ""}">Crear mail</a>
          <a href="/panel/plantillas" class="${activo === "plantillas" ? "activo" : ""}">Plantillas</a>
          <a href="/panel/sitio" class="${activo === "sitio" ? "activo" : ""}">Mi sitio</a>
          <a href="/panel/contactos" class="${activo === "contactos" ? "activo" : ""}">Contactos</a>
        </nav>
        <div class="build-stamp" title="${BUILD_ISO}">
          <strong>Última actualización</strong>
          ${BUILD_LABEL}
        </div>
      </div>
    </div>
  </header>
  <div class="shell">
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
      <p class="lead">Escribe en palabras normales qué quieres comunicar. La IA lo convierte en plantilla HTML. Las plantillas se guardan en el proyecto y, al aprobar, también en Brevo.</p>
      <div class="row">
        <a href="/panel/crear"><button type="button">Crear mail</button></a>
        <a href="/panel/sitio"><button type="button" class="sec">Mi sitio</button></a>
        <a href="/panel/plantillas"><button type="button" class="sec">Plantillas</button></a>
        <a href="/panel/contactos"><button type="button" class="sec">Contactos</button></a>
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

export function paginaPlantillasHtml(): string {
  return layout(
    "Plantillas",
    "plantillas",
    `<section class="card">
      <h2>Plantillas</h2>
      <p class="lead">Emails promocionales Bodasesor (navy / cream / gold) listos para Brevo. Elige un tema, edita el HTML, guarda borrador y aprueba sin enviar.</p>
      <div class="row">
        <label style="margin:0;font-weight:600;display:flex;gap:8px;align-items:center">
          Tema
          <select id="tema">
            <option value="posadas">Posadas</option>
            <option value="cancun">Cancún</option>
            <option value="cdmx">Ciudad de México</option>
            <option value="guadalajara">Guadalajara</option>
          </select>
        </label>
        <button type="button" class="sec" id="btn-tema">Cargar tema</button>
        <button type="button" class="sec" id="btn-nuevo">Nuevo</button>
        <button type="button" class="sec" id="btn-guardar">Guardar borrador</button>
        <button type="button" id="btn-aprobar">Aprobar y enviar a Brevo</button>
        <span id="estado" class="muted">estado: borrador</span>
      </div>
      <div id="msg"></div>
      <div class="grid">
        <form id="form-plantilla">
          <input type="hidden" id="id"/>
          <label>Nombre interno<input id="nombre" value="Newsletter Posadas" required/></label>
          <label>Asunto<input id="asunto" value="Bodasesor · Posadas" required/></label>
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
      <h3 style="font-family:Fraunces,Georgia,serif;margin-top:28px">Biblioteca del proyecto (permanente)</h3>
      <p class="muted">Aquí no se pierden al aprobar. Puedes reabrirlas y volver a subirlas a Brevo.</p>
      <div id="biblioteca"></div>
    </section>
    <script>
      const htmlContent = document.getElementById('htmlContent');
      const preview = document.getElementById('preview');
      const msg = document.getElementById('msg');
      const estadoEl = document.getElementById('estado');
      function refreshPreview(){ preview.srcdoc = htmlContent.value; }
      htmlContent.addEventListener('input', refreshPreview);

      function setMsg(ok, text){ msg.innerHTML = '<div class="' + (ok?'ok':'err') + '">' + escapeHtml(text) + '</div>'; }
      function escapeHtml(s){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

      async function cargarTema(tema){
        const res = await fetch('/api/plantillas/tema', {
          method:'POST', headers:{'content-type':'application/json'},
          body: JSON.stringify({ tema })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el tema');
        htmlContent.value = data.htmlContent;
        document.getElementById('nombre').value = data.nombre || ('Newsletter ' + tema);
        document.getElementById('asunto').value = data.asunto || '';
        refreshPreview();
        return data;
      }

      document.getElementById('btn-tema').onclick = async () => {
        try {
          const tema = document.getElementById('tema').value;
          await cargarTema(tema);
          setMsg(true, 'Tema «' + tema + '» cargado. Placeholders [[FOTO_HERO]], [[ENLACE_COTIZAR]], etc. listos para Brevo.');
        } catch (err) { setMsg(false, err.message || String(err)); }
      };

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
      cargarTema('posadas').catch(err => setMsg(false, err.message || String(err)));

      document.getElementById('btn-nuevo').onclick = async () => {
        document.getElementById('id').value = '';
        estadoEl.textContent = 'estado: borrador';
        msg.innerHTML = '';
        try { await cargarTema(document.getElementById('tema').value); }
        catch (err) { setMsg(false, err.message || String(err)); }
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
          setMsg(true, 'Aprobado en Brevo (plantilla #' + data.plantillaId + ') y guardado en biblioteca del proyecto (' + data.bibliotecaId + '). No se envió la campaña.');
          cargarLista();
          cargarBiblioteca();
        } catch (err) { setMsg(false, err.message || String(err)); }
      };

      async function cargarBiblioteca(){
        const res = await fetch('/api/biblioteca');
        const data = await res.json();
        const items = data.items || [];
        const el = document.getElementById('biblioteca');
        if (!el) return;
        if (!items.length) { el.innerHTML = '<p class="muted">Aún no hay plantillas en la biblioteca del proyecto.</p>'; return; }
        el.innerHTML = '<table><thead><tr><th>Nombre</th><th>Asunto</th><th>Brevo</th><th></th></tr></thead><tbody>' +
          items.map(b => '<tr><td>'+escapeHtml(b.nombre)+'</td><td>'+escapeHtml(b.asunto)+'</td><td>'+escapeHtml(b.brevoPlantillaId ? ('#'+b.brevoPlantillaId) : 'solo local')+'</td><td><button type="button" class="sec" data-lib="'+b.id+'">Abrir</button></td></tr>').join('') +
          '</tbody></table>';
        el.querySelectorAll('button[data-lib]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const r = await fetch('/api/biblioteca/' + btn.getAttribute('data-lib'));
            const b = await r.json();
            document.getElementById('id').value = '';
            document.getElementById('nombre').value = b.nombre;
            document.getElementById('asunto').value = b.asunto;
            document.getElementById('remNombre').value = b.remitente.nombre;
            document.getElementById('remEmail').value = b.remitente.email;
            htmlContent.value = b.htmlContent;
            estadoEl.textContent = 'estado: biblioteca local' + (b.brevoPlantillaId ? ' + Brevo #'+b.brevoPlantillaId : '');
            refreshPreview();
          });
        });
      }
      cargarBiblioteca();
    </script>`,
  );
}

export function paginaSitioHtml(): string {
  return layout(
    "Mi sitio",
    "sitio",
    `<section class="card">
      <h2>Mi sitio (Bodasesor)</h2>
      <p class="lead">Inspección completa: sitemap (todas las URLs), menús, catálogo JS de productos/blog y buscador. Verás un contador del tiempo restante mientras corre.</p>
      <div id="msg"></div>
      <div class="row">
        <button type="button" id="btn-inspeccionar">Inspeccionar página</button>
        <button type="button" class="sec" id="btn-guardar">Guardar redes / URLs</button>
        <span id="meta" class="muted"></span>
      </div>
      <div id="inspeccion-box" class="logo-box" style="margin:14px 0;display:none">
        <strong id="insp-etapa">Inspección</strong>
        <div style="width:100%;background:#e8eef6;border-radius:999px;height:12px;overflow:hidden">
          <div id="insp-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#14325c,#3d6ea5);transition:width .35s"></div>
        </div>
        <div class="row" style="margin:0;justify-content:space-between;width:100%">
          <span id="insp-detalle" class="muted">—</span>
          <span id="insp-eta" style="font-family:Fraunces,Georgia,serif;font-size:1.4rem;color:var(--brand)">--:--</span>
        </div>
        <div id="insp-contadores" class="stats" style="width:100%"></div>
      </div>
      <div class="grid">
        <div>
          <label>URL base<input id="baseUrl" value="https://bodasesor.com"/></label>
          <label>Resumen del negocio<textarea id="resumen" style="font-family:inherit;min-height:90px"></textarea></label>
          <label>URL cotizar / CTA<input id="cotizarUrl"/></label>
          <label>URL blog<input id="blogUrl"/></label>
          <label>Instagram<input id="instagram" placeholder="https://instagram.com/..."/></label>
          <label>Facebook<input id="facebook" placeholder="https://facebook.com/..."/></label>
          <label>WhatsApp (wa.me)<input id="whatsapp" placeholder="https://wa.me/52..."/></label>
          <label>LinkedIn<input id="linkedin"/></label>
          <p class="muted" id="notas"></p>
          <h3 style="font-family:Fraunces,Georgia,serif">Qué hace falta para “leer todo”</h3>
          <ol class="muted" style="line-height:1.6">
            <li>Permitir en el WAF/Cloudflare el User-Agent <code>BodasesorMailingBot/1.0</code> (o poner <code>SITIO_USER_AGENT</code> en Hostinger).</li>
            <li>O dejar el sitemap público (ya lo está) y completar redes aquí.</li>
            <li>Opcional: feed/API de productos si más adelante quieres descripciones ricas sin scrapear HTML.</li>
          </ol>
        </div>
        <div>
          <h3 style="font-family:Fraunces,Georgia,serif;margin-top:0">Inventario</h3>
          <div id="stats" class="stats"></div>
          <h4>Productos / servicios</h4>
          <div id="productos" style="max-height:220px;overflow:auto"></div>
          <h4>Blog (muestra)</h4>
          <div id="blog" style="max-height:220px;overflow:auto"></div>
        </div>
      </div>
    </section>
    <script>
      const msg = document.getElementById('msg');
      function setMsg(ok, text){ msg.innerHTML = '<div class="' + (ok?'ok':'err') + '">' + escapeHtml(text) + '</div>'; }
      function escapeHtml(s){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

      function pintar(c){
        document.getElementById('baseUrl').value = c.baseUrl || '';
        document.getElementById('resumen').value = c.resumen || '';
        document.getElementById('cotizarUrl').value = c.cotizarUrl || '';
        document.getElementById('blogUrl').value = c.blogUrl || '';
        document.getElementById('instagram').value = (c.redes && c.redes.instagram) || '';
        document.getElementById('facebook').value = (c.redes && c.redes.facebook) || '';
        document.getElementById('whatsapp').value = (c.redes && c.redes.whatsapp) || '';
        document.getElementById('linkedin').value = (c.redes && c.redes.linkedin) || '';
        document.getElementById('notas').textContent = c.notas || '';
        document.getElementById('meta').textContent = c.inspeccionEn || c.sitemapSyncEn
          ? ('URLs sitemap: ' + (c.sitemapTotalUrls||'?') + ' · Productos: ' + (c.productos||[]).length + ' · Blog: ' + (c.articulosBlog||[]).length + ' · Menús: ' + ((c.menus||[]).length))
          : 'Aún no inspeccionado';
        document.getElementById('stats').innerHTML =
          '<div class="stat"><strong>'+(c.productos||[]).length+'</strong><span>Productos</span></div>' +
          '<div class="stat"><strong>'+(c.articulosBlog||[]).length+'</strong><span>Blog</span></div>' +
          '<div class="stat"><strong>'+((c.menus||[]).length)+'</strong><span>Menús</span></div>' +
          '<div class="stat"><strong>'+(c.ciudades||[]).length+'</strong><span>Ciudades</span></div>' +
          '<div class="stat"><strong>'+(c.sitemapTotalUrls||0)+'</strong><span>URLs</span></div>';
        document.getElementById('productos').innerHTML = '<ul>' + (c.productos||[]).slice(0,60).map(p =>
          '<li><a href="'+escapeHtml(p.url)+'" target="_blank" rel="noopener">'+escapeHtml(p.nombre)+'</a> <span class="muted">'+escapeHtml(p.slug)+'</span></li>'
        ).join('') + ((c.productos||[]).length>60?'<li class="muted">… y '+(c.productos.length-60)+' más</li>':'') + '</ul>';
        document.getElementById('blog').innerHTML = '<ul>' + (c.articulosBlog||[]).slice(0,20).map(a =>
          '<li><a href="'+escapeHtml(a.url)+'" target="_blank" rel="noopener">'+escapeHtml(a.titulo)+'</a></li>'
        ).join('') + ((c.articulosBlog||[]).length>20?'<li class="muted">… y '+(c.articulosBlog.length-20)+' más</li>':'') + '</ul>';
      }

      function fmtEta(seg){
        if (seg==null || seg<0) return '--:--';
        const m=Math.floor(seg/60), s=seg%60;
        return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
      }

      function pintarInspeccion(insp){
        const box=document.getElementById('inspeccion-box');
        if (!insp || insp.estado==='idle') { box.style.display='none'; return; }
        box.style.display='grid';
        document.getElementById('insp-etapa').textContent = insp.etapa + ' (' + insp.progreso + '%)';
        document.getElementById('insp-bar').style.width = Math.max(0, Math.min(100, insp.progreso)) + '%';
        document.getElementById('insp-detalle').textContent = insp.detalle || '';
        document.getElementById('insp-eta').textContent =
          insp.estado==='completada' ? '00:00' :
          insp.estado==='error' ? 'Error' :
          fmtEta(insp.etaSegundos);
        const c=insp.contadores||{};
        document.getElementById('insp-contadores').innerHTML =
          '<div class="stat"><strong>'+(c.urlsSitemap||0)+'</strong><span>URLs</span></div>'+
          '<div class="stat"><strong>'+(c.productos||0)+'</strong><span>Productos</span></div>'+
          '<div class="stat"><strong>'+(c.blogs||0)+'</strong><span>Blog</span></div>'+
          '<div class="stat"><strong>'+(c.menus||0)+'</strong><span>Menús</span></div>';
      }

      let pollTimer=null;
      async function pollInspeccion(){
        const res=await fetch('/api/sitio/inspeccionar');
        const data=await res.json();
        const insp=data.inspeccion;
        pintarInspeccion(insp);
        if (insp.estado==='corriendo') {
          pollTimer=setTimeout(pollInspeccion, 1000);
        } else {
          if (insp.estado==='completada') {
            setMsg(true, insp.detalle);
            cargar();
          } else if (insp.estado==='error') {
            setMsg(false, insp.error || insp.detalle || 'Error en inspección');
          }
        }
      }

      async function cargar(){
        const res = await fetch('/api/sitio');
        const c = await res.json();
        pintar(c);
      }
      cargar();
      // recuperar inspección en curso al abrir
      fetch('/api/sitio/inspeccionar').then(r=>r.json()).then(d=>{
        if (d.inspeccion && d.inspeccion.estado==='corriendo') pollInspeccion();
        else if (d.inspeccion && d.inspeccion.estado!=='idle') pintarInspeccion(d.inspeccion);
      }).catch(()=>{});

      document.getElementById('btn-inspeccionar').onclick = async () => {
        const btn = document.getElementById('btn-inspeccionar');
        btn.disabled = true; btn.textContent = 'Inspeccionando…';
        try {
          const res = await fetch('/api/sitio/inspeccionar', { method:'POST', headers:{'content-type':'application/json'}, body:'{}' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo iniciar');
          setMsg(true, 'Inspección iniciada. El contador muestra el tiempo estimado restante.');
          pintarInspeccion(data.inspeccion);
          if (pollTimer) clearTimeout(pollTimer);
          pollTimer=setTimeout(pollInspeccion, 800);
        } catch (err) { setMsg(false, err.message || String(err)); }
        finally { btn.disabled = false; btn.textContent = 'Inspeccionar página'; }
      };

      document.getElementById('btn-guardar').onclick = async () => {
        try {
          const body = {
            baseUrl: document.getElementById('baseUrl').value.trim(),
            resumen: document.getElementById('resumen').value.trim(),
            cotizarUrl: document.getElementById('cotizarUrl').value.trim(),
            blogUrl: document.getElementById('blogUrl').value.trim(),
            redes: {
              instagram: document.getElementById('instagram').value.trim() || undefined,
              facebook: document.getElementById('facebook').value.trim() || undefined,
              whatsapp: document.getElementById('whatsapp').value.trim() || undefined,
              linkedin: document.getElementById('linkedin').value.trim() || undefined
            }
          };
          const res = await fetch('/api/sitio', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
          pintar(data);
          setMsg(true, 'Redes y URLs guardadas. Ya se usarán al crear mails.');
        } catch (err) { setMsg(false, err.message || String(err)); }
      };
    </script>`,
  );
}

export function paginaCrearHtml(): string {
  return layout(
    "Crear mail",
    "crear",
    `<section class="card">
      <h2>Crear mail</h2>
      <p class="lead">Escribe en <strong>palabras normales</strong> qué debe decir el correo (a quién, qué ofrecer, qué enlazar). La IA lo convierte en HTML de plantilla. No necesitas escribir código.</p>
      <div id="msg"></div>
      <div class="grid">
        <div>
          <label>Instrucciones del mail (lenguaje natural)
            <textarea id="brief" style="font-family:inherit;min-height:140px" placeholder="Ejemplo: Quiero un mail para parejas que planean boda en Cancún en verano. Hablar de banquetes frente al mar, florería y fotografía. Que cotizen por WhatsApp y lean un artículo del blog sobre tendencias."></textarea>
          </label>
          <div class="row">
            <button type="button" class="sec" id="btn-ideas">Ideas de temas (IA)</button>
            <label style="display:flex;gap:8px;align-items:center;font-weight:500;margin:0">
              <input type="checkbox" id="genImg" checked/>
              Generar imágenes nuevas si no hay compatibles
            </label>
          </div>
          <div id="ideas" class="ideas"></div>
          <label>Destino / tema<input id="destino" placeholder="Cancún, Posadas, CDMX…"/></label>
          <div class="logo-box">
            <strong>Logo del mail</strong>
            <span class="muted">Sube el logo que quieres usar. Se guarda para próximos correos.</span>
            <input type="file" id="logoFile" accept="image/png,image/jpeg,image/svg+xml,image/webp"/>
            <img id="logoPreview" alt="Logo" style="display:none"/>
            <input type="hidden" id="logoId"/>
            <div class="row" style="margin:0">
              <button type="button" class="sec" id="btn-logo-lib">Elegir logo guardado</button>
            </div>
          </div>
          <div class="row">
            <button type="button" id="btn-generar">Generar borrador</button>
            <button type="button" class="sec" id="btn-guardar" disabled>Guardar borrador</button>
            <span id="metaImg" class="muted"></span>
          </div>
          <label>Asunto <span class="muted">(se genera solo con tus instrucciones)</span>
            <input id="asunto" readonly placeholder="Se completa al generar el borrador"/>
          </label>
          <label>Nombre interno <span class="muted">(se genera solo con tus instrucciones)</span>
            <input id="nombre" readonly placeholder="Se completa al generar el borrador"/>
          </label>
          <h3 style="font-family:Fraunces,Georgia,serif">Biblioteca de imágenes</h3>
          <div id="gallery" class="gallery"></div>
        </div>
        <div>
          <h3 style="font-family:Fraunces,Georgia,serif;margin-top:0">Pre-visualización</h3>
          <iframe id="preview" title="Vista previa"></iframe>
        </div>
      </div>
      <textarea id="htmlContent" style="display:none"></textarea>
    </section>
    <script>
      let ideaSel = null;
      let ultimoHtml = '';
      const msg = document.getElementById('msg');
      const preview = document.getElementById('preview');
      function setMsg(ok, text){ msg.innerHTML = '<div class="' + (ok?'ok':'err') + '">' + escapeHtml(text) + '</div>'; }
      function escapeHtml(s){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

      async function cargarGaleria(){
        const res = await fetch('/api/media');
        const data = await res.json();
        const items = data.items || [];
        const gal = document.getElementById('gallery');
        if (!items.length) { gal.innerHTML = '<p class="muted">Aún no hay imágenes guardadas.</p>'; return; }
        gal.innerHTML = items.map(i =>
          '<figure data-id="'+i.id+'" data-tipo="'+i.tipo+'" title="'+escapeHtml((i.destino||'')+' '+(i.prompt||i.tipo))+'">' +
          '<img src="'+escapeHtml(i.urlPublica)+'" alt=""/>' +
          '<figcaption>'+escapeHtml(i.tipo)+(i.destino?' · '+escapeHtml(i.destino):'')+'</figcaption></figure>'
        ).join('');
        gal.querySelectorAll('figure').forEach(fig => {
          fig.onclick = () => {
            if (fig.getAttribute('data-tipo') === 'logo') {
              document.getElementById('logoId').value = fig.getAttribute('data-id');
              const img = document.getElementById('logoPreview');
              img.src = fig.querySelector('img').src;
              img.style.display = 'block';
              setMsg(true, 'Logo de la biblioteca seleccionado.');
            }
          };
        });
      }
      cargarGaleria();

      document.getElementById('btn-ideas').onclick = async () => {
        const brief = document.getElementById('brief').value.trim();
        if (!brief) { setMsg(false, 'Escribe primero qué quieres en el mail.'); return; }
        const btn = document.getElementById('btn-ideas');
        btn.disabled = true; btn.textContent = 'Pensando ideas…';
        try {
          const res = await fetch('/api/ideas-temas', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ brief })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudieron generar ideas');
          const box = document.getElementById('ideas');
          box.innerHTML = data.ideas.map((idea, idx) =>
            '<button type="button" class="idea" data-idx="'+idx+'"><strong>'+escapeHtml(idea.titulo)+'</strong>' +
            '<span class="chip">'+escapeHtml(idea.destino)+'</span> · '+escapeHtml(idea.tono) +
            '<div class="muted" style="margin-top:6px">'+escapeHtml(idea.resumen)+'</div></button>'
          ).join('');
          const ideas = data.ideas;
          box.querySelectorAll('.idea').forEach(el => {
            el.onclick = () => {
              box.querySelectorAll('.idea').forEach(x => x.classList.remove('sel'));
              el.classList.add('sel');
              const i = ideas[Number(el.getAttribute('data-idx'))];
              ideaSel = i;
              document.getElementById('destino').value = i.destino;
              setMsg(true, 'Tema elegido: ' + i.titulo);
            };
          });
          setMsg(true, '4 ideas listas. Elige una o sigue con tu brief.');
        } catch (err) { setMsg(false, err.message || String(err)); }
        finally { btn.disabled = false; btn.textContent = 'Ideas de temas (IA)'; }
      };

      document.getElementById('logoFile').onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
          });
          const res = await fetch('/api/media/upload', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({
              dataBase64: dataUrl,
              mimeType: file.type || 'image/png',
              tipo: 'logo',
              etiquetas: ['logo','bodasesor'],
              prompt: file.name
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo subir el logo');
          document.getElementById('logoId').value = data.item.id;
          const img = document.getElementById('logoPreview');
          img.src = data.item.urlPublica;
          img.style.display = 'block';
          setMsg(true, 'Logo guardado en la biblioteca.');
          cargarGaleria();
        } catch (err) { setMsg(false, err.message || String(err)); }
      };

      document.getElementById('btn-logo-lib').onclick = () => {
        setMsg(true, 'Haz clic en un logo de la biblioteca (abajo) para usarlo.');
      };

      document.getElementById('btn-generar').onclick = async () => {
        const brief = document.getElementById('brief').value.trim();
        if (!brief) { setMsg(false, 'Escribe el brief del mail.'); return; }
        const btn = document.getElementById('btn-generar');
        btn.disabled = true; btn.textContent = 'Generando…';
        document.getElementById('btn-guardar').disabled = true;
        try {
          const body = {
            brief,
            destino: document.getElementById('destino').value.trim() || undefined,
            logoId: document.getElementById('logoId').value || undefined,
            generarImagenes: document.getElementById('genImg').checked,
            ideaTitulo: ideaSel ? ideaSel.titulo : undefined
          };
          const res = await fetch('/api/composer/generar', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify(body)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo generar');
          ultimoHtml = data.htmlContent;
          document.getElementById('htmlContent').value = data.htmlContent;
          const asunto = (data.asunto || '').trim();
          const nombre = (data.nombre || (asunto ? ('Bodasesor · ' + asunto) : '')).trim();
          document.getElementById('asunto').value = asunto;
          document.getElementById('nombre').value = nombre;
          if (!asunto) throw new Error('La IA no devolvió asunto; revisa el modelo Gemini.');
          preview.srcdoc = data.htmlContent;
          document.getElementById('metaImg').textContent =
            'Imágenes: ' + (data.imagenes?.reutilizadas||0) + ' reutilizadas, ' + (data.imagenes?.generadas||0) + ' nuevas';
          document.getElementById('btn-guardar').disabled = false;
          setMsg(true, data.advertencia
            ? ('Borrador listo. Asunto: «' + asunto + '». Avisos: ' + data.advertencia)
            : ('Borrador listo. Asunto y nombre interno generados desde tus instrucciones.'));
          cargarGaleria();
        } catch (err) { setMsg(false, err.message || String(err)); }
        finally { btn.disabled = false; btn.textContent = 'Generar borrador'; }
      };

      document.getElementById('btn-guardar').onclick = async () => {
        try {
          const asunto = document.getElementById('asunto').value.trim();
          const nombre = document.getElementById('nombre').value.trim();
          if (!asunto || !nombre) {
            setMsg(false, 'Primero genera el borrador para completar asunto y nombre interno.');
            return;
          }
          const remitente = { nombre: 'Bodasesor', email: 'hola@bodasesor.com' };
          const payload = {
            nombre,
            asunto,
            htmlContent: document.getElementById('htmlContent').value || ultimoHtml,
            remitente,
            instrucciones: document.getElementById('brief').value.trim(),
            destino: document.getElementById('destino').value.trim() || undefined,
            origen: 'composer'
          };
          const resB = await fetch('/api/borradores', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify(payload)
          });
          const borrador = await resB.json();
          if (!resB.ok) throw new Error(borrador.error || 'No se pudo guardar borrador');
          const resL = await fetch('/api/biblioteca', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ ...payload, borradorId: borrador.id })
          });
          const lib = await resL.json();
          if (!resL.ok) throw new Error(lib.error || 'No se pudo guardar en biblioteca');
          setMsg(true, 'Guardado en el proyecto (biblioteca) y como borrador. En Plantillas puedes aprobarlo a Brevo. biblioteca=' + lib.id);
        } catch (err) { setMsg(false, err.message || String(err)); }
      };
    </script>`,
  );
}
