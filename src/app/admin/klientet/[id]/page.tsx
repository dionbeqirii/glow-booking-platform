import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Card, Badge, EmptyState } from "@/components/ui";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/booking-labels";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d: Date): string {
  return d.toLocaleString("sq", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

// Client profile (2.6): booking history + feedback. Low ratings are flagged
// as complaints — there is no separate ticket system, so this is where an
// admin spots and reads them.
export default async function AdminClientProfilePage({ params }: Ctx) {
  const session = await requireRole("ADMIN");
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

  const avgRating = feedback.length > 0 ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : null;
  const complaints = feedback.filter((f) => f.rating <= 2);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/klientet" className="text-sm text-ink-soft hover:underline">
          ← Klientët
        </Link>
        <div className="mt-2">
          <PageTitle title={client.name} hint={`Klient që nga ${fmtDate(client.createdAt)}`} />
        </div>

        {/* Contact + rating summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Kontakti</p>
            <p className="mt-2 text-sm text-ink">{client.email}</p>
            <p className="text-sm text-ink-soft">{client.phone ?? "—"}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Rezervime</p>
            <p className="mt-2 text-2xl font-bold text-ink">{bookings.length}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Vlerësimi mesatar</p>
            {avgRating === null ? (
              <p className="mt-2 text-sm text-ink-faint">Ende pa feedback</p>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <Stars value={Math.round(avgRating)} />
                <span className="text-sm font-semibold text-ink">{avgRating.toFixed(1)}</span>
              </div>
            )}
          </Card>
        </div>

        {/* Feedback & complaints */}
        <Card className="mb-6">
          <h2 className="mb-1 text-sm font-semibold text-ink">Feedback & Ankesa</h2>
          <p className="mb-4 text-xs text-ink-faint">
            {complaints.length > 0
              ? `${complaints.length} vlerësim${complaints.length === 1 ? "" : "e"} i ulët — trajtoji si ankesa.`
              : "Vlerësimet e klientit pas rezervimeve të përfunduara ose të anuluara."}
          </p>
          {feedback.length === 0 ? (
            <EmptyState text="Ende nuk ka lënë feedback." />
          ) : (
            <ul className="flex flex-col gap-3">
              {feedback.map((f) => {
                const isComplaint = f.rating <= 2;
                return (
                  <li
                    key={f.id}
                    className={`rounded-xl p-3.5 ring-1 ${
                      isComplaint ? "bg-danger-soft ring-danger/20" : "bg-surface-muted ring-line"
                    }`}
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
        </Card>

        {/* Booking history */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-ink">Historiku i rezervimeve</h2>
          {bookings.length === 0 ? (
            <EmptyState text="Ende pa rezervime." />
          ) : (
            <ul className="divide-y divide-line">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{b.service.name}</p>
                    <p className="text-xs text-ink-faint">
                      {fmtDateTime(b.startTime)} · {b.staff.name}
                    </p>
                  </div>
                  <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
