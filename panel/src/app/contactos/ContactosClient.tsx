"use client";

import { useState } from "react";

interface SyncReporte {
  total: number;
  nuevosOActualizados: number;
  invalidos: Array<{ nombre: string; email: string }>;
  suprimidos: number;
  dryRun: boolean;
  error?: string;
}

export default function ContactosClient() {
  const [cargando, setCargando] = useState(false);
  const [reporte, setReporte] = useState<SyncReporte | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);

  async function sincronizar(): Promise<void> {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/sync-contactos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = (await res.json()) as SyncReporte;
      if (!res.ok) {
        throw new Error(data.error ?? "Error al sincronizar");
      }
      setReporte(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="panel">
      <h2>Contactos</h2>
      <p className="lead">
        Sincroniza contactos desde Kommo hacia Brevo. Solo se guardan correos
        válidos; los inválidos quedan en la tabla para revisión.
      </p>

      <div className="row">
        <button
          className="btn"
          type="button"
          onClick={() => void sincronizar()}
          disabled={cargando}
        >
          {cargando ? "Sincronizando…" : "Sincronizar desde Kommo"}
        </button>
        <label style={{ fontWeight: 500, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          Simulación (dryRun) — no escribe en Brevo
        </label>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {reporte ? (
        <>
          <div className="warn">
            Modo:{" "}
            <strong>{reporte.dryRun ? "dryRun (sin escribir)" : "escritura en Brevo"}</strong>
          </div>
          <div className="stats">
            <div className="stat">
              <strong>{reporte.total}</strong>
              <span>Total Kommo c/email</span>
            </div>
            <div className="stat">
              <strong>{reporte.nuevosOActualizados}</strong>
              <span>{reporte.dryRun ? "Válidos a sync" : "Nuevos/actualizados"}</span>
            </div>
            <div className="stat">
              <strong>{reporte.invalidos.length}</strong>
              <span>Inválidos</span>
            </div>
            <div className="stat">
              <strong>{reporte.suprimidos}</strong>
              <span>Suprimidos</span>
            </div>
          </div>

          <h3 style={{ marginTop: 28, fontFamily: "var(--font-display)" }}>
            Correos inválidos
          </h3>
          {reporte.invalidos.length === 0 ? (
            <p className="muted">No hay correos inválidos en este lote.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {reporte.invalidos.map((c) => (
                  <tr key={`${c.nombre}-${c.email}`}>
                    <td>{c.nombre}</td>
                    <td>{c.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}
    </section>
  );
}
