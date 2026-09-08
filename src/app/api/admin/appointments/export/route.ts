import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole, AuthError } from "@/lib/rbac";
import { getAppointments, parseAppointmentFilters } from "@/lib/appointments";
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

    const [{ rows }, business, t, tStatus, tPayment, locale] = await Promise.all([
      getAppointments({ ...filters, page: 1, pageSize: EXPORT_CAP }),
      prisma.businessSettings.findUnique({ where: { id: "business" }, select: { name: true } }),
      getTranslations("AdminReportPdf"),
      getTranslations("Status.booking"),
      getTranslations("Status.payment"),
      getLocale(),
    ]);

    const summaryParts: string[] = [];
    if (filters.from) summaryParts.push(t("fromLabel", { date: filters.from.toLocaleDateString(locale) }));
    if (filters.to) summaryParts.push(t("toLabel", { date: new Date(filters.to.getTime() - 86400000).toLocaleDateString(locale) }));
    if (filters.status) summaryParts.push(tStatus(filters.status));
    if (filters.q) summaryParts.push(t("searchLabel", { query: filters.q }));
    const filterSummary = summaryParts.length > 0 ? summaryParts.join(" · ") : t("allAppointments");

    const now = new Date();
    const buffer = await renderToBuffer(
      AppointmentsReportDocument({
        data: {
          studioName: business?.name ?? "Glow By Diellza",
          generatedAt: now,
          filterSummary,
          rows,
        },
        locale,
        t,
        tStatus,
        tPayment,
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
