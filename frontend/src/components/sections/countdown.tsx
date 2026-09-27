"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type EventStateResponse = {
  state:
    | "UPCOMING"
    | "REGISTRATION_OPEN"
    | "REGISTRATION_CLOSED"
    | "LIVE"
    | "ENDED";
  eventStartIso: string | null;
  eventEndIso: string | null;
  durationHours: number;
  timezone: string;
};

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getRemaining(targetIso: string | null, now: number): Remaining | null {
  if (!targetIso) return null;

  const diff = new Date(targetIso).getTime() - now;

  if (!Number.isFinite(diff) || diff <= 0) {
    return null;
  }

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function Countdown() {
  const { data, isLoading, isError } = useQuery<EventStateResponse>({
    queryKey: ["event-state"],
    queryFn: async () => {
      const response = await fetch("/api/event-state", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load event state");
      }

      return response.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // One clock tick per second. The displayed countdown is derived from it.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="mt-8 mono text-xs uppercase tracking-[0.25em] text-[#A8A8A8]">
        Loading mission clock...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mt-8 mono text-xs uppercase tracking-[0.25em] text-[#A8A8A8]">
        Mission clock unavailable
      </div>
    );
  }

  if (data.state === "LIVE") {
    const remaining = getRemaining(data.eventEndIso, now);

    return (
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D83A43] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#B52A32]" />
          </span>

          <span className="display text-base md:text-xl font-bold text-white">
            HACKATHON LIVE
          </span>
        </div>

        {remaining && (
          <span className="mono text-xs text-[#A8A8A8]">
            {String(
              remaining.hours + remaining.days * 24,
            ).padStart(2, "0")}
            :
            {String(remaining.minutes).padStart(2, "0")}:
            {String(remaining.seconds).padStart(2, "0")} REMAINING
          </span>
        )}
      </div>
    );
  }

  if (data.state === "ENDED") {
    return (
      <div className="mt-8 display text-base md:text-xl font-bold text-[#A8A8A8]">
        THE MISSION IS COMPLETE.
      </div>
    );
  }

  if (!data.eventStartIso) {
    return (
      <div className="mt-8 mono text-xs uppercase tracking-[0.25em] text-[#A8A8A8]">
        EVENT DATE TBA
      </div>
    );
  }

  const remaining = getRemaining(data.eventStartIso, now);

  const units = [
    { label: "DAYS", value: remaining?.days ?? 0 },
    { label: "HOURS", value: remaining?.hours ?? 0 },
    { label: "MINUTES", value: remaining?.minutes ?? 0 },
    { label: "SECONDS", value: remaining?.seconds ?? 0 },
  ];

  return (
    <div className="mt-8 flex items-center justify-center gap-2 md:gap-4">
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-center gap-2 md:gap-4">
          <div className="flex flex-col items-center">
            <div className="display min-w-[2.5ch] text-center text-3xl font-bold tabular-nums text-white md:min-w-[3ch] md:text-5xl">
              {String(unit.value).padStart(2, "0")}
            </div>

            <div className="mono mt-1 text-[9px] uppercase tracking-widest text-[#A8A8A8] md:text-[10px]">
              {unit.label}
            </div>
          </div>

          {index < units.length - 1 && (
            <span className="display -mt-4 text-2xl text-[#B52A32] md:text-4xl">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
