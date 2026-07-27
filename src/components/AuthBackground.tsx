// Background for the authentication screens: a subtle looping video when one is
// configured, otherwise a slow animated warm gradient. A soft overlay keeps the
// brand palette and keeps text readable; motion is dropped for users who prefer
// reduced motion.

// Point this at a local file in /public (e.g. "/login-bg.mp4") or a hosted URL
// to enable the video. Leave empty to use the animated gradient only.
const VIDEO_SRC: string = "/login-bg.mp4";

// Translucent "glass" input for the auth screens (the app's solid inputStyles
// would look out of place on the frosted card). A light border keeps the field
// legible even though it is see-through.
export const authInput =
  "w-full rounded-xl border border-white/50 bg-white/25 px-3.5 py-2.5 text-sm text-ink outline-none backdrop-blur-sm transition-colors placeholder:text-ink-soft focus:border-white/80 focus:bg-white/35 focus:ring-2 focus:ring-white/30";

export default function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Animated warm gradient — always present, and the reduced-motion / no
          video fallback. */}
      <div className="auth-gradient absolute inset-0" />

      {VIDEO_SRC ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      ) : null}

      {/* Light overlay: just enough to lift text sitting directly on the video,
          while letting it show through the glass clearly. */}
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/25 via-transparent to-canvas/35" />
    </div>
  );
}
