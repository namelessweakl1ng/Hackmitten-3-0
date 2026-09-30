"use client";

import { useEffect, useRef, useState } from "react";
import { resolveSponsors } from "@/data/sponsors";

type Sponsor = ReturnType<typeof resolveSponsors>[number];

export function Sponsors() {
  const sponsors = resolveSponsors();

  if (sponsors.length === 0) {
    return null;
  }

  /* ================================
     SEPARATE SPONSORS AND DEPARTMENTS
     ================================ */

  const sponsorLogos = sponsors.filter(
    (sponsor) => sponsor.tier !== "CUSTOM"
  );

  const departmentLogos = sponsors.filter(
    (sponsor) => sponsor.tier === "CUSTOM"
  );

  /* ================================
     DEPARTMENT LOGO FALLBACK
     ================================ */

  const getDepartmentLogo = (department: Sponsor) => {
    if (department.logoUrl) {
      return department.logoUrl;
    }

    const name = department.name.toLowerCase();

    if (name.includes("cse")) {
      return "/images/sponsors/cse.png";
    }

    if (name.includes("ai") || name.includes("ml")) {
      return "/images/sponsors/aiml.png";
    }

    return "";
  };

  return (
    <section
      id="sponsors"
      className="relative border-t border-white/5 py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-10">

        {/* ================================
                    HEADER
            ================================ */}

        <div className="mb-10 text-center md:mb-16">
          <div className="mono mb-4 text-xs uppercase tracking-[0.3em] text-[#B52A32]">
            / Partners
          </div>

          <h2 className="display text-3xl font-bold leading-[0.95] tracking-tight text-white sm:text-5xl md:text-7xl">
            BACKED BY
            <br />
            <span className="text-[#A8A8A8]">THE BEST.</span>
          </h2>
        </div>

        {/* =====================================================
                            SPONSORS
            ===================================================== */}

        {sponsorLogos.length > 0 && (
          <div className="mb-16 md:mb-24">

            {/* Sponsors title */}
            <div className="mb-8 flex items-center gap-4">
              <span className="mono whitespace-nowrap text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                SPONSORS
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <SponsorGlobe sponsors={sponsorLogos} />

          </div>
        )}

        {/* =====================================================
                         DEPARTMENTS
            ===================================================== */}

        {departmentLogos.length > 0 && (
          <div>

            {/* Departments title */}
            <div className="mb-8 flex items-center gap-4">
              <span className="mono whitespace-nowrap text-[10px] uppercase tracking-widest text-[#A8A8A8]">
                DEPARTMENTS
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* CSE + AI&ML */}
            <div className="flex items-start justify-center gap-12 md:gap-24">

              {departmentLogos.map((department) => {
                const logo = getDepartmentLogo(department);

                return (
                  <div
                    key={department.id}
                    className="flex w-32 flex-col items-center md:w-40"
                  >

                    {/* Circular logo */}
                    <div
                      className="
                        flex
                        h-28
                        w-28
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-full
                        bg-white
                        p-2
                        shadow-lg
                        md:h-36
                        md:w-36
                      "
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${department.name} logo`}
                          loading="lazy"
                          className="
                            h-full
                            w-full
                            rounded-full
                            object-contain
                          "
                        />
                      ) : (
                        <span className="text-center text-sm font-bold text-black">
                          {department.name}
                        </span>
                      )}
                    </div>

                    {/* Department name */}
                    <span
                      className="
                        mono
                        mt-4
                        text-center
                        text-xs
                        uppercase
                        tracking-widest
                        text-[#A8A8A8]
                      "
                    >
                      {department.name}
                    </span>

                  </div>
                );
              })}

            </div>
          </div>
        )}

      </div>
    </section>
  );
}

/* ================================================================
   SPONSOR GLOBE  –  logos fixed on a 3-D rotating sphere
================================================================ */

function SponsorGlobe({ sponsors }: { sponsors: Sponsor[] }) {
  const rafRef = useRef<number>(0);
  const yawRef = useRef(0);          // auto-rotation angle (radians)
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false, lastX: 0, lastY: 0,
  });
  const pitchRef = useRef(0.35);     // tilt (radians) – fixed slight tilt
  const manualYawRef = useRef(0);    // extra yaw from drag
  const [, forceRender] = useState(0);

  const R = 180; // sphere radius in px
  const n = sponsors.length;

  // Distribute logos evenly on sphere surface using golden-angle spiral
  const positions = sponsors.map((_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);   // polar
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;    // azimuthal
    return { phi, theta };
  });

  useEffect(() => {
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      if (!dragRef.current.active) yawRef.current += dt * 0.4;
      forceRender((v) => v + 1);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    yawRef.current += dx * 0.008;
  }
  function onPointerUp() { dragRef.current.active = false; }

  const totalYaw = yawRef.current + manualYawRef.current;
  const pitch = pitchRef.current;

  // Project 3-D point onto 2-D canvas
  function project(phi: number, theta: number) {
    const x0 = R * Math.sin(phi) * Math.cos(theta);
    const y0 = R * Math.cos(phi);
    const z0 = R * Math.sin(phi) * Math.sin(theta);

    // rotate around Y axis (yaw)
    const x1 = x0 * Math.cos(totalYaw) + z0 * Math.sin(totalYaw);
    const z1 = -x0 * Math.sin(totalYaw) + z0 * Math.cos(totalYaw);

    // rotate around X axis (pitch)
    const y2 = y0 * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y0 * Math.sin(pitch) + z1 * Math.cos(pitch);

    const scale = (z2 + R * 2) / (R * 3); // perspective scale
    return { sx: x1 * scale, sy: y2 * scale, scale, z: z2 };
  }

  const projected = positions.map(({ phi, theta }, i) => ({
    ...project(phi, theta),
    sponsor: sponsors[i],
  }));

  // Sort back-to-front so front logos render on top
  projected.sort((a, b) => a.z - b.z);

  const SIZE = R * 2 + 160; // canvas size

  return (
    <div className="flex justify-center">
      <div
        className="relative cursor-grab select-none active:cursor-grabbing"
        style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Globe wireframe rings */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          <defs>
            <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#B52A32" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#B52A32" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#globeGlow)" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#B52A32" strokeOpacity="0.15" strokeWidth="1" />
          {/* latitude rings */}
          {[-0.6, -0.3, 0, 0.3, 0.6].map((t, i) => {
            const ry = R * Math.sqrt(1 - t * t);
            const cy = SIZE / 2 + R * t;
            return <ellipse key={i} cx={SIZE / 2} cy={cy} rx={ry} ry={ry * 0.28} fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />;
          })}
          {/* longitude arcs */}
          {[0, 60, 120].map((deg, i) => (
            <ellipse key={i} cx={SIZE / 2} cy={SIZE / 2} rx={R * Math.abs(Math.cos((deg * Math.PI) / 180))} ry={R} fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
          ))}
        </svg>

        {/* Logo nodes */}
        {projected.map(({ sx, sy, scale, sponsor }) => {
          const logoSize = Math.max(52, 110 * scale);
          const opacity = Math.max(0.25, scale);
          return (
            <div
              key={sponsor.id}
              className="absolute flex items-center justify-center rounded-full bg-white/90 shadow-md"
              style={{
                width: logoSize,
                height: logoSize,
                left: SIZE / 2 + sx - logoSize / 2,
                top: SIZE / 2 + sy - logoSize / 2,
                opacity,
                zIndex: Math.round(scale * 100),
              }}
            >
              {sponsor.logoUrl ? (
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  loading="lazy"
                  draggable={false}
                  className="h-[80%] w-[80%] object-contain"
                />
              ) : (
                <span className="text-center text-[8px] font-bold text-black leading-tight px-1">
                  {sponsor.name}
                </span>
              )}
            </div>
          );
        })}

        {/* Drag hint */}
        <p className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 mono text-[9px] uppercase tracking-widest text-[#A8A8A8]/50">
          drag to rotate
        </p>
      </div>
    </div>
  );
}
