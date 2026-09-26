"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveGalleryItems } from "@/data/gallery";

type GalleryItem = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  year: string;
};

export function Gallery() {
  const items: GalleryItem[] = resolveGalleryItems();

  const [currAngle, setCurrAngle] = useState(0);
  const [vw, setVw] = useState(375);
  const pausedRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const measure = () => setVw(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const isMobile = vw < 640;
  const cardW = isMobile ? Math.min(vw * 0.55, 180) : 280;
  const cardH = isMobile ? Math.round(cardW * 0.68) : 185;
  const radius = isMobile ? Math.min(vw * 0.75, 320) : 380;
  const stageH = isMobile ? cardH + 80 : 300;

  const angleStep = items.length > 0 ? 360 / items.length : 60;

  const safeActiveIdx = items.length > 0
    ? (Math.round(-currAngle / angleStep) % items.length + items.length) % items.length
    : 0;

  const goNext = useCallback(() => {
    pausedRef.current = true;
    setCurrAngle((a) => a - angleStep);
    window.setTimeout(() => { pausedRef.current = false; }, 2400);
  }, [angleStep]);

  const goPrev = useCallback(() => {
    pausedRef.current = true;
    setCurrAngle((a) => a + angleStep);
    window.setTimeout(() => { pausedRef.current = false; }, 2400);
  }, [angleStep]);

  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!pausedRef.current) setCurrAngle((a) => a - angleStep);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [items.length, angleStep]);

  const onTouchStart = (e: React.TouchEvent) => {
    pausedRef.current = true;
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    window.setTimeout(() => { pausedRef.current = false; }, 2400);
  };

  return (
    <section id="gallery" className="relative py-12 md:py-24">

      {/* ── Header ── */}
      <div className="mx-auto max-w-7xl px-4 md:px-10 mb-4 md:mb-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mono text-xs uppercase tracking-[0.3em] text-[#B52A32] mb-4">
              / Gallery
            </div>
            <h2 className="display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[0.95]">
              PREVIOUS
              <br />
              <span className="text-[#A8A8A8]">MISSIONS.</span>
            </h2>
          </div>
          {items.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                aria-label="Previous image"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white hover:border-[#B52A32] hover:bg-white/5 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goNext}
                aria-label="Next image"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white hover:border-[#B52A32] hover:bg-white/5 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mx-auto max-w-7xl px-4 md:px-10 py-20 text-center text-[#A8A8A8]">
          No gallery items yet.
        </div>
      ) : (
        <>
          {/* ── 3D Carousel ── */}
          <div
            className="relative select-none"
            style={{ height: stageH, perspective: 1000 }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
          >
            {/* centring anchor */}
            <div style={{
              position: "absolute",
              left: "50%", top: "50%",
              width: 0, height: 0,
              transformStyle: "preserve-3d",
            }}>
              {/* spinning ring */}
              <div style={{
                position: "absolute",
                transformStyle: "preserve-3d",
                transition: "transform 1s cubic-bezier(0.19, 1, 0.22, 1)",
                transform: `rotateY(${currAngle}deg)`,
              }}>
                {items.map((item, index) => {
                  const angle = angleStep * index;
                  const isActive = index === safeActiveIdx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        pausedRef.current = true;
                        setCurrAngle(-angle);
                        window.setTimeout(() => { pausedRef.current = false; }, 2400);
                      }}
                      style={{
                        position: "absolute",
                        width: cardW,
                        height: cardH,
                        left: -cardW / 2,
                        top: -cardH / 2,
                        borderRadius: 10,
                        overflow: "hidden",
                        cursor: "pointer",
                        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                        background: "#0e0e0e",
                        border: isActive
                          ? "1px solid rgba(181,42,50,0.65)"
                          : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: isActive
                          ? "0 0 28px 4px rgba(181,42,50,0.22)"
                          : "0 8px 32px rgba(0,0,0,0.55)",
                        transition: "border 0.6s ease, box-shadow 0.6s ease",
                      }}
                    >
                      {/* image fills card */}
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        draggable={false}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          filter: isActive
                            ? "grayscale(0.18) sepia(0.12) saturate(0.85) contrast(1.1) brightness(0.88)"
                            : "grayscale(0.5) sepia(0.1) saturate(0.6) contrast(1.0) brightness(0.65)",
                          transition: "filter 0.7s ease",
                        }}
                      />

                      {/* bottom gradient — same as coordinator/winner cards */}
                      <div style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        background: "linear-gradient(to top, rgba(3,3,3,0.82) 0%, rgba(3,3,3,0.18) 55%, transparent 100%)",
                      }} />

                      {/* red tint top-left */}
                      <div style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        background: "linear-gradient(135deg, rgba(139,30,36,0.14) 0%, transparent 60%)",
                      }} />

                      {/* year badge */}
                      {item.year && (
                        <div style={{
                          position: "absolute", top: 10, left: 10,
                          fontFamily: "monospace", fontSize: 9,
                          letterSpacing: "0.2em", textTransform: "uppercase",
                          padding: "3px 8px", borderRadius: 4,
                          backdropFilter: "blur(6px)",
                          background: isActive ? "#B52A32" : "rgba(0,0,0,0.55)",
                          color: isActive ? "#fff" : "#B52A32",
                          border: isActive ? "none" : "1px solid rgba(181,42,50,0.35)",
                          transition: "all 0.5s ease",
                        }}>
                          {item.year}
                        </div>
                      )}

                      {/* active glow ring inset */}
                      {isActive && (
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: 10,
                          pointerEvents: "none",
                          boxShadow: "inset 0 0 0 1px rgba(181,42,50,0.7)",
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Caption ── */}
          <div className="mx-auto max-w-7xl px-4 md:px-10 mt-6 min-h-[44px]">
            {items[safeActiveIdx] && (
              <div className="transition-opacity duration-300">
                <div className="mono text-[10px] uppercase tracking-[0.25em] text-[#B52A32]">
                  {items[safeActiveIdx].year}
                </div>
                <div className="display mt-0.5 text-base md:text-lg font-semibold text-white">
                  {items[safeActiveIdx].title}
                </div>
                {items[safeActiveIdx].caption && (
                  <div className="mt-0.5 text-xs md:text-sm text-[#A8A8A8]">
                    {items[safeActiveIdx].caption}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Progress indicator ── */}
          {items.length > 1 && (
            <div className="mx-auto max-w-7xl px-4 md:px-10 mt-3 flex items-center gap-3">
              <span className="mono text-xs text-[#A8A8A8]">
                {String(safeActiveIdx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 h-px bg-white/10 relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[#B52A32] transition-all duration-500"
                  style={{ width: `${((safeActiveIdx + 1) / items.length) * 100}%` }}
                />
              </div>
              <span className="mono text-xs text-[#A8A8A8]">
                {String(items.length).padStart(2, "0")}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
