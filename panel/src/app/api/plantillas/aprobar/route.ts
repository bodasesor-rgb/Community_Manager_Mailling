import { NextResponse } from "next/server";
import {
  marcarAprobado,
  obtenerBorrador,
} from "@/lib/server/borradores";
import { getEmailProvider, listIdsDesdeEnv } from "@/lib/server/providers";

export const runtime = "nodejs";

/**
 * Aprueba un borrador local:
 * 1) crearPlantilla en Brevo
 * 2) crearCampaña en borrador (sin scheduledAt)
 * No envía la campaña.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      borradorId?: string;
      listIds?: number[];
    };

    if (!body.borradorId) {
      return NextResponse.json(
        { error: "borradorId es requerido" },
        { status: 400 },
      );
    }

    const borrador = await obtenerBorrador(body.borradorId);
    if (!borrador) {
      return NextResponse.json(
        { error: "borrador no encontrado" },
        { status: 404 },
      );
    }
    if (borrador.estado === "aprobado") {
      return NextResponse.json(
        {
          error: "ya aprobado",
          brevoPlantillaId: borrador.brevoPlantillaId,
          brevoCampanaId: borrador.brevoCampanaId,
        },
        { status: 409 },
      );
    }

    const listIds = body.listIds ?? listIdsDesdeEnv();
    if (!listIds || listIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "listIds requerido (envía listIds o define BREVO_DEFAULT_LIST_IDS)",
        },
        { status: 400 },
      );
    }

    const email = getEmailProvider();
    const plantilla = await email.crearPlantilla({
      nombre: borrador.nombre,
      asunto: borrador.asunto,
      htmlContent: borrador.htmlContent,
      remitente: borrador.remitente,
    });

    const campana = await email.crearCampaña({
      nombre: `${borrador.nombre} (borrador)`,
      asunto: borrador.asunto,
      remitente: borrador.remitente,
      templateId: plantilla.id,
      listIds,
      // sin scheduledAt → queda en borrador; no se envía
    });

    const actualizado = await marcarAprobado(
      borrador.id,
      plantilla.id,
      campana.id,
    );

    return NextResponse.json({
      ok: true,
      borrador: actualizado,
      plantillaId: plantilla.id,
      campanaId: campana.id,
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error ? error.message : "error al aprobar";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
