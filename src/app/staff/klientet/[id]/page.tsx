import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { Kpi, EmptyState } from "@/components/ui";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_PILL } from "@/lib/booking-labels";
import { serviceColorMap } from "@/lib/service-colors";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d: Date): string {
  return d.toLocaleString("sq", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IcClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" />
    </svg>
  );
}
function IcAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="m12 2.5 3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77l-6.18 3.25L7 14.15l-5-4.87 6.91-1L12 2.5Z" />
    </svg>
  );
}
function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-gold" aria-label={`${value} nga 5 yje`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} />
      ))}
    </div>
  );
}

type Ctx = { params: Promise<{ id: string }> };

// Staff-facing mirror of the admin client profile: booking history +
// feedback, view-only. A skin therapist looking up a client's history and
// past ratings is a natural, bounded self-service action — same RBAC
// posture as the rest of the staff-facing pages this session.
export default async function StaffClientProfilePage({ params }: Ctx) {
  const session = await requireRole("STAFF");
  const { id } = await params;

  const client = await prisma.user.findFirst({
    where: { id, role: "CLIENT" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  if (!client) notFound();

  const [bookings, feedback] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId: id },
      orderBy: { startTime: "desc" },
      take: 30,
      select: {
        id: true,
        startTime: true,
        status: true,
        paymentStatus: true,
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.feedback.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        booking: { select: { service: { select: { name: true } }, startTime: true } },
      },
    }),
  ]);

  const activeBookings = bookings.filter((b) => b.status !== "CANCELLED");
  const lastVisit = activeBookings[0]?.startTime ?? null;
  const avgRating = feedback.length > 0 ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : null;
  const complaints = feedback.filter((f) => f.rating <= 2);
  const colorByService = serviceColorMap(bookings.map((b) => b.service.name));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <Link href="/staff/klientet" className="text-sm text-ink-soft hover:underline">
          ← Klientët
        </Link>

        <div className="mt-2 mb-5 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
            {initials(client.name)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-ink">{client.name}</h1>
            <p className="text-sm text-ink-soft">{client.email} · {client.phone ?? "Pa telefon"}</p>
            <p className="text-xs text-ink-faint">Klient që nga {fmtDate(client.createdAt)}</p>
          </div>
        </div>

        <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            href={`/staff/klientet/${id}`}
            tone="accent"
            icon={<IcCalendar />}
            value={activeBookings.length}
            label="Rezervime Gjithsej"
            sub="Të gjitha kohërat"
          />
          <Kpi
            href={`/staff/klientet/${id}`}
            tone="gold"
            icon={<IcClock />}
            value={lastVisit ? fmtDate(lastVisit) : "—"}
            label="Vizita e Fundit"
            sub={lastVisit ? "Rezervimi më i fundit" : "Ende pa vizitë"}
          />
          <Kpi
            href={`/staff/klientet/${id}`}
            tone="purple"
            icon={<IcStar />}
            value={avgRating !== null ? avgRating.toFixed(1) : "—"}
            label="Vlerësimi Mesatar"
            sub={feedback.length > 0 ? `${feedback.length} vlerësime` : "Ende pa vlerësime"}
          />
          <Kpi
            href={`/staff/klientet/${id}`}
            tone="warn"
            icon={<IcAlert />}
            value={complaints.length}
            label="Ankesa"
            sub="Vlerësime të ulëta"
          />
        </div>

        <div className="mb-5 rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink">Feedback &amp; Ankesa</h2>
          <p className="mb-4 text-xs text-ink-faint">
            {complaints.length > 0
              ? `${complaints.length} vlerësim${complaints.length === 1 ? "" : "e"} i ulët — trajtoji si ankesa.`
              : "Vlerësimet e klientit pas rezervimeve të përfunduara ose të anuluara."}
          </p>
          {feedback.length === 0 ? (
            <EmptyState text="Ende nuk ka lënë feedback." />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {feedback.map((f) => {
                const isComplaint = f.rating <= 2;
                return (
                  <li
                    key={f.id}
                    className={`rounded-xl p-3.5 ring-1 ${isComplaint ? "bg-danger-soft ring-danger/20" : "bg-surface-muted ring-line"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Stars value={f.rating} />
                        {isComplaint && (
                          <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Ankesë
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-ink-faint">
                        {f.booking.service.name} · {fmtDate(f.booking.startTime)}
                      </span>
                    </div>
                    {f.comment && <p className="mt-2 text-sm text-ink">{f.comment}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Historiku i Rezervimeve</h2>
          {bookings.length === 0 ? (
            <EmptyState text="Ende pa rezervime." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {bookings.map((b) => {
                const tone = colorByService.get(b.service.name);
                const statusPill = BOOKING_STATUS_PILL[b.status];
                const paymentPill = PAYMENT_STATUS_PILL[b.paymentStatus];
                return (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-surface-muted/60">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone?.dot ?? "bg-ink-faint"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{b.service.name}</p>
                        <p className="truncate text-xs text-ink-faint">{fmtDateTime(b.startTime)} · {b.staff.name}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${statusPill.bg} ${statusPill.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusPill.dot}`} />
                        {BOOKING_STATUS_LABEL[b.status]}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${paymentPill.bg} ${paymentPill.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${paymentPill.dot}`} />
                        {PAYMENT_STATUS_LABEL[b.paymentStatus]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
