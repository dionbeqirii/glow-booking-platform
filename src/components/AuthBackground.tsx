// Background for the authentication screens: a subtle looping video when one is
// configured, otherwise a slow animated warm gradient. A soft overlay keeps the
// brand palette and keeps text readable; motion is dropped for users who prefer
// reduced motion.

// Point this at a local file in /public (e.g. "/login-bg.mp4") or a hosted URL
// to enable the video. Leave empty to use the animated gradient only.
const VIDEO_SRC: string = "/login-bg.mp4";

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
