"use client";

import { useEffect, useMemo, useState } from "react";

interface Borrador {
  id: string;
  nombre: string;
  asunto: string;
  remitente: { nombre: string; email: string };
  htmlContent: string;
  estado: "borrador" | "aprobado";
  brevoPlantillaId?: number;
  brevoCampanaId?: number;
}

const HTML_EJEMPLO = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f3f1ec;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="600" style="max-width:600px;width:100%;background:#fff;">
        <tr><td style="padding:28px;color:#2F5D50;font-size:28px;">Bodasesor</td></tr>
        <tr><td style="padding:0 28px 12px;font-size:22px;color:#1a1a1a;">Ideas para tu próxima publicación</td></tr>
        <tr><td style="padding:0 28px 24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">
          Comparte bastidores reales, un tip práctico y una historia corta de cliente.
        </td></tr>
        <tr><td style="padding:0 28px 28px;" align="center">
          <a href="https://bodasesor.com" style="background:#2F5D50;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-family:Arial,sans-serif;">Ver guía</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export default function PlantillasClient() {
  const [id, setId] = useState<string | undefined>(undefined);
  const [nombre, setNombre] = useState("Newsletter Bodasesor");
  const [asunto, setAsunto] = useState("Ideas para tu próxima publicación");
  const [remNombre, setRemNombre] = useState("Bodasesor");
  const [remEmail, setRemEmail] = useState("hola@bodasesor.com");
  const [htmlContent, setHtmlContent] = useState(HTML_EJEMPLO);
  const [estado, setEstado] = useState<"borrador" | "aprobado">("borrador");
  const [lista, setLista] = useState<Borrador[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listIds, setListIds] = useState("");

  const previewSrcDoc = useMemo(() => htmlContent, [htmlContent]);

  async function cargarLista(): Promise<void> {
    const res = await fetch("/api/borradores");
    const data = (await res.json()) as { borradores: Borrador[] };
    setLista(data.borradores ?? []);
  }

  useEffect(() => {
    void cargarLista();
  }, []);

  function nuevo(): void {
    setId(undefined);
    setNombre("Nueva plantilla");
    setAsunto("");
    setHtmlContent(HTML_EJEMPLO);
    setEstado("borrador");
    setMensaje(null);
    setError(null);
  }

  function cargar(b: Borrador): void {
    setId(b.id);
    setNombre(b.nombre);
    setAsunto(b.asunto);
    setRemNombre(b.remitente.nombre);
    setRemEmail(b.remitente.email);
    setHtmlContent(b.htmlContent);
    setEstado(b.estado);
    setMensaje(null);
    setError(null);
  }

  async function guardarBorrador(): Promise<void> {
    setCargando(true);
    setError(null);
    setMensaje(null);
    try {
      const res = await fetch("/api/borradores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          nombre,
          asunto,
          htmlContent,
          remitente: { nombre: remNombre, email: remEmail },
        }),
      });
      const data = (await res.json()) as Borrador & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setId(data.id);
      setEstado(data.estado);
      setMensaje("Borrador guardado en local (aún no está en Brevo).");
      await cargarLista();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setCargando(false);
    }
  }

  async function aprobar(): Promise<void> {
    if (!id) {
      setError("Guarda el borrador antes de aprobar.");
      return;
    }
    setCargando(true);
    setError(null);
    setMensaje(null);
    try {
      const ids = listIds
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);

      const res = await fetch("/api/plantillas/aprobar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          borradorId: id,
          ...(ids.length > 0 ? { listIds: ids } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        plantillaId?: number;
        campanaId?: number;
        borrador?: Borrador;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo aprobar");
      if (data.borrador) {
        setEstado(data.borrador.estado);
      }
      setMensaje(
        `Aprobado en Brevo: plantilla #${data.plantillaId}, campaña borrador #${data.campanaId}. No se envió.`,
      );
      await cargarLista();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="panel">
      <h2>Plantillas</h2>
      <p className="lead">
        Crea el HTML, previsualízalo y guarda el borrador en local. Solo al
        aprobar se crea la plantilla y una campaña en borrador en Brevo.
      </p>

      <div className="row">
        <button className="btn secondary" type="button" onClick={nuevo}>
          Nuevo
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => void guardarBorrador()}
          disabled={cargando || estado === "aprobado"}
        >
          Guardar borrador
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => void aprobar()}
          disabled={cargando || !id || estado === "aprobado"}
        >
          Aprobar y enviar a Brevo
        </button>
        <span className={`badge ${estado === "aprobado" ? "ok" : "draft"}`}>
          {estado}
        </span>
      </div>

      {mensaje ? <p className="warn">{mensaje}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="editor-layout">
        <div className="form-grid">
          <label>
            Nombre interno
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            Asunto
            <input value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </label>
          <label>
            Remitente nombre
            <input
              value={remNombre}
              onChange={(e) => setRemNombre(e.target.value)}
            />
          </label>
          <label>
            Remitente email
            <input
              value={remEmail}
              onChange={(e) => setRemEmail(e.target.value)}
            />
          </label>
          <label>
            listIds Brevo (para aprobar, ej. 21)
            <input
              value={listIds}
              onChange={(e) => setListIds(e.target.value)}
              placeholder="usa BREVO_DEFAULT_LIST_IDS si lo dejas vacío"
            />
          </label>
          <label>
            htmlContent
            {/* Punto de enganche: aquí irá un editor visual (TipTap/Quill) más adelante */}
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              spellCheck={false}
            />
          </label>
        </div>

        <div>
          <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
            Pre-visualización
          </h3>
          <iframe
            title="Vista previa del correo"
            className="preview-frame"
            srcDoc={previewSrcDoc}
            sandbox=""
          />
        </div>
      </div>

      <h3 style={{ marginTop: 32, fontFamily: "var(--font-display)" }}>
        Borradores guardados
      </h3>
      {lista.length === 0 ? (
        <p className="muted">Aún no hay borradores.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Asunto</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((b) => (
              <tr key={b.id}>
                <td>{b.nombre}</td>
                <td>{b.asunto}</td>
                <td>
                  <span className={`badge ${b.estado === "aprobado" ? "ok" : "draft"}`}>
                    {b.estado}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => cargar(b)}
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
