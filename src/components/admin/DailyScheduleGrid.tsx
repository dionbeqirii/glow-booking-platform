import { Fragment } from "react";
import type { DaySchedule } from "@/lib/schedule";
import { BOOKING_STATUS_TONE } from "@/lib/booking-labels";

const CELL_TONE: Record<"neutral" | "ok" | "warn", string> = {
  neutral: "bg-surface-muted text-ink-soft",
  ok: "bg-accent-soft text-accent",
  warn: "bg-danger-soft text-danger",
};

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export default function DailyScheduleGrid({
  schedule,
  hiddenStaff,
  serviceFilter,
}: {
  schedule: DaySchedule;
  hiddenStaff?: Set<string>;
  serviceFilter?: string;
}) {
  const { hours } = schedule;
  const staff = hiddenStaff ? schedule.staff.filter((s) => !hiddenStaff.has(s.id)) : schedule.staff;
  const bookings = serviceFilter ? schedule.bookings.filter((b) => b.serviceName === serviceFilter) : schedule.bookings;

  if (staff.length === 0) {
    return <p className="text-sm text-ink-faint">Nuk ka staf të regjistruar.</p>;
  }
  if (hours.length === 0) {
    return <p className="text-sm text-ink-faint">Asnjë punonjës nuk ka orar për këtë ditë.</p>;
  }

  return (
    <div className="max-h-[420px] overflow-auto rounded-xl border border-line">
      <div
        className="grid min-w-[560px]"
        style={{ gridTemplateColumns: `56px repeat(${staff.length}, minmax(120px, 1fr))` }}
      >
        <div className="sticky top-0 z-10 border-b border-r border-line bg-surface-muted p-1.5 text-[10px] font-medium text-ink-faint">Ora</div>
        {staff.map((s) => {
          const initials = s.name.slice(0, 2).toUpperCase();
          return (
            <div key={s.id} className="sticky top-0 z-10 flex items-center justify-center gap-1.5 truncate border-b border-r border-line bg-surface-muted p-2 text-xs font-semibold text-ink last:border-r-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-bold text-accent">{initials}</span>
              <span className="truncate">{s.name}</span>
            </div>
          );
        })}

        {hours.map((h) => (
          <Fragment key={h}>
            <div className="border-r border-b border-line p-1.5 text-[11px] text-ink-faint last:border-b-0">
              {fmtHour(h)}
            </div>
            {staff.map((s) => {
              const cellBookings = bookings.filter(
                (b) => b.staffId === s.id && b.startTime.getHours() === h
              );
              return (
                <div key={`${h}-${s.id}`} className="min-h-[44px] space-y-1 border-r border-b border-line p-1 last:border-r-0">
                  {cellBookings.map((b) => {
                    const tone = CELL_TONE[BOOKING_STATUS_TONE[b.status]];
                    return (
                      <div key={b.id} className={`truncate rounded-md px-1.5 py-1 text-[11px] leading-tight ${tone}`}>
                        <p className="truncate font-semibold">{b.clientName}</p>
                        <p className="truncate">{b.serviceName}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
