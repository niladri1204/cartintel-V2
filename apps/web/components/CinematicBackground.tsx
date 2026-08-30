export default function CinematicBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-[#070507]"
    >
      {/* 1. Base Dark Environment */}
      <div className="absolute inset-0 bg-[#070507]" />

      {/* 2. Layer 1: Broad Deep Plum & Burgundy Atmospheric Mass (Right/Center) */}
      <div
        className="absolute w-[120vw] h-[120vh] -top-[20vh] -right-[20vw] opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 65% 40%, rgba(90, 37, 77, 0.35) 0%, rgba(45, 14, 38, 0.20) 45%, rgba(18, 5, 15, 0.08) 70%, transparent 90%)",
        }}
      />

      {/* 3. Layer 2: Deep Burgundy Lower-Left Base Glow */}
      <div
        className="absolute w-[100vw] h-[100vh] -bottom-[20vh] -left-[20vw] opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 30% 70%, rgba(65, 18, 48, 0.30) 0%, rgba(30, 8, 22, 0.15) 45%, transparent 80%)",
        }}
      />

      {/* 4. Layer 3: Main Sweeping Wave Atmosphere (Soft Broad Diagonal Mauve/Plum) */}
      <div
        className="absolute w-[160vw] h-[90vh] -left-[30vw] top-[15vh] -rotate-[22deg] opacity-70 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 35% at 50% 50%, rgba(138, 60, 112, 0.22) 0%, rgba(90, 37, 77, 0.15) 30%, rgba(40, 12, 32, 0.06) 60%, transparent 85%)",
        }}
      />

      {/* 5. Layer 4: Dusty Pink Illumination Core (Broad Soft Feathered Arc) */}
      <div
        className="absolute w-[140vw] h-[60vh] -left-[20vw] top-[30vh] -rotate-[24deg] opacity-65 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 22% at 50% 50%, rgba(201, 130, 167, 0.18) 0%, rgba(138, 60, 112, 0.12) 32%, rgba(65, 20, 52, 0.04) 62%, transparent 80%)",
        }}
      />

      {/* 6. Layer 5: Softest Bright Highlight Bloom (Feathered Diffuse Glow - NOT a sharp line) */}
      <div
        className="absolute w-[95vw] h-[32vh] left-[5vw] top-[42vh] -rotate-[24deg] opacity-55 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 45% 15% at 50% 50%, rgba(229, 164, 196, 0.15) 0%, rgba(201, 130, 167, 0.08) 35%, rgba(138, 60, 112, 0.02) 65%, transparent 85%)",
        }}
      />

      {/* 7. Layer 6: Ambient Vignette & Deep Contrast Masking */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(7, 5, 7, 0.45) 75%, rgba(7, 5, 7, 0.90) 100%)",
        }}
      />

      {/* 8. Layer 7: Static Organic Film Grain (Zero Animation, Pure Texture) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.032] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="cinematicFilmGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cinematicFilmGrain)" />
      </svg>
    </div>
  );
}
