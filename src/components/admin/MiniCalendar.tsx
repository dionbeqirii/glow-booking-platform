import Link from "next/link";

const MONTHS = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
];
const DAY_LETTERS = ["H", "M", "M", "E", "P", "Sh", "D"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultHrefFor(view: string) {
  return (d: Date) => `/admin/kalendari?view=${view}&date=${toISODate(d)}`;
}

// A compact month grid for the sidebar — click any day to jump to it.
// `monthOf` is any date within the month to render; `selected` highlights the
// day currently open in the main view. By default, links jump the Kalendari
// page (preserving whichever day/week/month `view` is active there); pass
// `hrefFor` to reuse this same widget from a different page (e.g. Terminet,
// where a click should set that page's date-range filter instead).
export default function MiniCalendar({
  monthOf,
  selected,
  today,
  view = "week",
  hrefFor,
}: {
  monthOf: Date;
  selected: Date;
  today: Date;
  view?: string;
  hrefFor?: (d: Date) => string;
}) {
  const year = monthOf.getFullYear();
  const month = monthOf.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const buildHref = hrefFor ?? defaultHrefFor(view);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Link
          href={buildHref(prevMonth)}
          aria-label="Muaji i mëparshëm"
          className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <p className="text-xs font-semibold text-ink">{MONTHS[month]} {year}</p>
        <Link
          href={buildHref(nextMonth)}
          aria-label="Muaji tjetër"
          className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {DAY_LETTERS.map((l, i) => (
          <span key={i} className="text-[10px] font-medium text-ink-faint">{l}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const isSelected = d.toDateString() === selected.toDateString();
          const isToday = d.toDateString() === today.toDateString();
          return (
            <Link
              key={i}
              href={buildHref(d)}
              className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-colors ${
                isSelected
                  ? "bg-accent font-semibold text-white"
                  : isToday
                    ? "font-semibold text-accent"
                    : "text-ink-soft hover:bg-surface-muted"
              }`}
            >
              {d.getDate()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
