import { prisma } from "./prisma";
import { BOOKING_STATUS_LABEL } from "./booking-labels";
import type { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";

export type AppointmentRow = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  staffName: string;
};

export type AppointmentScopeFilters = {
  from?: Date;
  to?: Date;
  staffId?: string;
  serviceId?: string;
  q?: string;
};

export type AppointmentFilters = AppointmentScopeFilters & {
  status?: BookingStatus;
  page: number;
  pageSize: number;
};

export type RawAppointmentSearchParams = {
  from?: string;
  to?: string;
  staff?: string;
  service?: string;
  status?: string;
  q?: string;
};

function parseISODate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Shared by the Terminet page and its PDF export route, so both interpret
// the same URL params (from/to/staff/service/status/q) identically —
// `to` is an inclusive calendar day from the user's point of view, converted
// here to the exclusive upper bound Prisma needs.
export function parseAppointmentFilters(sp: RawAppointmentSearchParams): AppointmentScopeFilters & { status?: BookingStatus } {
  const from = parseISODate(sp.from);
  const toDay = parseISODate(sp.to);
  const to = toDay ? new Date(toDay.getTime() + 86400000) : undefined;
  const status = sp.status && sp.status in BOOKING_STATUS_LABEL ? (sp.status as BookingStatus) : undefined;
  return {
    from,
    to,
    staffId: sp.staff || undefined,
    serviceId: sp.service || undefined,
    q: sp.q || undefined,
    status,
  };
}

function buildWhere(filters: AppointmentScopeFilters): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};
  if (filters.from || filters.to) {
    where.startTime = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lt: filters.to } : {}),
    };
  }
  if (filters.staffId) where.staffId = filters.staffId;
  if (filters.serviceId) where.serviceId = filters.serviceId;
  if (filters.q) {
    where.OR = [
      { client: { name: { contains: filters.q, mode: "insensitive" } } },
      { staff: { name: { contains: filters.q, mode: "insensitive" } } },
      { service: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  return where;
}

// The main "Terminet" table: server-side filtered + paginated, so the page
// never has to load more bookings than it shows.
export async function getAppointments(filters: AppointmentFilters): Promise<{ rows: AppointmentRow[]; total: number }> {
  const where = buildWhere(filters);
  if (filters.status) where.status = filters.status;

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        paymentStatus: true,
        clientId: true,
        client: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    total,
    rows: rows.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      paymentStatus: b.paymentStatus,
      clientId: b.clientId,
      clientName: b.client.name,
      clientPhone: b.client.phone,
      serviceName: b.service.name,
      staffName: b.staff.name,
    })),
  };
}

const EMPTY_BY_STATUS: Record<BookingStatus, number> = {
  CONFIRMED: 0,
  CHECKED_IN: 0,
  IN_SERVICE: 0,
  COMPLETED: 0,
  CANCELLED: 0,
  NO_SHOW: 0,
};

// Status distribution for the sidebar breakdown — respects the date/staff/
// service/search scope but deliberately ignores the status filter itself, so
// switching statuses doesn't collapse the breakdown down to just one bar.
export async function getStatusBreakdown(filters: AppointmentScopeFilters): Promise<Record<BookingStatus, number>> {
  const where = buildWhere(filters);
  const rows = await prisma.booking.groupBy({ by: ["status"], where, _count: { status: true } });
  const result = { ...EMPTY_BY_STATUS };
  for (const r of rows) result[r.status] = r._count.status;
  return result;
}

export type AppointmentsKpis = {
  totalThisMonth: number;
  totalLastMonth: number;
  today: number;
  inProgress: number;
  completedThisMonth: number;
  completedLastMonth: number;
};

// KPI row at the top of the page — "this month vs last month" deltas, plus
// two point-in-time counts (today, currently in service).
export async function getAppointmentsKpis(now: Date): Promise<AppointmentsKpis> {
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [thisMonth, lastMonth, today, inProgress] = await Promise.all([
    prisma.booking.findMany({ where: { startTime: { gte: thisMonthStart, lt: nextMonthStart } }, select: { status: true } }),
    prisma.booking.findMany({ where: { startTime: { gte: lastMonthStart, lt: thisMonthStart } }, select: { status: true } }),
    prisma.booking.count({ where: { startTime: { gte: todayStart, lt: todayEnd } } }),
    prisma.booking.count({ where: { status: "IN_SERVICE" } }),
  ]);

  return {
    totalThisMonth: thisMonth.length,
    totalLastMonth: lastMonth.length,
    today,
    inProgress,
    completedThisMonth: thisMonth.filter((b) => b.status === "COMPLETED").length,
    completedLastMonth: lastMonth.filter((b) => b.status === "COMPLETED").length,
  };
}

export type TodaySummary = {
  total: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

// Shared by the Kalendari and Terminet sidebars so both stay backed by the
// exact same "today" query instead of drifting.
export async function getTodaySummary(now: Date): Promise<TodaySummary> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayBookings = await prisma.booking.findMany({
    where: { startTime: { gte: todayStart, lt: todayEnd } },
    select: { status: true },
  });

  return {
    total: todayBookings.length,
    confirmed: todayBookings.filter((b) => b.status === "CONFIRMED" || b.status === "CHECKED_IN").length,
    inProgress: todayBookings.filter((b) => b.status === "IN_SERVICE").length,
    completed: todayBookings.filter((b) => b.status === "COMPLETED").length,
    cancelled: todayBookings.filter((b) => b.status === "CANCELLED" || b.status === "NO_SHOW").length,
  };
}
