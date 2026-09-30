"use client";

import { useEffect, useRef, useState } from "react";
import { resolveSponsors } from "@/data/sponsors";

type Sponsor = ReturnType<typeof resolveSponsors>[number];

export function Sponsors() {
  const sponsors = resolveSponsors();

  if (sponsors.length === 0) return null;

  const sponsorLogos = sponsors.filter((s) => s.tier !== "CUSTOM");
  const departmentLogos = sponsors.filter((s) => s.tier === "CUSTOM");

  const getDepartmentLogo = (department: Sponsor) => {
    if (department.logoUrl) return department.logoUrl;
    const name = department.name.toLowerCase();
    if (name.includes("cse")) return "/images/sponsors/cse.png";
    if (name.includes("ai") || name.includes("ml")) return "/images/sponsors/aiml.png";
    return "";
  };

  return (
    <section id="sponsors" className="relative border-t border-white/5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-10">

        <div className="mb-10 text-center md:mb-16">
          <div className="mono mb-4 text-xs uppercase tracking-[0.3em] text-[#B52A32]">/ Partners</div>
          <h2 className="display text-3xl font-bold leading-[0.95] tracking-tight text-white sm:text-5xl md:text-7xl">
            BACKED BY<br /><span className="text-[#A8A8A8]">THE BEST.</span>
          </h2>
        </div>

        {sponsorLogos.length > 0 && (
          <div className="mb-16 md:mb-24">
            <div className="mb-8 flex items-center gap-4">
              <span className="mono whitespace-nowrap text-[10px] uppercase tracking-widest text-[#A8A8A8]">SPONSORS</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <SponsorGlobe sponsors={sponsorLogos} />
          </div>
        )}

        {departmentLogos.length > 0 && (
          <div>
            <div className="mb-8 flex items-center gap-4">
              <span className="mono whitespace-nowrap text-[10px] uppercase tracking-widest text-[#A8A8A8]">DEPARTMENTS</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="flex items-start justify-center gap-12 md:gap-24">
              {departmentLogos.map((department) => {
                const logo = getDepartmentLogo(department);
                return (
                  <div key={department.id} className="flex w-32 flex-col items-center md:w-40">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-lg md:h-36 md:w-36">
                      {logo ? (
                        <img src={logo} alt={`${department.name} logo`} loading="lazy" className="h-full w-full rounded-full object-contain" />
                      ) : (
                        <span className="text-center text-sm font-bold text-black">{department.name}</span>
                      )}
                    </div>
                    <span className="mono mt-4 text-center text-xs uppercase tracking-widest text-[#A8A8A8]">{department.name}</span>
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
   SPONSOR GLOBE
================================================================ */

function SponsorGlobe({ sponsors }: { sponsors: Sponsor[] }) {
  const n = sponsors.length;
  const R = Math.min(320, Math.max(200, n * 34));
  const LOGO_MAX = Math.min(130, Math.max(80, Math.floor(R * 0.52)));
  const SIZE = R * 2 + LOGO_MAX * 2;

  const rafRef = useRef<number>(0);
  const yawRef = useRef(0);
  const velRef = useRef(0.18);
  const dragRef = useRef({ active: false, lastX: 0, prevX: 0, prevT: 0 });
  const pitch = 0.42;

  const [mounted, setMounted] = useState(false);
  const [, tick] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = sponsors.map((_, i) => ({
    phi: Math.acos(1 - (2 * (i + 0.5)) / n),
    theta: Math.PI * (1 + Math.sqrt(5)) * i,
  }));

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!dragRef.current.active) {
        velRef.current *= 0.97;
        if (Math.abs(velRef.current) < 0.02) velRef.current = 0.18;
        yawRef.current += velRef.current * dt;
      }
      tick((v) => v + 1);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mounted]);

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { active: true, lastX: e.clientX, prevX: e.clientX, prevT: performance.now() };
    velRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dt = (performance.now() - dragRef.current.prevT) / 1000 || 0.016;
    velRef.current = (dx / dt) * 0.003;
    yawRef.current += dx * 0.005;
    dragRef.current.prevX = dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    dragRef.current.prevT = performance.now();
  }
  function onPointerUp() { dragRef.current.active = false; }

  function project(phi: number, theta: number) {
    const x0 = R * Math.sin(phi) * Math.cos(theta);
    const y0 = R * Math.cos(phi);
    const z0 = R * Math.sin(phi) * Math.sin(theta);
    const x1 = x0 * Math.cos(yawRef.current) + z0 * Math.sin(yawRef.current);
    const z1 = -x0 * Math.sin(yawRef.current) + z0 * Math.cos(yawRef.current);
    const y2 = y0 * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y0 * Math.sin(pitch) + z1 * Math.cos(pitch);
    const raw = (z2 + R * 1.6) / (R * 2.6);
    const scale = Math.pow(Math.max(0, raw), 0.45);
    return { sx: x1, sy: y2, scale, z: z2 };
  }

  if (!mounted) {
    return (
      <div className="flex justify-center py-8">
        <div
          className="rounded-full border border-white/10"
          style={{
            width: SIZE,
            height: SIZE,
            maxWidth: "min(100vw - 2rem, 640px)",
            background: "radial-gradient(circle at 50% 45%, rgba(181,42,50,0.08) 0%, transparent 70%)",
          }}
        />
      </div>
    );
  }

  const projected = positions
    .map(({ phi, theta }, i) => ({ ...project(phi, theta), sponsor: sponsors[i] }))
    .sort((a, b) => a.z - b.z);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative cursor-grab select-none active:cursor-grabbing"
        style={{ width: SIZE, height: SIZE, maxWidth: "min(100vw - 2rem, 640px)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg className="pointer-events-none absolute inset-0" width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <radialGradient id="gg" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#B52A32" stopOpacity="0.12" />
              <stop offset="60%" stopColor="#B52A32" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="shine" cx="38%" cy="32%" r="45%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R + 18} fill="none" stroke="#6b7280" strokeOpacity="0.12" strokeWidth="18" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#gg)" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#shine)" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#9ca3af" strokeOpacity="0.5" strokeWidth="2.5" />
          {[-0.65, -0.35, 0, 0.35, 0.65].map((t, i) => {
            const rx2 = R * Math.sqrt(1 - t * t);
            return <ellipse key={i} cx={SIZE / 2} cy={SIZE / 2 + R * t} rx={rx2} ry={rx2 * 0.28} fill="none" stroke="#9ca3af" strokeOpacity="0.22" strokeWidth="1.2" />;
          })}
          {[0, 45, 90, 135].map((deg, i) => (
            <ellipse key={i} cx={SIZE / 2} cy={SIZE / 2}
              rx={Math.max(1, R * Math.abs(Math.cos(deg * Math.PI / 180)))}
              ry={R} fill="none" stroke="#9ca3af" strokeOpacity="0.22" strokeWidth="1.2" />
          ))}
        </svg>

        {projected.map(({ sx, sy, scale, sponsor }) => {
          const s = Math.max(0.18, Math.min(1, scale));
          const logoSize = LOGO_MAX * s;
          const isFront = s > 0.7;
          const isHov = hovered === sponsor.id;
          return (
            <div
              key={sponsor.id}
              onMouseEnter={() => setHovered(sponsor.id)}
              onMouseLeave={() => setHovered(null)}
              className="absolute flex items-center justify-center rounded-full bg-white"
              style={{
                width: logoSize,
                height: logoSize,
                left: SIZE / 2 + sx - logoSize / 2,
                top: SIZE / 2 + sy - logoSize / 2,
                opacity: 0.15 + s * 0.85,
                zIndex: Math.round(s * 100),
                boxShadow: isFront
                  ? `0 0 ${isHov ? 32 : 18}px ${isHov ? 8 : 4}px rgba(181,42,50,${isHov ? 0.75 : 0.5}), 0 4px 20px rgba(0,0,0,0.6)`
                  : "0 2px 8px rgba(0,0,0,0.3)",
                transition: "box-shadow 0.2s",
              }}
            >
              {sponsor.logoUrl ? (
                <img src={sponsor.logoUrl} alt={sponsor.name} draggable={false} className="h-[78%] w-[78%] object-contain" />
              ) : (
                <span className="px-1 text-center text-[8px] font-bold leading-tight text-black">{sponsor.name}</span>
              )}
              {isHov && (
                <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white">
                  {sponsor.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mono text-[9px] uppercase tracking-widest text-[#A8A8A8]/40">drag to rotate</p>
    </div>
  );
}
