"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";

/**
 * Centralized scroll progress provider.
 * Drives Lenis smooth scroll + exposes a ref (0..1) of total page scroll progress
 * that the 3D scene and section animations consume.
 *
 * Also exposes scrollProgress as React state for non-3D consumers.
 */
export function useScrollProgress() {
  const scrollProgress = useRef(0);
  const [progress, setProgress] = useState(0);
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Respect reduced motion
      autoRaf: false,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const cur = window.scrollY;
      const p = total > 0 ? Math.min(1, Math.max(0, cur / total)) : 0;
      scrollProgress.current = p;
      setProgress(p);
      setVelocity(lenis.velocity);
    };
    lenis.on("scroll", update);
    update();

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return { scrollProgress, progress, velocity };
}
