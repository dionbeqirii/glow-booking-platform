import type { WeekSchedule } from "@/lib/week-schedule";
import { serviceColorMap, serviceTone } from "@/lib/service-colors";

const ROW_PX = 56;
const DAY_LABELS = ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Die"];

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export default function WeekCalendar({
  schedule,
  weekStartDate,
  hiddenStaff,
  serviceFilter,
  now,
}: {
  schedule: WeekSchedule;
  weekStartDate: Date;
  hiddenStaff: Set<string>;
  serviceFilter?: string;
  now: Date;
}) {
  const visibleBookings = schedule.bookings.filter(
    (b) => !hiddenStaff.has(b.staffName) && (!serviceFilter || b.serviceName === serviceFilter)
  );
  const colorByService = serviceColorMap(schedule.services.map((s) => s.name));

  let minHour = 8;
  let maxHour = 19;
  for (const b of visibleBookings) {
    minHour = Math.min(minHour, b.startTime.getHours());
    const endH = b.endTime.getHours() + (b.endTime.getMinutes() > 0 ? 1 : 0);
    maxHour = Math.max(maxHour, endH);
  }
  minHour = Math.max(0, Math.min(minHour, 8));
  maxHour = Math.min(23, Math.max(maxHour, 19));
  const hours: number[] = [];
  for (let h = minHour; h <= maxHour; h++) hours.push(h);
  const gridStartMin = minHour * 60;
  const gridHeight = (maxHour - minHour + 1) * ROW_PX;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const todayIdx = days.findIndex((d) => d.toDateString() === now.toDateString());
  const nowOffset = todayIdx >= 0 ? ((now.getHours() * 60 + now.getMinutes() - gridStartMin) / 60) * ROW_PX : null;

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[880px]" style={{ gridTemplateColumns: `52px repeat(7, minmax(0, 1fr))` }}>
        <div className="border-b border-line" />
        {days.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString();
          return (
            <div key={i} className={`border-b border-l border-line px-2 py-2 text-center ${isToday ? "bg-accent-soft" : ""}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-accent" : "text-ink-faint"}`}>{DAY_LABELS[i]}</p>
              <p className={`text-sm font-bold ${isToday ? "text-accent" : "text-ink"}`}>{d.getDate()}</p>
            </div>
          );
        })}

        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute left-0 right-0 border-t border-line pr-1.5 text-right text-[10px] text-ink-faint" style={{ top: i * ROW_PX }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((d, dayIdx) => {
          const dayBookings = visibleBookings.filter((b) => b.startTime.toDateString() === d.toDateString());
          return (
            <div key={dayIdx} className="relative border-l border-line" style={{ height: gridHeight }}>
              {hours.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 border-t border-line" style={{ top: i * ROW_PX }} />
              ))}
              {nowOffset !== null && dayIdx === todayIdx && (
                <div className="absolute left-0 right-0 z-20 border-t-2 border-danger" style={{ top: nowOffset }}>
                  <span className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-danger" />
                </div>
              )}
              {dayBookings.map((b) => {
                const tone = colorByService.get(b.serviceName) ?? serviceTone(b.serviceName);
                const startMin = b.startTime.getHours() * 60 + b.startTime.getMinutes();
                const endMin = b.endTime.getHours() * 60 + b.endTime.getMinutes();
                const top = ((startMin - gridStartMin) / 60) * ROW_PX;
                const height = Math.max(28, ((endMin - startMin) / 60) * ROW_PX - 2);
                const cancelled = b.status === "CANCELLED" || b.status === "NO_SHOW";
                return (
                  <div
                    key={b.id}
                    className={`absolute left-0.5 right-0.5 overflow-hidden rounded-md border px-1.5 py-1 text-[10px] leading-tight ${tone.bg} ${tone.text} ${tone.border} ${cancelled ? "opacity-50 line-through" : ""}`}
                    style={{ top, height, zIndex: 10 }}
                    title={`${b.serviceName} — ${b.clientName} (${b.staffName})`}
                  >
                    <p className="truncate font-semibold">{b.serviceName}</p>
                    <p className="truncate">{b.clientName}</p>
                    {height > 40 && <p className="truncate opacity-75">{b.staffName}</p>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
