"use client";

import dynamic from "next/dynamic";
import { useScrollProgress } from "@/components/three/use-scroll-progress";
import { PublicNav } from "@/components/public/nav";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Gallery } from "@/components/sections/gallery";
import { Coordinators } from "@/components/sections/coordinators";
import { Sponsors } from "@/components/sections/sponsors";
import { Venue } from "@/components/sections/venue";
import { CTA } from "@/components/sections/cta";
import { Footer } from "@/components/sections/footer";
import { Reveal } from "@/components/ui/reveal";

// Black hole 3D scene — loaded client-side only, with SSR disabled
const SpaceScene = dynamic(
  () => import("@/components/three/space-scene"),
  { ssr: false, loading: () => null },
);

export default function HomePage() {
  const { scrollProgress } = useScrollProgress();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030303] text-white">
      {/* Cinematic 3D background — fixed, behind all content */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SpaceScene scrollProgress={scrollProgress} />
      </div>

      {/* Subtle vignette overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(3,3,3,0.7) 100%)",
        }}
      />

      <div className="relative z-10">
        <PublicNav />
        <main>
          <Hero />
          <Reveal><About /></Reveal>
          <Reveal delay={80}><Gallery /></Reveal>
          <Reveal delay={100}><Coordinators /></Reveal>
          <Reveal delay={80}><Sponsors /></Reveal>
          <Reveal delay={60}><Venue /></Reveal>
          <Reveal delay={100}><CTA /></Reveal>
        </main>
        <Footer />
      </div>
    </div>
  );
}
