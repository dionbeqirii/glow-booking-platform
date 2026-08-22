import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/rbac";
import { computeStudioStats } from "@/lib/stats";
import { StudioReportDocument, type TopService } from "@/lib/report-pdf";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ZodError } from "zod";

const ALLOWED_MONTHS = [1, 2, 3, 6] as const;

// GET — a downloadable PDF business report for the given period (3.4).
// Not wrapped in handle() since a PDF binary response isn't JSON — errors
// are translated to a plain-text response by hand instead.
export async function GET(req: Request) {
  try {
    const session = await requireRole("ADMIN");
    const url = new URL(req.url);
    const monthsParam = Number(url.searchParams.get("months"));
    const months = (ALLOWED_MONTHS as readonly number[]).includes(monthsParam) ? monthsParam : 1;

    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - months);

    const [stats, completedBookings, business] = await Promise.all([
      computeStudioStats(Math.round((now.getTime() - from.getTime()) / 86400000), now),
      prisma.booking.findMany({
        where: { startTime: { gte: from, lte: now }, status: "COMPLETED" },
        select: { service: { select: { name: true, price: true } } },
      }),
      prisma.businessSettings.findUnique({ where: { id: "business" }, select: { name: true } }),
    ]);

    const svcMap = new Map<string, TopService>();
    for (const b of completedBookings) {
      const key = b.service.name;
      const existing = svcMap.get(key) ?? { name: key, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(b.service.price);
      svcMap.set(key, existing);
    }
    const topServices = [...svcMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const revenueTotal = topServices.reduce((sum, s) => sum + s.revenue, 0);

    const buffer = await renderToBuffer(
      StudioReportDocument({
        data: {
          studioName: business?.name ?? "Glow By Diellza",
          months,
          from,
          to: now,
          generatedAt: now,
          stats,
          topServices,
          revenueTotal,
        },
      })
    );

    await audit({
      userId: session.userId,
      action: "REPORT_PDF_EXPORT",
      entity: "Report",
      details: `${months} muaj`,
    });

    const filename = `raporti-glow-by-diellza-${months}mujor-${now.toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Të dhëna të pavlefshme" }, { status: 400 });
    }
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Gabim i brendshëm i serverit" }, { status: 500 });
  }
}
