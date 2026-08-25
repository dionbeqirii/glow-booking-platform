import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole, AuthError } from "@/lib/rbac";
import { getAppointments, parseAppointmentFilters } from "@/lib/appointments";
import { BOOKING_STATUS_LABEL } from "@/lib/booking-labels";
import { AppointmentsReportDocument } from "@/lib/appointments-pdf";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const EXPORT_CAP = 1000;

// GET — a downloadable PDF of the Terminet table under its current filters.
// Not wrapped in handle() since a PDF binary response isn't JSON.
export async function GET(req: Request) {
  try {
    const session = await requireRole("ADMIN");
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const filters = parseAppointmentFilters(sp);

    const [{ rows }, business] = await Promise.all([
      getAppointments({ ...filters, page: 1, pageSize: EXPORT_CAP }),
      prisma.businessSettings.findUnique({ where: { id: "business" }, select: { name: true } }),
    ]);

    const summaryParts: string[] = [];
    if (filters.from) summaryParts.push(`Nga ${filters.from.toLocaleDateString("sq")}`);
    if (filters.to) summaryParts.push(`Deri ${new Date(filters.to.getTime() - 86400000).toLocaleDateString("sq")}`);
    if (filters.status) summaryParts.push(BOOKING_STATUS_LABEL[filters.status]);
    if (filters.q) summaryParts.push(`Kërkim: "${filters.q}"`);
    const filterSummary = summaryParts.length > 0 ? summaryParts.join(" · ") : "Të gjitha terminet";

    const now = new Date();
    const buffer = await renderToBuffer(
      AppointmentsReportDocument({
        data: {
          studioName: business?.name ?? "Glow By Diellza",
          generatedAt: now,
          filterSummary,
          rows,
        },
      })
    );

    await audit({
      userId: session.userId,
      action: "APPOINTMENTS_PDF_EXPORT",
      entity: "Booking",
      details: filterSummary,
    });

    const filename = `terminet-glow-by-diellza-${now.toISOString().slice(0, 10)}.pdf`;
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
    console.error(err);
    return NextResponse.json({ error: "Gabim i brendshëm i serverit" }, { status: 500 });
  }
}
