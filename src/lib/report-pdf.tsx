// Admin PDF export (3.4). Built with @react-pdf/renderer, which renders to
// PDF primitives — these components (Document/Page/View/Text) are NOT DOM
// elements and cannot be mixed with the rest of the app's React tree or
// Tailwind classes. Keep this file self-contained.
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { BOOKING_STATUS_LABEL } from "./booking-labels";
import type { StudioStats } from "./stats";
import type { BookingStatus } from "@prisma/client";

export type TopService = { name: string; count: number; revenue: number };

export type ReportData = {
  studioName: string;
  months: number;
  from: Date;
  to: Date;
  generatedAt: Date;
  stats: StudioStats;
  topServices: TopService[];
  revenueTotal: number;
};

const ACCENT = "#c1546c";
const INK = "#2b2622";
const INK_SOFT = "#6b625c";
const LINE = "#e7ded8";
const SURFACE_MUTED = "#f7f1ec";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INK },
  brandAccent: { color: ACCENT },
  title: { fontSize: 13, marginTop: 4, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: INK_SOFT, marginTop: 2 },
  headerRule: { borderBottomWidth: 1, borderBottomColor: LINE, marginTop: 12, marginBottom: 16 },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiBox: { flex: 1, backgroundColor: SURFACE_MUTED, borderRadius: 6, padding: 10 },
  kpiLabel: { fontSize: 8, color: INK_SOFT, textTransform: "uppercase" },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 4 },

  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 18 },

  table: { borderWidth: 1, borderColor: LINE, borderRadius: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  trLast: { flexDirection: "row" },
  th: { flex: 1, padding: 6, fontSize: 8, fontFamily: "Helvetica-Bold", color: INK_SOFT, backgroundColor: SURFACE_MUTED, textTransform: "uppercase" },
  td: { flex: 1, padding: 6, fontSize: 9 },

  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: INK_SOFT, textAlign: "center" },
});

function fmtDate(d: Date): string {
  return d.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d: Date): string {
  return d.toLocaleString("sq", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
function eur(n: number): string {
  return `${n.toFixed(2)} €`;
}

const STATUS_ORDER: BookingStatus[] = ["COMPLETED", "CONFIRMED", "CHECKED_IN", "IN_SERVICE", "CANCELLED", "NO_SHOW"];

export function StudioReportDocument({ data }: { data: ReportData }) {
  const { stats } = data;

  return (
    <Document title={`Raporti i Studios — ${data.months} muaj`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View>
          <Text style={styles.brand}>
            Glow <Text style={styles.brandAccent}>By Diellza</Text>
          </Text>
          <Text style={styles.title}>Raporti i Studios</Text>
          <Text style={styles.meta}>
            Periudha: {fmtDate(data.from)} – {fmtDate(data.to)} ({data.months} muaj)
          </Text>
          <Text style={styles.meta}>Krijuar më {fmtDateTime(data.generatedAt)}</Text>
        </View>
        <View style={styles.headerRule} />

        {/* KPI summary */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Rezervime gjithsej</Text>
            <Text style={styles.kpiValue}>{stats.bookings.total}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Norma e anulimeve</Text>
            <Text style={styles.kpiValue}>{pct(stats.bookings.cancellationRate)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Norma e no-show</Text>
            <Text style={styles.kpiValue}>{pct(stats.bookings.noShowRate)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Të ardhurat (vlerësuar)</Text>
            <Text style={styles.kpiValue}>{eur(data.revenueTotal)}</Text>
          </View>
        </View>

        {/* Bookings by status */}
        <Text style={styles.sectionTitle}>Rezervimet sipas statusit</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.th}>Statusi</Text>
            <Text style={styles.th}>Numri</Text>
            <Text style={styles.th}>Përqindja</Text>
          </View>
          {STATUS_ORDER.map((s, i) => {
            const count = stats.bookings.byStatus[s];
            const share = stats.bookings.total > 0 ? count / stats.bookings.total : 0;
            const isLast = i === STATUS_ORDER.length - 1;
            return (
              <View key={s} style={isLast ? styles.trLast : styles.tr}>
                <Text style={styles.td}>{BOOKING_STATUS_LABEL[s]}</Text>
                <Text style={styles.td}>{count}</Text>
                <Text style={styles.td}>{pct(share)}</Text>
              </View>
            );
          })}
        </View>

        {/* Staff utilization */}
        <Text style={styles.sectionTitle}>Shfrytëzimi i stafit</Text>
        {stats.utilization.length === 0 ? (
          <Text style={{ fontSize: 9, color: INK_SOFT }}>Nuk ka staf të regjistruar.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={styles.th}>Punonjësi</Text>
              <Text style={styles.th}>Orë të rezervuara</Text>
              <Text style={styles.th}>Orë të disponueshme</Text>
              <Text style={styles.th}>Shfrytëzimi</Text>
            </View>
            {stats.utilization.map((u, i) => {
              const isLast = i === stats.utilization.length - 1;
              return (
                <View key={u.staffId} style={isLast ? styles.trLast : styles.tr}>
                  <Text style={styles.td}>{u.name}</Text>
                  <Text style={styles.td}>{(u.bookedMin / 60).toFixed(1)} orë</Text>
                  <Text style={styles.td}>{(u.availableMin / 60).toFixed(1)} orë</Text>
                  <Text style={styles.td}>{pct(u.utilization)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Top services */}
        <Text style={styles.sectionTitle}>Shërbimet më të kërkuara</Text>
        {data.topServices.length === 0 ? (
          <Text style={{ fontSize: 9, color: INK_SOFT }}>Ende pa rezervime në këtë periudhë.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={styles.th}>Shërbimi</Text>
              <Text style={styles.th}>Rezervime</Text>
              <Text style={styles.th}>Të ardhurat</Text>
            </View>
            {data.topServices.map((s, i) => {
              const isLast = i === data.topServices.length - 1;
              return (
                <View key={s.name} style={isLast ? styles.trLast : styles.tr}>
                  <Text style={styles.td}>{s.name}</Text>
                  <Text style={styles.td}>{s.count}</Text>
                  <Text style={styles.td}>{eur(s.revenue)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Queue */}
        <Text style={styles.sectionTitle}>Radha pa termin</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.th}>Check-in gjithsej</Text>
            <Text style={styles.th}>Të shërbyer</Text>
            <Text style={styles.th}>No-show</Text>
            <Text style={styles.th}>Pritja mesatare</Text>
          </View>
          <View style={styles.trLast}>
            <Text style={styles.td}>{stats.queue.checkins}</Text>
            <Text style={styles.td}>{stats.queue.completed}</Text>
            <Text style={styles.td}>{stats.queue.noShow}</Text>
            <Text style={styles.td}>{stats.queue.avgWaitMin === null ? "—" : `${stats.queue.avgWaitMin} min`}</Text>
          </View>
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
