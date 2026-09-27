"use client";

import { useQuery } from "@tanstack/react-query";

export type EventState =
  | "UPCOMING"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "LIVE"
  | "ENDED";

export interface EventStateInfo {
  state: EventState;
  eventStartIso: string | null;
  eventEndIso: string | null;
  registrationDeadlineIso: string | null;
  registrationOpensIso: string | null;
  durationHours: number;
  timezone: string;
  registrationOpen: boolean;
  registrationMessage: string;
  registrationsOpen: boolean;
  registrationCapacity: number;
  currentCount: number;
  registrationAvailable: boolean;
}

/**
 * React hook that fetches the current event state from /api/event-state.
 * Use this in any client component that needs to know whether registration is open,
 * the event is live, etc. Single source of truth — same logic as the server.
 */
export function useEventState() {
  return useQuery<EventStateInfo>({
    queryKey: ["event-state"],
    queryFn: async () => (await fetch("/api/event-state")).json(),
    staleTime: 60_000, // refresh every minute
    refetchInterval: 60_000,
  });
}
