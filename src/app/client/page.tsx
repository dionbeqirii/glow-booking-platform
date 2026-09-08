import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { BOOKING_STATUS_PILL } from "@/lib/booking-labels";
import {
  getUpcomingAppointment,
  getRecentAppointments,
  getClientQueueStatus,
  getRecommendedServices,
} from "@/lib/client-dashboard";
import LoyaltyPointsCard from "@/components/client/LoyaltyPointsCard";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IcClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}
function IcChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-faint" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function IcUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ChairIllustration() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" className="shrink-0 self-center text-ok/50" aria-hidden>
      <rect x="14" y="10" width="36" height="26" rx="8" stroke="currentColor" strokeWidth="2" />
      <path d="M18 34v16M46 34v16M18 44h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 50v4M50 50v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="20" r="5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function LeafDecoration() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent/40" aria-hidden>
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
      <path d="M9 21h6M12 17v4" />
      <path d="M9 8c1.5-1 3-1 4.5 0" />
    </svg>
  );
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

export default async function ClientDashboardPage() {
  const session = await requireRole("CLIENT");
  const [t, tStatus, locale] = await Promise.all([
    getTranslations("ClientDashboard"),
    getTranslations("Status.booking"),
    getLocale(),
  ]);
  const now = new Date();

  const [upcoming, recent, queueStatus, recommended, me] = await Promise.all([
    getUpcomingAppointment(session.userId, now, locale),
    getRecentAppointments(session.userId, 4, locale),
    getClientQueueStatus(session.userId),
    getRecommendedServices(session.userId, 2),
    prisma.user.findUnique({ where: { id: session.userId }, select: { loyaltyPoints: true } }),
  ]);

  const firstName = session.name.split(" ")[0];

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">{t("welcome", { name: firstName })}</h1>
          <p className="text-sm text-ink-soft">{t("welcomeHint")}</p>
        </div>

        <div className="flex flex-col gap-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-3 lg:h-auto lg:min-h-0">
            <div className="shrink-0 rounded-xl border border-line bg-surface p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{t("upcomingTitle")}</p>
                <Link href="/client/terminet" className="text-xs font-semibold text-accent hover:underline">{t("viewAllLink")}</Link>
              </div>
              {upcoming ? (
                <>
                  <div className="flex items-start gap-3 rounded-xl bg-surface-muted p-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent">
                      {initials(upcoming.serviceName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{upcoming.serviceName}</p>
                      {upcoming.serviceDescription && <p className="truncate text-xs text-ink-faint">{upcoming.serviceDescription}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                        <span className="flex items-center gap-1"><IcCalendar />{upcoming.dateLabel}</span>
                        <span className="flex items-center gap-1"><IcClock />{upcoming.timeLabel}</span>
                        <span className="flex items-center gap-1"><IcUser />{upcoming.staffName}{upcoming.staffTitle ? ` · ${upcoming.staffTitle}` : ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${BOOKING_STATUS_PILL[upcoming.status].bg} ${BOOKING_STATUS_PILL[upcoming.status].text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${BOOKING_STATUS_PILL[upcoming.status].dot}`} />
                      {tStatus(upcoming.status)}
                    </span>
                    <Link href="/client/terminet" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-soft ring-1 ring-line-strong transition-colors hover:bg-surface-muted">
                      {t("viewDetailsLink")}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-6 text-center">
                  <p className="text-sm text-ink-faint">{t("noUpcomingAppt")}</p>
                  <Link href="/client/rezervo" className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover">
                    {t("bookNowLink")}
                  </Link>
                </div>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3">
              <div className="flex flex-col rounded-xl border border-line bg-surface p-3.5">
                <p className="text-sm font-semibold text-ink">{t("joinQueueTitle")}</p>
                <p className="mt-1 text-xs text-ink-faint">{t("joinQueueHint")}</p>
                <ChairIllustration />
                <Link href="/client/radha" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-ok-soft px-3 py-1.5 text-xs font-semibold text-ok transition-colors hover:brightness-95">
                  <IcUsers />
                  {t("joinQueueButton")}
                </Link>
              </div>
              <div className="flex flex-col rounded-xl border border-line bg-surface p-3.5">
                <p className="text-sm font-semibold text-ink">{t("queueStatusTitle")}</p>
                {queueStatus ? (
                  <>
                    <div className="mt-2 flex items-center gap-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-soft text-purple"><IcUsers /></span>
                      <div className="min-w-0">
                        <p className="text-xs text-ink-faint">{t("queuePositionLabel")}</p>
                        <p className="text-xl font-bold leading-tight text-ink">#{queueStatus.position}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink-faint">{t("estimatedWaitLabel")}</p>
                    <p className="text-sm font-semibold text-purple">{t("estimatedWaitValue", { min: queueStatus.estimatedWaitMin })}</p>
                    <Link href="/client/radha" className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-purple ring-1 ring-purple/30 transition-colors hover:bg-purple-soft">
                      {t("viewQueueLink")}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 flex-1 text-xs text-ink-faint">{t("notInQueue")}</p>
                    <Link href="/client/radha" className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-purple ring-1 ring-purple/30 transition-colors hover:bg-purple-soft">
                      {t("viewQueueLink")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="min-h-[160px] shrink-0 rounded-xl border border-line bg-surface p-3.5 lg:min-h-0 lg:flex-1">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{t("recentAppointmentsTitle")}</p>
                <Link href="/client/terminet" className="text-xs font-semibold text-accent hover:underline">{t("viewAllLink")}</Link>
              </div>
              {recent.length === 0 ? (
                <p className="flex h-full items-center justify-center text-xs text-ink-faint">{t("noCompletedAppts")}</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5 py-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink-soft">
                        {initials(r.serviceName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{r.serviceName}</p>
                        {r.serviceDescription && <p className="truncate text-xs text-ink-faint">{r.serviceDescription}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-ink-faint">{r.dateLabel}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BOOKING_STATUS_PILL[r.status].bg} ${BOOKING_STATUS_PILL[r.status].text}`}>
                        {tStatus(r.status)}
                      </span>
                      <IcChevron />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
            <div className="relative shrink-0 overflow-hidden rounded-xl border border-line bg-surface p-3.5">
              <p className="text-sm font-semibold text-ink">{t("newBookingTitle")}</p>
              <p className="mt-1 pr-10 text-xs text-ink-faint">{t("newBookingHint")}</p>
              <Link href="/client/rezervo" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
                <IcCalendar />
                {t("newBookingButton")}
              </Link>
              <div className="absolute -bottom-2 -right-2">
                <LeafDecoration />
              </div>
            </div>

            <LoyaltyPointsCard points={me?.loyaltyPoints ?? 0} />

            <div className="shrink-0 rounded-xl border border-line bg-surface p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{t("recommendedTitle")}</p>
                <Link href="/client/rezervo" className="text-xs font-semibold text-accent hover:underline">{t("viewAllLink")}</Link>
              </div>
              <div className="flex flex-col gap-1.5">
                {recommended.map((s) => (
                  <Link
                    key={s.id}
                    href={`/client/rezervo?service=${s.id}`}
                    className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-muted"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-accent">
                      {initials(s.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                      <p className="truncate text-xs text-ink-faint">{s.description}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink">{s.price.toFixed(2)} €</p>
                    <IcChevron />
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-accent-soft to-purple-soft p-4">
              <p className="text-sm font-semibold text-ink">{t("glowBannerTitle")}</p>
              <p className="mt-1 max-w-[70%] text-xs text-ink-soft">{t("glowBannerHint")}</p>
              <div className="absolute -bottom-3 -right-3 opacity-70">
                <LeafDecoration />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
