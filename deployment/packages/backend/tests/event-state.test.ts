/**
 * Event state system tests — verifies the single source of truth for event lifecycle.
 *
 * Run: bun test tests/event-state.test.ts
 */
import { describe, it, expect } from "bun:test";
import { computeEventState } from "../src/lib/event-state";
import { composeIso } from "../src/lib/timezone";

describe("computeEventState", () => {
  const baseConfig = {
    eventStartDate: "2026-10-29",
    eventStartTime: "11:00",
    eventTimezone: "Asia/Kolkata",
    eventDurationHours: 24,
  
    // Registration closes exactly 7 days before the hackathon starts
    registrationDeadline: "2026-10-22T05:30:00.000Z",
  
    registrationOpens: null,
  };

  it("returns REGISTRATION_OPEN when now is before deadline and before event start", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const state = computeEventState(baseConfig, now);
    expect(state.state).toBe("REGISTRATION_OPEN");
    expect(state.registrationOpen).toBe(true);
  });

  it("returns REGISTRATION_CLOSED when now is after deadline but before event start", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const state = computeEventState(baseConfig, now);
    expect(state.state).toBe("REGISTRATION_CLOSED");
    expect(state.registrationOpen).toBe(false);
    expect(state.registrationMessage).toContain("closed");
  });

  it("returns LIVE when now is between event start and end", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const state = computeEventState(baseConfig, now);
    expect(state.state).toBe("LIVE");
    expect(state.registrationOpen).toBe(false);
  });

  it("returns ENDED when now is after event end", () => {
    const now = new Date("2026-10-30T06:00:00Z");
    const state = computeEventState(baseConfig, now);
    expect(state.state).toBe("ENDED");
    expect(state.registrationOpen).toBe(false);
  });

  it("returns UPCOMING when registration opens is in the future", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    const state = computeEventState({
      ...baseConfig,
      registrationOpens: "2026-10-03T00:00:00Z",
      registrationDeadline: "2026-10-22T05:30:00.000Z",
    }, now);
    expect(state.state).toBe("UPCOMING");
    expect(state.registrationOpen).toBe(false);
  });

  it("returns UPCOMING with no event dates set (empty config)", () => {
    const state = computeEventState({}, new Date());
    expect(state.state).toBe("REGISTRATION_OPEN"); // no deadline = open
    expect(state.registrationOpen).toBe(true);
    expect(state.durationHours).toBe(24);
    expect(state.timezone).toBe("Asia/Kolkata");
  });

  it("uses default 24h duration when not specified", () => {
    const state = computeEventState({
      eventStartDate: "2099-01-15",
      eventStartTime: "09:00",
      // no eventEndDate → should auto-calculate from duration
    }, new Date("2026-10-05T00:00:00Z"));
    expect(state.eventEndIso).not.toBeNull();
    expect(state.durationHours).toBe(24);
  });

  it("converts Asia/Kolkata wall-clock time to the correct UTC instant", () => {
    const state = computeEventState(baseConfig);

    expect(state.eventStartIso).toBe("2026-10-29T05:30:00.000Z");
    expect(state.eventEndIso).toBe("2026-10-30T05:30:00.000Z");
  });

  it("keeps the registration deadline independently configurable", () => {
    const state = computeEventState(baseConfig);

    expect(state.registrationDeadlineIso).toBe(
      "2026-10-22T05:30:00.000Z",
    );
  });

  it("handles timezone field correctly", () => {
    const state = computeEventState({
      ...baseConfig,
      eventTimezone: "America/New_York",
    });

    expect(state.timezone).toBe("America/New_York");
  });


  it("converts phase wall-clock times using the configured timezone", () => {
    expect(
      composeIso("2026-10-29", "11:00", "Asia/Kolkata"),
    ).toBe("2026-10-29T05:30:00.000Z");
  });

  it("handles a timezone transition when converting wall-clock time", () => {
    expect(
      composeIso("2026-07-15", "11:00", "America/New_York"),
    ).toBe("2026-07-15T15:00:00.000Z");
  });
});
