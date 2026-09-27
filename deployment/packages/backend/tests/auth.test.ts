import { describe, expect, it } from "bun:test";
import bcrypt from "bcryptjs";

import {
  findUserByLoginIdentifier,
  normalizeLoginIdentifier,
  roleMatchesSelectedRole,
  verifyPasswordAndRole,
} from "@/lib/auth";

describe("role mapping", () => {
  it("maps ADMIN to SUPER_ADMIN", () => {
    expect(roleMatchesSelectedRole("ADMIN", "SUPER_ADMIN")).toBe(true);
  });

  it("maps COORDINATOR to COORDINATOR", () => {
    expect(roleMatchesSelectedRole("COORDINATOR", "COORDINATOR")).toBe(true);
  });

  it("maps FOOD to FOOD_ADMIN", () => {
    expect(roleMatchesSelectedRole("FOOD", "FOOD_ADMIN")).toBe(true);
  });
});

describe("password verification", () => {
  const passwordHashPromise = bcrypt.hash("correct-password", 12);

  it("accepts a valid matching password", async () => {
    const passwordHash = await passwordHashPromise;
    const ok = await verifyPasswordAndRole({
      identifier: "superadmin",
      password: "correct-password",
      selectedRole: "ADMIN",
      user: {
        id: "u1",
        username: "superadmin",
        email: "superadmin@example.com",
        role: "SUPER_ADMIN",
        passwordHash,
      },
    });

    expect(ok).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await passwordHashPromise;
    const ok = await verifyPasswordAndRole({
      identifier: "superadmin",
      password: "wrong-password",
      selectedRole: "ADMIN",
      user: {
        id: "u1",
        username: "superadmin",
        email: "superadmin@example.com",
        role: "SUPER_ADMIN",
        passwordHash,
      },
    });

    expect(ok).toBe(false);
  });

  it("rejects a user that is not present in the database", async () => {
    const ok = await verifyPasswordAndRole({
      identifier: "missing-user",
      password: "whatever",
      selectedRole: "ADMIN",
      user: null,
    });

    expect(ok).toBe(false);
  });

  it("rejects a mismatched role even when the password is correct", async () => {
    const passwordHash = await passwordHashPromise;
    const ok = await verifyPasswordAndRole({
      identifier: "coordinator",
      password: "correct-password",
      selectedRole: "ADMIN",
      user: {
        id: "u2",
        username: "coordinator",
        email: "coordinator@example.com",
        role: "COORDINATOR",
        passwordHash,
      },
    });

    expect(ok).toBe(false);
  });

  it("accepts a correct coordinator password", async () => {
    const passwordHash = await bcrypt.hash("coordinator-password", 4);
    await expect(verifyPasswordAndRole({
      identifier: " coordinator ",
      password: "coordinator-password",
      selectedRole: "COORDINATOR",
      user: { id: "u4", username: "coordinator", email: "coordinator@example.com", role: "COORDINATOR", passwordHash },
    })).resolves.toBe(true);
  });

  it("rejects an incorrect coordinator password", async () => {
    const passwordHash = await bcrypt.hash("coordinator-password", 4);
    await expect(verifyPasswordAndRole({
      identifier: "coordinator",
      password: "wrong-password",
      selectedRole: "COORDINATOR",
      user: { id: "u4", username: "coordinator", email: "coordinator@example.com", role: "COORDINATOR", passwordHash },
    })).resolves.toBe(false);
  });

  it("accepts a correct food-admin password", async () => {
    const passwordHash = await bcrypt.hash("food-password", 4);
    await expect(verifyPasswordAndRole({
      identifier: "food-admin",
      password: "food-password",
      selectedRole: "FOOD",
      user: { id: "u5", username: "food-admin", email: "food@example.com", role: "FOOD_ADMIN", passwordHash },
    })).resolves.toBe(true);
  });

  it("rejects an incorrect food-admin password", async () => {
    const passwordHash = await bcrypt.hash("food-password", 4);
    await expect(verifyPasswordAndRole({
      identifier: "food-admin",
      password: "wrong-password",
      selectedRole: "FOOD",
      user: { id: "u5", username: "food-admin", email: "food@example.com", role: "FOOD_ADMIN", passwordHash },
    })).resolves.toBe(false);
  });

  it("rejects cross-role login selections", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    const user = { id: "u6", username: "coordinator", email: "coordinator@example.com", role: "COORDINATOR" as const, passwordHash };
    await expect(verifyPasswordAndRole({ identifier: "coordinator", password: "correct-password", selectedRole: "FOOD", user })).resolves.toBe(false);
    await expect(verifyPasswordAndRole({ identifier: "coordinator", password: "correct-password", selectedRole: "ADMIN", user })).resolves.toBe(false);
  });

  it("never trusts environment credentials alone without password verification", async () => {
    const passwordHash = await passwordHashPromise;
    const ok = await verifyPasswordAndRole({
      identifier: "env-user",
      password: "nope",
      selectedRole: "ADMIN",
      user: {
        id: "u3",
        username: "env-user",
        email: "env-user@example.com",
        role: "SUPER_ADMIN",
        passwordHash,
      },
    });

    expect(ok).toBe(false);
  });
});

describe("login identifier normalization", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeLoginIdentifier("  Coordinator  ")).toBe("Coordinator");
  });

  it("uses case-insensitive username matching and normalized email matching", async () => {
    let query: unknown;
    const database = {
      user: {
        findFirst: async (args: unknown) => {
          query = args;
          return null;
        },
      },
    } as never;

    expect(await findUserByLoginIdentifier("  CoOrDiNaToR  ", database)).toBeNull();
    expect(query).toEqual({
      where: {
        OR: [
          { email: "coordinator" },
          { username: { equals: "CoOrDiNaToR", mode: "insensitive" } },
        ],
      },
    });
  });
});
