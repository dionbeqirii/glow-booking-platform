// Ambient backdrop for the glassmorphism trial on the admin dashboard: a few
// large, softly-blurred brand-colour blobs sitting behind the page. On their
// own they're just soft light; the point is what they give the translucent
// cards above something to actually blur and reveal. Fixed + negative z-index
// so it covers the full viewport (including behind the sticky header) without
// scrolling with the content, purely decorative and non-interactive.
export default function DashboardGlassBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas" aria-hidden="true">
      <div className="absolute -left-48 -top-48 h-[36rem] w-[36rem] rounded-full bg-accent/55 blur-[100px]" />
      <div className="absolute -right-40 -top-20 h-[32rem] w-[32rem] rounded-full bg-gold/50 blur-[100px]" />
      <div className="absolute -bottom-56 left-1/4 h-[34rem] w-[34rem] rounded-full bg-ok/40 blur-[110px]" />
      <div className="absolute bottom-[-8rem] right-1/4 h-[28rem] w-[28rem] rounded-full bg-accent/35 blur-[100px]" />
      <div className="absolute left-1/3 top-1/3 h-[24rem] w-[24rem] rounded-full bg-gold/30 blur-[110px]" />
    </div>
  );
}
