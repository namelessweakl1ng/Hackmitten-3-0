/**
 * Backend validation tests — run with: bun test tests/validators.test.ts
 *
 * Validates the zod registration schema and food check-in schema.
 */
import { describe, it, expect } from "bun:test";
import {
  normalizeRegistrationMembers,
  registrationSchema,
  paymentSubmissionSchema,
  foodCheckInSchema,
  rejectionSchema,
} from "../src/lib/validators";

function validMember(name: string, email: string, isLeader?: boolean) {
  return {
    fullName: name,
    email,
    phone: "9876543210",
    college: "Test College",
    degree: "Computer Science",
    ...(isLeader === undefined ? {} : { isLeader }),
  };
}

function validTeam() {
  return [
    validMember("Alice" , "alice@gmail.com"),
    validMember("Bob", "bob@gmail.com"),
    validMember("Carol", "carol@gmail.com"),
  ];
}

describe("registrationSchema", () => {
  it("accepts a valid 3-member team with one leader", () => {
    const res = registrationSchema.safeParse({
      teamName: "NOVA",
      members: [
        validMember("Alice", "alice@gmail.com", true),
        validMember("Bob", "bob@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(true);
  });

  it("accepts a valid 4-member team with one leader", () => {
    const res = registrationSchema.safeParse({
      teamName: "NOVA",
      members: [
        validMember("Alice", "alice@gmail.com", true),
        validMember("Bob", "bob@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
        validMember("Dan", "dan@gmail.com"),
      ],
    });
    expect(res.success).toBe(true);
  });

  it("rejects a 2-member team (minimum 3)", () => {
    const res = registrationSchema.safeParse({
      teamName: "TOOFEW",
      members: [
        validMember("Alice", "alice@gmail.com", true),
        validMember("Bob", "bob@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects a 5-member team (maximum 4)", () => {
    const res = registrationSchema.safeParse({
      teamName: "TOOMANY",
      members: [
        validMember("A", "a@gmail.com", true),
        validMember("B", "b@gmail.com"),
        validMember("C", "c@gmail.com"),
        validMember("D", "d@gmail.com"),
        validMember("E", "e@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const res = registrationSchema.safeParse({
      teamName: "BAD",
      members: [
        validMember("Alice", "not-an-email", true),
        validMember("Bob", "bob@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects duplicate emails within team", () => {
    const res = registrationSchema.safeParse({
      teamName: "DUP",
      members: [
        validMember("Alice", "same@gmail.com", true),
        validMember("Bob", "same@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects short phone", () => {
    const res = registrationSchema.safeParse({
      teamName: "BADPHONE",
      members: [
        { ...validMember("Alice", "alice@gmail.com", true), phone: "123" },
        validMember("Bob", "bob@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it.each([
    ["6", "6123456789"],
    ["7", "7123456789"],
    ["8", "8123456789"],
    ["9", "9123456789"],
  ])("accepts a 10-digit Indian mobile beginning with %s", (_prefix, phone) => {
    const res = registrationSchema.safeParse({
      teamName: "VALIDPHONE",
      members: [
        validMember("Alice", "alice@gmail.com", true),
        { ...validMember("Bob", "bob@gmail.com"), phone },
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(true);
  });

  it.each([
    ["0", "0123456789"],
    ["1-5", "5123456789"],
    ["9 digits", "987654321"],
    ["11 digits", "98765432101"],
    ["alphabetic characters", "abcdefghij"],
    ["mixed characters", "98765abcde"],
  ])("rejects invalid phone: %s", (_case, phone) => {
    const res = registrationSchema.safeParse({
      teamName: "INVALIDPHONE",
      members: [
        validMember("Alice", "alice@gmail.com", true),
        { ...validMember("Bob", "bob@gmail.com"), phone },
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects team name with invalid characters", () => {
    const res = registrationSchema.safeParse({
      teamName: "Bad@Team!",
      members: [
        validMember("Alice", "alice@gmail.com", true),
        validMember("Bob", "bob@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects empty member full name", () => {
    const res = registrationSchema.safeParse({
      teamName: "OK",
      members: [
        { ...validMember("", "alice@gmail.com", true) },
        validMember("Bob", "bob@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("ignores client-controlled leader flags", () => {
    const res = registrationSchema.safeParse({
      teamName: "NOLEADER",
      members: [
        validMember("Alice", "alice@gmail.com", false),
        validMember("Bob", "bob@gmail.com", true),
        validMember("Carol", "carol@gmail.com", true),
      ],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.members[0]).not.toHaveProperty("isLeader");
      expect(normalizeRegistrationMembers(res.data.members).map((m) => m.isLeader)).toEqual([true, false, false]);
    }
  });

  it("normalizes registration-created teams to one first-member leader", () => {
    const res = registrationSchema.safeParse({ teamName: "REGISTRATION", members: validTeam() });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(normalizeRegistrationMembers(res.data.members).map((m) => m.isLeader)).toEqual([true, false, false]);
    }
  });

  it("normalizes admin-created teams to one first-member leader", () => {
    const res = registrationSchema.safeParse({
      teamName: "ADMIN",
      members: validTeam().map((member, index) => ({ ...member, isLeader: index !== 0 })),
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(normalizeRegistrationMembers(res.data.members).map((m) => m.isLeader)).toEqual([true, false, false]);
    }
  });

  it("rejects team with missing college on any member", () => {
    const res = registrationSchema.safeParse({
      teamName: "NOCOLLEGE",
      members: [
        { ...validMember("Alice", "alice@gmail.com", true), college: "" },
        validMember("Bob", "bob@gmail.com"),
        validMember("Carol", "carol@gmail.com"),
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects a member without a degree", () => {
    const member = validMember("Alice", "alice@gmail.com");
    delete (member as Partial<typeof member>).degree;
    const res = registrationSchema.safeParse({
      teamName: "NODEGREE",
      members: [member, validMember("Bob", "bob@gmail.com"), validMember("Carol", "carol@gmail.com")],
    });
    expect(res.success).toBe(false);
  });
});

describe("paymentSubmissionSchema", () => {
  it("accepts valid transaction ID", () => {
    const res = paymentSubmissionSchema.safeParse({ transactionId: "TXN-ABCD-1234" });
    expect(res.success).toBe(true);
  });
  it("rejects too-short transaction ID", () => {
    const res = paymentSubmissionSchema.safeParse({ transactionId: "TX" });
    expect(res.success).toBe(false);
  });
  it("accepts transaction ID with spaces (UPI IDs can have various formats)", () => {
    const res = paymentSubmissionSchema.safeParse({ transactionId: "TXN with spaces" });
    expect(res.success).toBe(true);
  });
  it("rejects transaction ID that is too short", () => {
    const res = paymentSubmissionSchema.safeParse({ transactionId: "AB" });
    expect(res.success).toBe(false);
  });
});

describe("foodCheckInSchema", () => {
  it("accepts valid qrToken and mealId", () => {
    const res = foodCheckInSchema.safeParse({ qrToken: "a".repeat(48), mealId: "m1" });
    expect(res.success).toBe(true);
  });
  it("rejects short qrToken", () => {
    const res = foodCheckInSchema.safeParse({ qrToken: "abc", mealId: "m1" });
    expect(res.success).toBe(false);
  });
  it("rejects empty mealId", () => {
    const res = foodCheckInSchema.safeParse({ qrToken: "a".repeat(48), mealId: "" });
    expect(res.success).toBe(false);
  });
});

describe("rejectionSchema", () => {
  it("accepts a valid reason", () => {
    const res = rejectionSchema.safeParse({ reason: "Transaction not found" });
    expect(res.success).toBe(true);
  });
  it("rejects too-short reason", () => {
    const res = rejectionSchema.safeParse({ reason: "x" });
    expect(res.success).toBe(false);
  });
});
