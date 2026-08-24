// Ambient backdrop for the glassmorphism trial on the admin dashboard: a few
// large, softly-blurred brand-colour blobs sitting behind the page. On their
// own they're just soft light; the point is what they give the translucent
// cards above something to actually blur and reveal. Fixed + negative z-index
// so it covers the full viewport (including behind the sticky header) without
// scrolling with the content, purely decorative and non-interactive.
//
// Kept to 3 blobs at a moderate blur radius on purpose: `filter: blur()` is
// expensive per pixel, and every glass card on top of this also runs its own
// `backdrop-filter: blur()` to sample it — more/bigger blobs multiplies real,
// measurable GPU cost across the whole page, not just this component.
export default function DashboardGlassBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas" aria-hidden="true">
      <div className="absolute -left-48 -top-48 h-[32rem] w-[32rem] rounded-full bg-accent/50 blur-[70px]" />
      <div className="absolute -right-40 -top-20 h-[28rem] w-[28rem] rounded-full bg-gold/45 blur-[70px]" />
      <div className="absolute -bottom-56 left-1/4 h-[30rem] w-[30rem] rounded-full bg-ok/35 blur-[75px]" />
    </div>
  );
}
