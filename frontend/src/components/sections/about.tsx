"use client";

import { useEffect, useRef, useState } from "react";

export function About() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const heading = "BUILD. BREAK. REBUILD.";
  const parts = heading.split(/[. ]+/).filter(Boolean);
  // Split heading into 3 parts for color treatment
  const part1 = parts[0] ? parts[0] + "." : "BUILD.";
  const part2 = parts[1] ? parts[1] + "." : "BREAK.";
  const part3 = parts[2] ? parts[2] + "." : "REBUILD.";

  const STATS = [
    { value: "24", label: "HOURS", suffix: "" },
    { value: "3—4", label: "MEMBERS", suffix: "" },
    { value: "₹1,000", label: "REGISTRATION", suffix: "" },
    { value: "₹1,00,000", label: "PRIZE POOL", suffix: "" },
  ];

  return (
    <section
      ref={ref}
      id="about"
      className="relative section-pad mx-auto max-w-7xl"
    >
      <div className="grid gap-10 md:gap-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="mono text-xs uppercase tracking-[0.3em] text-[#B52A32] mb-6">
            / About
          </div>
          <h2 className="display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[0.92]">
            {part1}
            <br />
            <span className="text-[#A8A8A8]">{part2}</span>
            <br />
            <span className="text-[#B52A32]">{part3}</span>
          </h2>
        </div>

        <div className="md:col-span-7 md:pl-8 flex flex-col justify-end">
          <p className="text-base md:text-xl text-white/80 leading-relaxed">
            Hackmitten is a 24-hour descent into the unknown, where ideas cross the event horizon and emerge as something built, broken, and rebuilt into existence.
          </p>
          <p className="mt-4 text-sm md:text-base text-[#A8A8A8] leading-relaxed">
            Focused on industry problem statements, the hackathon brings together innovators and developers to collaborate, build practical solutions, and solve real-world challenges through technology and innovation.
          </p>

          <div className="mt-8 md:mt-12 grid grid-cols-2 gap-px bg-white/5 border border-white/5">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-[#080808] p-5 md:p-8 transition-all duration-700 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="display text-3xl md:text-6xl font-bold text-white leading-none">
                  {stat.value}
                  {stat.suffix && <span className="text-[#A8A8A8]">{stat.suffix}</span>}
                </div>
                <div className="mt-2 md:mt-3 mono text-[10px] uppercase tracking-[0.25em] text-[#A8A8A8]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-[#A8A8A8]">
            <span className="mono uppercase tracking-widest">Venue · </span>
            <span className="text-white">MAHARAJA INSTITUTE OF TECHNOLOGY THANDAVAPURA</span>
          </div>
        </div>
      </div>
    </section>
  );
}
