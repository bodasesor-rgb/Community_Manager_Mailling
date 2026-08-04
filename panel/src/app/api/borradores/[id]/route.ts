import { NextResponse } from "next/server";
import { obtenerBorrador } from "@/lib/server/borradores";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const borrador = await obtenerBorrador(id);
  if (!borrador) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }
  return NextResponse.json(borrador);
}
