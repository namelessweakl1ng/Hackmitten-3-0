"use client";

import Link from "next/link";
import { useEventState } from "@/components/auth/use-event-state";

export function CTA() {
  const eventState = useEventState();
  const regOpen = eventState.data?.registrationOpen ?? true;

  return (
    <section className="relative py-24 md:py-48">
      <div className="mx-auto max-w-7xl px-4 md:px-10 text-center">
        <div className="mono text-xs uppercase tracking-[0.3em] text-[#B52A32] mb-6">
          / Final Call
        </div>
        <h2 className="display text-4xl sm:text-6xl md:text-9xl font-bold tracking-tight text-white leading-[0.9]">
          JOIN THE
          <br />
          <span className="text-[#A8A8A8]">MISSION.</span>
        </h2>

        {regOpen ? (
          <>
            <p className="mx-auto mt-8 max-w-md text-base md:text-lg text-[#A8A8A8]">
              Assemble your team.
              <br />
              Build something worth remembering.
            </p>
            <Link
              href="/register"
              className="group mt-12 inline-flex items-center gap-3 rounded-full bg-[#B52A32] px-8 md:px-10 py-4 text-sm md:text-base font-semibold tracking-wide text-white transition-all hover:bg-[#D83A43] hover:shadow-[0_0_60px_-10px_rgba(216,58,67,0.9)] min-h-[44px]"
            >
              REGISTER NOW
              <span className="text-lg transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </>
        ) : (
          <p className="mx-auto mt-8 max-w-md text-base md:text-lg text-[#A8A8A8]">
            Registration is now closed.
            <br />
            See you at the event horizon.
          </p>
        )}
      </div>
    </section>
  );
}
