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

export default function DailyScheduleGrid({ schedule }: { schedule: DaySchedule }) {
  const { staff, hours, bookings } = schedule;

  if (staff.length === 0) {
    return <p className="text-sm text-ink-faint">Nuk ka staf të regjistruar.</p>;
  }
  if (hours.length === 0) {
    return <p className="text-sm text-ink-faint">Asnjë punonjës nuk ka orar për këtë ditë.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[560px] overflow-hidden rounded-xl border border-line"
        style={{ gridTemplateColumns: `56px repeat(${staff.length}, minmax(120px, 1fr))` }}
      >
        <div className="border-b border-r border-line bg-surface-muted" />
        {staff.map((s) => (
          <div key={s.id} className="truncate border-b border-r border-line bg-surface-muted p-2 text-center text-xs font-semibold text-ink last:border-r-0">
            {s.name}
          </div>
        ))}

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
