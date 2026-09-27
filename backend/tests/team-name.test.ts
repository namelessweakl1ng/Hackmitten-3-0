import { describe, expect, it } from "bun:test";
import { normalizeTeamName } from "../src/lib/team-name";

describe("normalizeTeamName", () => {
  it("trims and lowercases names", () => {
    expect(normalizeTeamName("  My Team  ")).toBe("my team");
    expect(normalizeTeamName("MY TEAM")).toBe("my team");
  });

  it("collapses consecutive whitespace", () => {
    expect(normalizeTeamName("My   Team")).toBe("my team");
  });

  it("preserves meaningful punctuation and characters", () => {
    expect(normalizeTeamName("Alpha-Team")).not.toBe(normalizeTeamName("alpha team"));
    expect(normalizeTeamName("Alpha2")).not.toBe(normalizeTeamName("alpha"));
  });

  it("returns an empty value for whitespace-only names", () => {
    expect(normalizeTeamName("   \t ")).toBe("");
  });
});