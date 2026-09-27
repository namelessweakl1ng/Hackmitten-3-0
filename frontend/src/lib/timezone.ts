/**
 * Convert a local wall-clock date/time in an IANA timezone into a UTC ISO string.
 *
 * Example:
 *   2026-10-29 11:00 Asia/Kolkata
 *   -> 2026-10-29T05:30:00.000Z
 *
 * Uses Intl instead of adding a timezone dependency.
 */
export function composeIso(
  date?: string | null,
  time?: string | null,
  timezone: string = "Asia/Kolkata",
): string | null {
  if (!date) return null;

  const t = time && time.length >= 5 ? time : "00:00";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = t.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const targetUtcMs = Date.UTC(year, month - 1, day, hour, minute);

  const getTimeZoneOffsetMs = (utcMs: number): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utcMs));

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );

    const displayedUtcMs = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );

    return displayedUtcMs - utcMs;
  };

  const firstOffset = getTimeZoneOffsetMs(targetUtcMs);
  let utcMs = targetUtcMs - firstOffset;

  const secondOffset = getTimeZoneOffsetMs(utcMs);
  utcMs = targetUtcMs - secondOffset;

  return new Date(utcMs).toISOString();
}
