// Deterministic service -> colour mapping for the week calendar: the same
// service always gets the same tone (keyed by name, not insertion order, so
// it stays stable across renders/deploys), cycling through a fixed palette
// once there are more services than colours.
const PALETTE = [
  { bg: "bg-accent-soft", text: "text-accent", dot: "bg-accent", border: "border-accent/25" },
  { bg: "bg-gold-soft", text: "text-gold", dot: "bg-gold", border: "border-gold/25" },
  { bg: "bg-purple-soft", text: "text-purple", dot: "bg-purple", border: "border-purple/25" },
  { bg: "bg-warn-soft", text: "text-warn", dot: "bg-warn", border: "border-warn/25" },
  { bg: "bg-teal-soft", text: "text-teal", dot: "bg-teal", border: "border-teal/25" },
  { bg: "bg-ok-soft", text: "text-ok", dot: "bg-ok", border: "border-ok/25" },
] as const;

export type ServiceTone = (typeof PALETTE)[number];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function serviceTone(serviceName: string): ServiceTone {
  return PALETTE[hash(serviceName) % PALETTE.length];
}

// Assigns by sorted position rather than by hash: guarantees zero collisions
// as long as there are no more names than palette entries (the common case),
// instead of leaving it to hash luck. Generic over "names" so the same
// palette can key either services (calendar blocks) or staff (filter dots)
// without the two ever landing on the same colour by coincidence-free design.
function colorMap(names: string[]): Map<string, ServiceTone> {
  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  return new Map(unique.map((name, i) => [name, PALETTE[i % PALETTE.length]]));
}

export function serviceColorMap(serviceNames: string[]): Map<string, ServiceTone> {
  return colorMap(serviceNames);
}

export function staffColorMap(staffNames: string[]): Map<string, ServiceTone> {
  return colorMap(staffNames);
}
