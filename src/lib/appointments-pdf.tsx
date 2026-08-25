// PDF export for the filtered Terminet table — same @react-pdf/renderer
// machinery and visual language as report-pdf.tsx, scoped to a row list
// instead of studio-wide stats.
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "./booking-labels";
import type { AppointmentRow } from "./appointments";

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

function fmtDate(d: Date): string {
  return d.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d: Date): string {
  return d.toLocaleString("sq", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit" });
}
function durationMin(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function AppointmentsReportDocument({ data }: { data: AppointmentsExportData }) {
  return (
    <Document title="Terminet — Glow By Diellza">
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.brand}>
            Glow <Text style={styles.brandAccent}>By Diellza</Text>
          </Text>
          <Text style={styles.title}>Terminet</Text>
          <Text style={styles.meta}>{data.filterSummary}</Text>
          <Text style={styles.meta}>Krijuar më {fmtDateTime(data.generatedAt)} · {data.rows.length} termine</Text>
        </View>
        <View style={styles.headerRule} />

        <View style={styles.table}>
          <View style={styles.tr} fixed>
            <Text style={styles.th}>Klienti</Text>
            <Text style={styles.th}>Shërbimi</Text>
            <Text style={styles.th}>Stafi</Text>
            <Text style={styles.th}>Data &amp; Ora</Text>
            <Text style={styles.th}>Kohëzgjatja</Text>
            <Text style={styles.th}>Statusi</Text>
            <Text style={styles.th}>Pagesa</Text>
          </View>
          {data.rows.map((b, i) => {
            const isLast = i === data.rows.length - 1;
            return (
              <View key={b.id} style={isLast ? styles.trLast : styles.tr} wrap={false}>
                <Text style={styles.td}>{b.clientName}</Text>
                <Text style={styles.td}>{b.serviceName}</Text>
                <Text style={styles.td}>{b.staffName}</Text>
                <Text style={styles.td}>{fmtDate(b.startTime)}, {fmtTime(b.startTime)}</Text>
                <Text style={styles.td}>{durationMin(b.startTime, b.endTime)} min</Text>
                <Text style={styles.td}>{BOOKING_STATUS_LABEL[b.status]}</Text>
                <Text style={styles.td}>{PAYMENT_STATUS_LABEL[b.paymentStatus]}</Text>
              </View>
            );
          })}
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${data.studioName} · Faqja ${pageNumber} nga ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
