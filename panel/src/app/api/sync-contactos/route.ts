import { NextResponse } from "next/server";
import { syncContactosKommoBrevo } from "@adapters/servicios/sync-kommo-brevo";
import { getEmailProvider, getKommoProvider, listIdsDesdeEnv } from "@/lib/server/providers";

export const runtime = "nodejs";

/**
 * POST /api/sync-contactos
 * body opcional: { dryRun?: boolean, listIds?: number[] }
 * query: ?dryRun=true
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as {
      dryRun?: boolean;
      listIds?: number[];
    };
    const dryRun =
      body.dryRun === true ||
      url.searchParams.get("dryRun") === "true";

    const listIds = body.listIds ?? listIdsDesdeEnv();
    const reporte = await syncContactosKommoBrevo(
      getKommoProvider(),
      getEmailProvider(),
      {
        dryRun,
        ...(listIds ? { listIds } : {}),
      },
    );

    return NextResponse.json(reporte);
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error ? error.message : "error en sync-contactos";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  // Permite probar con GET ?dryRun=true sin body.
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") !== "false";
  try {
    const listIds = listIdsDesdeEnv();
    const reporte = await syncContactosKommoBrevo(
      getKommoProvider(),
      getEmailProvider(),
      {
        dryRun,
        ...(listIds ? { listIds } : {}),
      },
    );
    return NextResponse.json(reporte);
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error ? error.message : "error en sync-contactos";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
