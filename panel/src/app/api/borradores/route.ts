import { NextResponse } from "next/server";
import {
  guardarBorrador,
  listarBorradores,
} from "@/lib/server/borradores";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const items = await listarBorradores();
  return NextResponse.json({ total: items.length, borradores: items });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      id?: string;
      nombre?: string;
      asunto?: string;
      htmlContent?: string;
      remitente?: { nombre?: string; email?: string };
    };

    if (
      !body.nombre ||
      !body.asunto ||
      !body.htmlContent ||
      !body.remitente?.nombre ||
      !body.remitente?.email
    ) {
      return NextResponse.json(
        {
          error:
            "nombre, asunto, htmlContent y remitente.{nombre,email} son requeridos",
        },
        { status: 400 },
      );
    }

    const borrador = await guardarBorrador({
      ...(body.id ? { id: body.id } : {}),
      nombre: body.nombre,
      asunto: body.asunto,
      htmlContent: body.htmlContent,
      remitente: {
        nombre: body.remitente.nombre,
        email: body.remitente.email,
      },
    });

    return NextResponse.json(borrador, { status: body.id ? 200 : 201 });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error ? error.message : "error guardando borrador";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
