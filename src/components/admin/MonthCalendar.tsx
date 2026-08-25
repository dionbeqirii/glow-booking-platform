import Link from "next/link";
import type { MonthSchedule } from "@/lib/month-schedule";
import { serviceColorMap, serviceTone } from "@/lib/service-colors";

const DAY_LABELS = ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Die"];
const MAX_SHOWN = 3;

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MonthCalendar({
  schedule,
  monthOf,
  hiddenStaff,
  serviceFilter,
  today,
  hideParam,
}: {
  schedule: MonthSchedule;
  monthOf: Date;
  hiddenStaff: Set<string>;
  serviceFilter?: string;
  today: Date;
  hideParam: string;
}) {
  const visibleBookings = schedule.bookings.filter(
    (b) => !hiddenStaff.has(b.staffName) && (!serviceFilter || b.serviceName === serviceFilter)
  );
  const colorByService = serviceColorMap(schedule.services.map((s) => s.name));

  const year = monthOf.getFullYear();
  const month = monthOf.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  function hrefFor(d: Date): string {
    const q = new URLSearchParams();
    q.set("view", "day");
    q.set("date", toISODate(d));
    if (hideParam) q.set("hide", hideParam);
    if (serviceFilter) q.set("service", serviceFilter);
    return `/admin/kalendari?${q.toString()}`;
  }

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
      {DAY_LABELS.map((l) => (
        <div key={l} className="bg-surface-muted px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          {l}
        </div>
      ))}
      {cells.map((d, i) => {
        if (!d) return <div key={i} className="min-h-[104px] bg-surface-muted/40" />;
        const dayBookings = visibleBookings.filter((b) => b.startTime.toDateString() === d.toDateString());
        const isToday = d.toDateString() === today.toDateString();
        const shown = dayBookings.slice(0, MAX_SHOWN);
        const extra = dayBookings.length - shown.length;
        return (
          <Link
            key={i}
            href={hrefFor(d)}
            className={`flex min-h-[104px] flex-col gap-1 bg-surface p-1.5 text-left transition-colors hover:bg-surface-muted ${isToday ? "ring-2 ring-inset ring-accent" : ""}`}
          >
            <span className={`text-xs font-semibold ${isToday ? "text-accent" : "text-ink"}`}>{d.getDate()}</span>
            <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
              {shown.map((b) => {
                const tone = colorByService.get(b.serviceName) ?? serviceTone(b.serviceName);
                return (
                  <span key={b.id} className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${tone.bg} ${tone.text}`}>
                    {b.serviceName}
                  </span>
                );
              })}
              {extra > 0 && <span className="text-[10px] text-ink-faint">+{extra} më shumë</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
