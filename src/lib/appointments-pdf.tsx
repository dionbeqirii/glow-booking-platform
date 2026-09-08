// PDF export for the filtered Terminet table — same @react-pdf/renderer
// machinery and visual language as report-pdf.tsx, scoped to a row list
// instead of studio-wide stats.
//
// react-pdf's Document/Page/Text are plain function calls, not part of the
// Next.js RSC tree, so they can't call useTranslations()/getTranslations()
// themselves — the caller (a Route Handler, which DOES have request-scoped
// locale access) resolves the translators once and passes them in.
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AppointmentRow } from "./appointments";
import type { BookingStatus, PaymentStatus } from "@prisma/client";

export type PdfTranslator = (key: string, values?: Record<string, string | number>) => string;

export type AppointmentsExportData = {
  studioName: string;
  generatedAt: Date;
  filterSummary: string;
  rows: AppointmentRow[];
};

const ACCENT = "#c1546c";
const INK = "#2b2622";
const INK_SOFT = "#6b625c";
const LINE = "#e7ded8";
const SURFACE_MUTED = "#f7f1ec";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: INK, fontFamily: "Helvetica" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INK },
  brandAccent: { color: ACCENT },
  title: { fontSize: 13, marginTop: 4, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: INK_SOFT, marginTop: 2 },
  headerRule: { borderBottomWidth: 1, borderBottomColor: LINE, marginTop: 12, marginBottom: 16 },

  table: { borderWidth: 1, borderColor: LINE, borderRadius: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  trLast: { flexDirection: "row" },
  th: { flex: 1, padding: 6, fontSize: 8, fontFamily: "Helvetica-Bold", color: INK_SOFT, backgroundColor: SURFACE_MUTED, textTransform: "uppercase" },
  td: { flex: 1, padding: 6, fontSize: 8.5 },

  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: INK_SOFT, textAlign: "center" },
});

function fmtDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d: Date, locale: string): string {
  return d.toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(d: Date, locale: string): string {
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
function durationMin(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function AppointmentsReportDocument({
  data,
  locale,
  t,
  tStatus,
  tPayment,
}: {
  data: AppointmentsExportData;
  locale: string;
  t: PdfTranslator;
  tStatus: (status: BookingStatus) => string;
  tPayment: (status: PaymentStatus) => string;
}) {
  return (
    <Document title={t("apptDocTitle", { studio: data.studioName })}>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.brand}>
            Glow <Text style={styles.brandAccent}>By Diellza</Text>
          </Text>
          <Text style={styles.title}>{t("apptTitle")}</Text>
          <Text style={styles.meta}>{data.filterSummary}</Text>
          <Text style={styles.meta}>{t("apptGeneratedLabel", { date: fmtDateTime(data.generatedAt, locale), count: data.rows.length })}</Text>
        </View>
        <View style={styles.headerRule} />

        <View style={styles.table}>
          <View style={styles.tr} fixed>
            <Text style={styles.th}>{t("colClient")}</Text>
            <Text style={styles.th}>{t("colService")}</Text>
            <Text style={styles.th}>{t("colStaff")}</Text>
            <Text style={styles.th}>{t("colDateTime")}</Text>
            <Text style={styles.th}>{t("colDuration")}</Text>
            <Text style={styles.th}>{t("colStatus")}</Text>
            <Text style={styles.th}>{t("colPayment")}</Text>
          </View>
          {data.rows.map((b, i) => {
            const isLast = i === data.rows.length - 1;
            return (
              <View key={b.id} style={isLast ? styles.trLast : styles.tr} wrap={false}>
                <Text style={styles.td}>{b.clientName}</Text>
                <Text style={styles.td}>{b.serviceName}</Text>
                <Text style={styles.td}>{b.staffName}</Text>
                <Text style={styles.td}>{fmtDate(b.startTime, locale)}, {fmtTime(b.startTime, locale)}</Text>
                <Text style={styles.td}>{durationMin(b.startTime, b.endTime)} min</Text>
                <Text style={styles.td}>{tStatus(b.status)}</Text>
                <Text style={styles.td}>{tPayment(b.paymentStatus)}</Text>
              </View>
            );
          })}
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => t("footerPageLabel", { studio: data.studioName, page: pageNumber, total: totalPages })}
        />
      </Page>
    </Document>
  );
}
