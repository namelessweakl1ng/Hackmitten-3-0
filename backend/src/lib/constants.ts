/**
 * Hackmitten 3.0 — shared ID prefixes & secure token generators.
 *
 * Event display copy (name, edition, fee, venue, date, etc.) is NOT hard-coded
 * here — it lives in the `EventConfig` singleton and is editable via /admin/settings.
 */

export const REGISTRATION_ID_PREFIX = "HM3";
export const PARTICIPANT_ID_PREFIX = "HM3-P";

/** Generate a strong random password (32+ chars, alphanumeric + safe symbols). */
export function generateStrongPassword(length = 36): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+?";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // Ensure at least one of each class
  const chars = [upper, lower, digits, symbols].map((set) => {
    const b = new Uint8Array(1);
    crypto.getRandomValues(b);
    return set[b[0] % set.length];
  });
  for (let i = chars.length; i < length; i++) {
    chars.push(all[bytes[i] % all.length]);
  }
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Generate a strong random BERSERK recovery secret (48 chars). */
export function generateBerserkSecret(length = 48): string {
  const all = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => all[b % all.length]).join("");
}

/** Generate a non-guessable opaque token for QR codes. */
export function generateQrToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sequential-style registration ID with leading zeros, padded. */
export function generateRegistrationId(seq: number): string {
  return `${REGISTRATION_ID_PREFIX}-${String(seq).padStart(5, "0")}`;
}

export function generateParticipantId(regSeq: number, memberSeq: number): string {
  return `${PARTICIPANT_ID_PREFIX}-${String(regSeq).padStart(5, "0")}-${String(memberSeq).padStart(2, "0")}`;
}

/** Allocate above every surviving public registration ID; 480 is the historical floor. */
export function nextRegistrationSequence(registrationIds: Array<string | null>): number {
  const last = registrationIds.reduce((max, id) => {
    const match = id?.match(/^HM3-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 480);
  return last + 1;
}
