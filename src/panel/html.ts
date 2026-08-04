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
      --bg:#eef3f9;
      --ink:#1a2433;
      --muted:#5b6b7c;
      --line:#cfd9e6;
      --brand:#14325c;
      --brand2:#0f2444;
      --brand-mid:#3d6ea5;
      --card:#ffffff;
      --danger:#8b3a3a;
      --ok-bg:#eaf1f8;
      --ok-line:#c5d6ea;
      --stat:#e8eef6;
      --wa:#25D366;
      --shadow:0 14px 36px rgba(20,50,92,.10);
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:"Source Sans 3",system-ui,sans-serif;color:var(--ink);background:
      radial-gradient(1100px 480px at 0% -10%, #d3e4f8 0%, transparent 55%),
      radial-gradient(900px 400px at 100% 0%, #e7edf4 0%, transparent 50%),
      linear-gradient(180deg,#f7faff 0%, var(--bg) 40%, #e9eef5 100%)}
    .topbar{background:linear-gradient(180deg,var(--brand) 0%, var(--brand2) 100%);color:#fff;padding:14px 0 0;box-shadow:0 10px 28px rgba(15,36,68,.28)}
    .topbar-inner{max-width:1140px;margin:0 auto;padding:0 16px 14px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .logo-link{display:flex;align-items:center;gap:12px;text-decoration:none;color:#fff}
    .logo-link img{height:48px;width:auto;display:block}
    .logo-sub{font-size:.9rem;opacity:.85}
    .topbar-right{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-left:auto}
    nav{display:flex;gap:8px;flex-wrap:wrap}
    nav a{padding:9px 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;text-decoration:none;color:#fff;background:rgba(255,255,255,.06);transition:transform .15s ease, background .15s ease, color .15s ease, box-shadow .15s ease}
    nav a:hover{background:#fff;color:var(--brand);border-color:#fff;transform:translateY(-1px)}
    nav a:active{transform:translateY(1px) scale(.97)}
    nav a.activo{background:#fff;color:var(--brand);border-color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.18)}
    .build-stamp{font-size:.72rem;line-height:1.35;opacity:.88;text-align:right;color:rgba(255,255,255,.92);white-space:nowrap}
    .build-stamp strong{display:block;font-weight:600;letter-spacing:.02em}
    .shell{max-width:1140px;margin:0 auto;padding:28px 16px 72px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:26px;box-shadow:var(--shadow)}
    .panel-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--line)}
    .panel-hero h2{margin:0 0 6px}
    .panel-hero .lead{margin:0;max-width:62ch}
    .steps{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
    .step{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:var(--stat);color:var(--brand);font-size:.86rem;font-weight:600;border:1px solid var(--ok-line)}
    .step span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--brand);color:#fff;font-size:.75rem}
    .section-block{margin:18px 0;padding:16px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(180deg,#fbfcfe,#fff)}
    .section-block > h3{margin:0 0 6px;font-family:Fraunces,Georgia,serif;color:var(--brand);font-size:1.15rem}
    .section-block > .muted{margin:0 0 12px}
    h2{font-family:Fraunces,Georgia,serif;margin:0 0 8px;color:var(--brand)}
    .lead{color:var(--muted);margin:0 0 18px;line-height:1.5}
    label{display:grid;gap:6px;font-weight:600;margin-bottom:12px}
    input,textarea,button,select{font:inherit}
    input,textarea,select{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;transition:border-color .15s ease, box-shadow .15s ease}
    input:focus,textarea:focus,select:focus{outline:none;border-color:var(--brand-mid);box-shadow:0 0 0 3px rgba(61,110,165,.18)}
    textarea{min-height:220px;font-family:ui-monospace,Menlo,monospace;font-size:.9rem}
    .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0}
    button,a.btn{
      appearance:none;border:0;border-radius:12px;padding:12px 18px;background:var(--brand);color:#fff;font-weight:700;cursor:pointer;
      text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;
      box-shadow:0 8px 18px rgba(20,50,92,.22);
      transition:transform .12s ease, box-shadow .12s ease, background .12s ease, filter .12s ease;
      position:relative;overflow:hidden;
    }
    button::after,a.btn::after{
      content:"";position:absolute;inset:0;background:radial-gradient(circle at center, rgba(255,255,255,.35), transparent 55%);
      opacity:0;transform:scale(.4);transition:opacity .2s ease, transform .2s ease;pointer-events:none;
    }
    button:hover,a.btn:hover{background:var(--brand2);transform:translateY(-2px);box-shadow:0 12px 24px rgba(20,50,92,.28)}
    button:active,a.btn:active{transform:translateY(1px) scale(.97);box-shadow:0 3px 8px rgba(20,50,92,.2)}
    button:active::after,a.btn:active::after{opacity:1;transform:scale(1.4)}
    button.sec,a.btn.sec{background:#fff;color:var(--brand);border:1.5px solid var(--brand);box-shadow:0 6px 14px rgba(20,50,92,.1)}
    button.sec:hover,a.btn.sec:hover{background:var(--ok-bg)}
    button.wa{background:var(--wa);color:#fff;border:0;box-shadow:0 8px 18px rgba(37,211,102,.35)}
    button.wa:hover{filter:brightness(.95);background:#1ebe57}
    button:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
    button.pulse{animation:btnPulse 1.6s ease-in-out infinite}
    @keyframes btnPulse{
      0%,100%{box-shadow:0 8px 18px rgba(20,50,92,.22)}
      50%{box-shadow:0 10px 26px rgba(20,50,92,.38),0 0 0 6px rgba(61,110,165,.12)}
    }
    .grid{display:grid;grid-template-columns:1.05fr .95fr;gap:18px}
    @media(max-width:900px){.grid{grid-template-columns:1fr}}
    iframe{width:100%;min-height:560px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0}
    .stat{background:var(--stat);border-radius:12px;padding:12px;border:1px solid var(--ok-line)}
    .stat strong{display:block;font-family:Fraunces,Georgia,serif;font-size:1.5rem;color:var(--brand)}
    table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:12px 10px;border-bottom:1px solid var(--line)}
    th{color:var(--muted);font-size:.85rem;text-transform:uppercase;letter-spacing:.04em;background:#f7fafc}
    tr:hover td{background:#f9fbfe}
    .err{background:#f8ecec;border:1px solid #e5c7c7;color:var(--danger);padding:10px 12px;border-radius:10px}
    .ok{background:var(--ok-bg);border:1px solid var(--ok-line);padding:10px 12px;border-radius:10px;color:var(--brand)}
    .muted{color:var(--muted)}
    .ideas{display:grid;gap:10px;margin:12px 0}
    .idea{border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;background:#fff;text-align:left;transition:transform .12s ease, border-color .12s ease, background .12s ease}
    .idea:hover,.idea.sel{border-color:var(--brand);background:var(--ok-bg);transform:translateY(-1px)}
    .idea:active{transform:scale(.99)}
    .idea strong{display:block;color:var(--brand);margin-bottom:4px}
    .reglas-box{border:1px solid var(--line);border-radius:14px;padding:16px;background:linear-gradient(180deg,#f7fafc,#fff);margin:0 0 18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}
    .reglas-box strong{display:block;color:var(--brand);margin-bottom:4px;font-family:Fraunces,Georgia,serif;font-size:1.05rem}
    .reglas-box .muted{display:block;margin-bottom:10px;font-size:.9rem}
    .reglas-box textarea{min-height:180px;font-family:"Source Sans 3",system-ui,sans-serif;font-size:.92rem;line-height:1.45}
    .logo-box{border:1px dashed var(--line);border-radius:12px;padding:16px;background:#fafbfd;display:grid;gap:10px;justify-items:start}
    .logo-box img{max-height:72px;max-width:220px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px}
    .gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:8px}
    .gallery figure{margin:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;cursor:pointer;transition:transform .12s ease, outline .12s ease}
    .gallery figure:hover{transform:translateY(-2px)}
    .gallery figure:active{transform:scale(.98)}
    .gallery figure.sel{outline:2px solid var(--brand)}
    .gallery img{display:block;width:100%;height:80px;object-fit:cover}
    .gallery figcaption{font-size:.7rem;padding:6px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .chip{display:inline-block;font-size:.75rem;padding:2px 8px;border-radius:999px;background:var(--stat);color:var(--brand);margin-left:6px}
    .preview-wrap{position:sticky;top:16px}
    .preview-wrap h3{margin-top:0}
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
      <div class="panel-hero">
        <div>
          <h2>Bienvenido</h2>
          <p class="lead">Crea correos con la estructura Bodasesor, guárdalos y reutilízalos cuando quieras. Nada se borra al actualizar, solo si tú lo eliminas.</p>
        </div>
      </div>
      <div class="steps">
        <div class="step"><span>1</span> Crear mail</div>
        <div class="step"><span>2</span> Guardar</div>
        <div class="step"><span>3</span> Elegir / reciclar</div>
      </div>
      <div class="row">
        <a class="btn pulse" href="/panel/crear">Crear mail</a>
        <a class="btn sec" href="/panel/plantillas">Mails guardados</a>
        <a class="btn sec" href="/panel/sitio">Mi sitio</a>
        <a class="btn sec" href="/panel/contactos">Contactos</a>
      </div>
      <p class="muted" style="margin-top:18px">API JSON sigue en <code>/health</code>. Este panel es la interfaz visual.</p>
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
      <div class="panel-hero">
        <div>
          <h2>Plantillas</h2>
          <p class="lead">Tus <strong>mails guardados</strong> viven aquí de forma permanente. Ábrelos, recíclalos o elimínalos solo cuando tú lo decidas.</p>
        </div>
        <a class="btn sec" href="/panel/crear">Crear mail nuevo</a>
      </div>
      <div id="msg"></div>

      <div class="section-block">
        <h3>Mails guardados</h3>
        <p class="muted">Elige el que más te guste. Reciclar crea una copia y deja el original intacto.</p>
        <div id="biblioteca"></div>
      </div>

      <div class="section-block">
        <h3>Editor</h3>
        <p class="muted">Abre un mail de arriba o carga un tema base.</p>
      <div class="row">
        <label style="margin:0;font-weight:600;display:flex;gap:8px;align-items:center">
          Tema base
          <select id="tema">
            <option value="posadas">Posadas</option>
            <option value="cancun">Cancún</option>
            <option value="cdmx">Ciudad de México</option>
            <option value="guadalajara">Guadalajara</option>
          </select>
        </label>
        <button type="button" class="sec" id="btn-tema">Cargar tema</button>
        <button type="button" class="sec" id="btn-nuevo">Nuevo</button>
        <button type="button" id="btn-guardar-mail" class="pulse">Guardar mail</button>
        <button type="button" class="sec" id="btn-aprobar">Aprobar a Brevo</button>
        <span id="estado" class="muted">sin mail abierto</span>
      </div>
      <div class="grid">
        <form id="form-plantilla">
          <input type="hidden" id="id"/>
          <input type="hidden" id="libId"/>
          <label>Nombre interno<input id="nombre" value="Newsletter Posadas" required/></label>
          <label>Asunto<input id="asunto" value="Bodasesor · Posadas" required/></label>
          <label>Remitente nombre<input id="remNombre" value="Bodasesor" required/></label>
          <label>Remitente email<input id="remEmail" value="hola@bodasesor.com" required/></label>
          <label>listIds Brevo (ej. 21)<input id="listIds" placeholder="o usa BREVO_DEFAULT_LIST_IDS"/></label>
          <label>htmlContent<textarea id="htmlContent" required></textarea></label>
        </form>
        <div>
          <div class="preview-wrap">
            <h3 style="font-family:Fraunces,Georgia,serif;margin-top:0">Pre-visualización</h3>
            <iframe id="preview" title="Vista previa"></iframe>
          </div>
        </div>
      </div>
      </div>
      <div class="section-block">
        <h3>Borradores temporales</h3>
        <p class="muted">Solo apoyo interno. Lo importante son los «Mails guardados» de arriba.</p>
        <div id="lista"></div>
      </div>
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
      function fechaCorta(iso){
        try { return new Date(iso).toLocaleString('es-MX'); } catch { return iso || ''; }
      }

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
        document.getElementById('libId').value = '';
        refreshPreview();
        return data;
      }

      document.getElementById('btn-tema').onclick = async () => {
        try {
          const tema = document.getElementById('tema').value;
          await cargarTema(tema);
          setMsg(true, 'Tema «' + tema + '» cargado.');
        } catch (err) { setMsg(false, err.message || String(err)); }
      };

      async function abrirBiblioteca(id){
        const r = await fetch('/api/biblioteca/' + id);
        const b = await r.json();
        if (!r.ok) throw new Error(b.error || 'No se pudo abrir');
        document.getElementById('id').value = '';
        document.getElementById('libId').value = b.id;
        document.getElementById('nombre').value = b.nombre;
        document.getElementById('asunto').value = b.asunto;
        document.getElementById('remNombre').value = b.remitente.nombre;
        document.getElementById('remEmail').value = b.remitente.email;
        htmlContent.value = b.htmlContent;
        estadoEl.textContent = 'mail guardado · ' + b.id.slice(0,8);
        refreshPreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      async function cargarBiblioteca(){
        const res = await fetch('/api/biblioteca');
        const data = await res.json();
        const items = data.items || [];
        const el = document.getElementById('biblioteca');
        if (!el) return;
        if (!items.length) {
          el.innerHTML = '<p class="muted">Aún no hay mails guardados. Crea uno en <a href="/panel/crear">Crear mail</a> y pulsa <strong>Guardar mail</strong>.</p>';
          return;
        }
        el.innerHTML = '<table><thead><tr><th>Nombre</th><th>Asunto</th><th>Actualizado</th><th></th></tr></thead><tbody>' +
          items.map(b => '<tr data-row="'+b.id+'"><td>'+escapeHtml(b.nombre)+'</td><td>'+escapeHtml(b.asunto)+'</td><td class="muted">'+escapeHtml(fechaCorta(b.actualizadoEn))+'</td><td style="white-space:nowrap">' +
            '<button type="button" class="sec" data-open="'+b.id+'">Abrir</button> ' +
            '<button type="button" class="sec" data-reciclar="'+b.id+'">Reciclar</button> ' +
            '<button type="button" class="sec" data-borrar="'+b.id+'">Eliminar</button>' +
            '</td></tr>').join('') +
          '</tbody></table>';
        el.querySelectorAll('button[data-open]').forEach(btn => {
          btn.onclick = async () => {
            try { await abrirBiblioteca(btn.getAttribute('data-open')); setMsg(true, 'Mail abierto. Puedes editarlo y volver a Guardar mail.'); }
            catch (err) { setMsg(false, err.message || String(err)); }
          };
        });
        el.querySelectorAll('button[data-reciclar]').forEach(btn => {
          btn.onclick = async () => {
            try {
              const id = btn.getAttribute('data-reciclar');
              const res = await fetch('/api/biblioteca/' + id + '/reciclar', { method:'POST' });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'No se pudo reciclar');
              await cargarBiblioteca();
              await abrirBiblioteca(data.id);
              setMsg(true, 'Copia creada. El original sigue guardado.');
            } catch (err) { setMsg(false, err.message || String(err)); }
          };
        });
        el.querySelectorAll('button[data-borrar]').forEach(btn => {
          btn.onclick = async () => {
            const id = btn.getAttribute('data-borrar');
            if (!confirm('¿Eliminar este mail guardado? Solo se borra si confirmas.')) return;
            try {
              const res = await fetch('/api/biblioteca/' + id, { method:'DELETE' });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'No se pudo eliminar');
              if (document.getElementById('libId').value === id) {
                document.getElementById('libId').value = '';
                estadoEl.textContent = 'sin mail abierto';
              }
              setMsg(true, 'Mail eliminado manualmente.');
              cargarBiblioteca();
            } catch (err) { setMsg(false, err.message || String(err)); }
          };
        });

        const params = new URLSearchParams(location.search);
        const mailId = params.get('mail');
        if (mailId) {
          try { await abrirBiblioteca(mailId); setMsg(true, 'Mail guardado abierto.'); }
          catch (err) { setMsg(false, err.message || String(err)); }
        }
      }

      async function cargarLista(){
        const res = await fetch('/api/borradores');
        const data = await res.json();
        const items = data.borradores || [];
        if (!items.length) { document.getElementById('lista').innerHTML = '<p class="muted">Sin borradores temporales.</p>'; return; }
        document.getElementById('lista').innerHTML = '<table><thead><tr><th>Nombre</th><th>Asunto</th><th>Estado</th><th></th></tr></thead><tbody>' +
          items.map(b => '<tr><td>'+escapeHtml(b.nombre)+'</td><td>'+escapeHtml(b.asunto)+'</td><td>'+escapeHtml(b.estado)+'</td><td><button type="button" class="sec" data-id="'+b.id+'">Abrir</button></td></tr>').join('') +
          '</tbody></table>';
        document.querySelectorAll('#lista button[data-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const r = await fetch('/api/borradores/' + btn.getAttribute('data-id'));
            const b = await r.json();
            document.getElementById('id').value = b.id;
            document.getElementById('libId').value = '';
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
      cargarBiblioteca();
      cargarLista();

      document.getElementById('btn-nuevo').onclick = async () => {
        document.getElementById('id').value = '';
        document.getElementById('libId').value = '';
        estadoEl.textContent = 'nuevo';
        msg.innerHTML = '';
        try { await cargarTema(document.getElementById('tema').value); }
        catch (err) { setMsg(false, err.message || String(err)); }
      };

      document.getElementById('btn-guardar-mail').onclick = async () => {
        try {
          const payload = {
            id: document.getElementById('libId').value || undefined,
            nombre: document.getElementById('nombre').value.trim(),
            asunto: document.getElementById('asunto').value.trim(),
            htmlContent: htmlContent.value,
            remitente: {
              nombre: document.getElementById('remNombre').value,
              email: document.getElementById('remEmail').value
            },
            origen: 'manual'
          };
          if (!payload.nombre || !payload.asunto || !payload.htmlContent) {
            setMsg(false, 'Nombre, asunto y HTML son obligatorios.');
            return;
          }
          const res = await fetch('/api/biblioteca', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
          document.getElementById('libId').value = data.id;
          estadoEl.textContent = 'mail guardado · ' + data.id.slice(0,8);
          setMsg(true, 'Mail guardado en Hostinger. No se borrará en actualizaciones.');
          cargarBiblioteca();
        } catch (err) { setMsg(false, err.message || String(err)); }
      };

      document.getElementById('btn-aprobar').onclick = async () => {
        try {
          // Asegurar mail guardado + borrador para flujo Brevo
          const libPayload = {
            id: document.getElementById('libId').value || undefined,
            nombre: document.getElementById('nombre').value.trim(),
            asunto: document.getElementById('asunto').value.trim(),
            htmlContent: htmlContent.value,
            remitente: {
              nombre: document.getElementById('remNombre').value,
              email: document.getElementById('remEmail').value
            },
            origen: 'manual'
          };
          const resL = await fetch('/api/biblioteca', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify(libPayload)
          });
          const lib = await resL.json();
          if (!resL.ok) throw new Error(lib.error || 'No se pudo guardar mail');
          document.getElementById('libId').value = lib.id;

          const resB = await fetch('/api/borradores', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({
              id: document.getElementById('id').value || undefined,
              nombre: lib.nombre,
              asunto: lib.asunto,
              htmlContent: lib.htmlContent,
              remitente: lib.remitente
            })
          });
          const borrador = await resB.json();
          if (!resB.ok) throw new Error(borrador.error || 'No se pudo crear borrador');
          document.getElementById('id').value = borrador.id;

          const ids = document.getElementById('listIds').value.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0);
          const res = await fetch('/api/plantillas/aprobar', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ borradorId: borrador.id, ...(ids.length ? { listIds: ids } : {}) })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo aprobar');
          estadoEl.textContent = 'aprobado Brevo #' + data.plantillaId;
          setMsg(true, 'Aprobado en Brevo (plantilla #' + data.plantillaId + '). El mail sigue en Mails guardados.');
          cargarLista();
          cargarBiblioteca();
        } catch (err) { setMsg(false, err.message || String(err)); }
      };
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
      <div class="panel-hero">
        <div>
          <h2>Crear mail</h2>
          <p class="lead">Escribe qué quieres decir. El sistema arma la estructura (logo, navbar, blog, 8 productos y descuento) y tú solo revisas la vista previa.</p>
        </div>
        <a class="btn sec" href="/panel/plantillas">Ver mails guardados</a>
      </div>
      <div class="steps">
        <div class="step"><span>1</span> Instrucciones</div>
        <div class="step"><span>2</span> Generar</div>
        <div class="step"><span>3</span> Modificar (opcional)</div>
        <div class="step"><span>4</span> Guardar mail</div>
      </div>
      <div id="msg"></div>
      <div class="reglas-box">
        <strong>Reglas fijas del correo (estructura)</strong>
        <span class="muted">Estas reglas se aplican siempre al generar. Se guardan en el servidor y solo se borran si las limpias tú.</span>
        <textarea id="reglas" style="font-family:inherit"></textarea>
        <div class="row" style="margin:10px 0 0">
          <button type="button" class="sec" id="btn-reglas-guardar">Guardar reglas</button>
          <button type="button" class="sec" id="btn-reglas-default">Restaurar reglas por defecto</button>
          <span id="reglasMeta" class="muted"></span>
        </div>
      </div>
      <div class="grid">
        <div>
          <div class="section-block">
            <h3>1 · Qué debe decir el mail</h3>
            <p class="muted">Lenguaje natural: a quién, qué ofrecer, qué enlazar.</p>
            <label>Instrucciones del mail
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
          </div>
          <div class="section-block">
            <h3>2 · Logo</h3>
            <p class="muted">Se coloca arriba a la izquierda del correo.</p>
            <div class="logo-box">
              <input type="file" id="logoFile" accept="image/png,image/jpeg,image/svg+xml,image/webp"/>
              <img id="logoPreview" alt="Logo" style="display:none"/>
              <input type="hidden" id="logoId"/>
              <div class="row" style="margin:0">
                <button type="button" class="sec" id="btn-logo-lib">Elegir logo guardado</button>
              </div>
            </div>
          </div>
          <div class="section-block">
            <h3>3 · Generar y guardar</h3>
            <p class="muted">Los botones bajan un poco al hacer clic para que notes que responden.</p>
            <div class="row">
              <button type="button" id="btn-generar" class="pulse">Generar borrador</button>
              <button type="button" id="btn-guardar" disabled>Guardar mail</button>
              <span id="metaImg" class="muted"></span>
            </div>
            <label>Asunto <span class="muted">(se genera solo)</span>
              <input id="asunto" readonly placeholder="Se completa al generar el borrador"/>
            </label>
            <label>Nombre interno <span class="muted">(se genera solo)</span>
              <input id="nombre" readonly placeholder="Se completa al generar el borrador"/>
            </label>
          </div>
          <div class="section-block" id="box-mods">
            <h3>4 · Modificaciones puntuales</h3>
            <p class="muted">Si algo no te gusta, escríbelo aquí. Solo se cambian esas cosas: no borra ni regenera todo el mail.</p>
            <label>Qué quiero cambiar
              <textarea id="modificaciones" style="font-family:inherit;min-height:110px" placeholder="Ejemplos:&#10;- Cambia el asunto a algo más corto&#10;- Quita el producto de sillas y pon florería&#10;- El saludo que diga «estimado cliente»&#10;- Haz el código de descuento más grande"></textarea>
            </label>
            <div class="row" style="margin:0">
              <button type="button" class="sec" id="btn-ajustar" disabled>Aplicar modificaciones</button>
              <span id="modsMeta" class="muted">Disponible cuando haya un borrador generado.</span>
            </div>
          </div>
          <div class="section-block">
            <h3>Biblioteca de imágenes</h3>
            <p class="muted">En el mismo mail no se repiten; sí se pueden reutilizar de otros correos.</p>
            <div id="gallery" class="gallery"></div>
          </div>
        </div>
        <div>
          <div class="preview-wrap section-block">
            <h3>Pre-visualización</h3>
            <p class="muted">Así se verá el correo.</p>
            <iframe id="preview" title="Vista previa"></iframe>
          </div>
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

      async function cargarReglas(){
        const res = await fetch('/api/composer/reglas');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las reglas');
        document.getElementById('reglas').value = data.texto || '';
        document.getElementById('reglasMeta').textContent = data.actualizadoEn
          ? ('Guardadas: ' + new Date(data.actualizadoEn).toLocaleString('es-MX'))
          : '';
      }
      document.getElementById('btn-reglas-guardar').onclick = async () => {
        try {
          const res = await fetch('/api/composer/reglas', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ texto: document.getElementById('reglas').value })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudieron guardar');
          document.getElementById('reglasMeta').textContent =
            'Guardadas: ' + new Date(data.actualizadoEn).toLocaleString('es-MX');
          setMsg(true, 'Reglas guardadas. Se usarán en cada generación.');
        } catch (err) { setMsg(false, err.message || String(err)); }
      };
      document.getElementById('btn-reglas-default').onclick = async () => {
        try {
          const res = await fetch('/api/composer/reglas', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ restaurarDefault: true })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudieron restaurar');
          document.getElementById('reglas').value = data.texto || '';
          document.getElementById('reglasMeta').textContent =
            'Guardadas: ' + new Date(data.actualizadoEn).toLocaleString('es-MX');
          setMsg(true, 'Reglas por defecto restauradas.');
        } catch (err) { setMsg(false, err.message || String(err)); }
      };
      cargarReglas().catch(err => setMsg(false, err.message || String(err)));

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
          document.getElementById('btn-guardar').classList.add('pulse');
          document.getElementById('btn-generar').classList.remove('pulse');
          document.getElementById('btn-ajustar').disabled = false;
          document.getElementById('modsMeta').textContent = 'Listo: escribe el cambio y pulsa Aplicar modificaciones.';
          setMsg(true, data.advertencia
            ? ('Borrador listo. Asunto: «' + asunto + '». Avisos: ' + data.advertencia)
            : ('Borrador listo. Revisa la vista previa. Si algo no te gusta, usa Modificaciones.'));
          cargarGaleria();
        } catch (err) { setMsg(false, err.message || String(err)); }
        finally { btn.disabled = false; btn.textContent = 'Generar borrador'; }
      };

      document.getElementById('btn-ajustar').onclick = async () => {
        const mods = document.getElementById('modificaciones').value.trim();
        const html = document.getElementById('htmlContent').value || ultimoHtml;
        if (!html) { setMsg(false, 'Primero genera un borrador.'); return; }
        if (!mods) { setMsg(false, 'Escribe qué quieres modificar.'); return; }
        const btn = document.getElementById('btn-ajustar');
        btn.disabled = true; btn.textContent = 'Aplicando…';
        try {
          const res = await fetch('/api/composer/ajustar', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({
              htmlContent: html,
              modificaciones: mods,
              asunto: document.getElementById('asunto').value,
              nombre: document.getElementById('nombre').value,
              instruccionesOriginales: document.getElementById('brief').value.trim()
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo aplicar el ajuste');
          ultimoHtml = data.htmlContent;
          document.getElementById('htmlContent').value = data.htmlContent;
          document.getElementById('asunto').value = data.asunto || document.getElementById('asunto').value;
          document.getElementById('nombre').value = data.nombre || document.getElementById('nombre').value;
          preview.srcdoc = data.htmlContent;
          document.getElementById('btn-guardar').disabled = false;
          document.getElementById('btn-guardar').classList.add('pulse');
          document.getElementById('modsMeta').textContent = 'Ajuste listo. Puedes pedir otro cambio o Guardar mail.';
          setMsg(true, 'Cambios aplicados: ' + (data.cambiosAplicados || mods));
        } catch (err) { setMsg(false, err.message || String(err)); }
        finally { btn.disabled = false; btn.textContent = 'Aplicar modificaciones'; }
      };

      document.getElementById('btn-guardar').onclick = async () => {
        const btn = document.getElementById('btn-guardar');
        try {
          const asunto = document.getElementById('asunto').value.trim();
          const nombre = document.getElementById('nombre').value.trim();
          if (!asunto || !nombre) {
            setMsg(false, 'Primero genera el borrador para completar asunto y nombre interno.');
            return;
          }
          btn.disabled = true; btn.textContent = 'Guardando…';
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
          const resL = await fetch('/api/biblioteca', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify(payload)
          });
          const lib = await resL.json();
          if (!resL.ok) throw new Error(lib.error || 'No se pudo guardar el mail');
          // Borrador opcional (no afecta la permanencia del mail guardado)
          await fetch('/api/borradores', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ ...payload, borradorId: undefined })
          }).catch(() => null);
          setMsg(true, 'Mail guardado en Plantillas. No se borrará al actualizar el sistema.');
          window.location.href = '/panel/plantillas?mail=' + encodeURIComponent(lib.id);
        } catch (err) { setMsg(false, err.message || String(err)); }
        finally { btn.disabled = false; btn.textContent = 'Guardar mail'; }
      };
    </script>`,
  );
}
