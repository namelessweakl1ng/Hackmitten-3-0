import { describe, expect, it } from "bun:test";
import bcrypt from "bcryptjs";
import { ensureOperationalUser, readCredentialGroup } from "@/lib/operational-users";

function makeDatabase() {
  let row: any = null;
  let creates = 0;
  const database = {
    user: {
      findFirst: async () => row,
      create: async ({ data }: { data: any }) => {
        creates += 1;
        row = { id: "user-1", createdAt: new Date(), updatedAt: new Date(), ...data };
        return row;
      },
      update: async ({ data }: { data: any }) => {
        row = { ...row, ...data, updatedAt: new Date() };
        return row;
      },
    },
  } as never;
  return { database, getRow: () => row, getCreates: () => creates };
}

describe("operational credential groups", () => {
  it("rejects partial environment configuration", () => {
    expect(() => readCredentialGroup({ COORDINATOR_USERNAME: "coord" }, "COORDINATOR")).toThrow(
      "COORDINATOR_USERNAME, COORDINATOR_EMAIL, and COORDINATOR_PASSWORD must all be provided together",
    );
  });

  it("returns null for an absent group", () => {
    expect(readCredentialGroup({}, "FOOD_ADMIN")).toBeNull();
  });
});

describe("ensureOperationalUser", () => {
  it("updates an existing user deterministically and omits passwordHash", async () => {
    const state = makeDatabase();
    const first = await ensureOperationalUser({
      username: " Coordinator ",
      email: "COORDINATOR@EXAMPLE.COM",
      password: "first-password",
      name: " Coordinator ",
      role: "COORDINATOR",
      database: state.database,
    });
    const firstHash = state.getRow().passwordHash;
    const second = await ensureOperationalUser({
      username: "coordinator",
      email: "updated@example.com",
      password: "second-password",
      name: "Updated Coordinator",
      role: "COORDINATOR",
      database: state.database,
    });

    expect(state.getCreates()).toBe(1);
    expect(first).not.toHaveProperty("passwordHash");
    expect(second).not.toHaveProperty("passwordHash");
    expect(state.getRow()).toMatchObject({
      username: "coordinator",
      email: "updated@example.com",
      name: "Updated Coordinator",
      role: "COORDINATOR",
    });
    expect(state.getRow().passwordHash).not.toBe(firstHash);
    expect(await bcrypt.compare("second-password", state.getRow().passwordHash)).toBe(true);
  });

  it("refuses to change the role of an account matched by bootstrap credentials", async () => {
    const state = makeDatabase();
    await ensureOperationalUser({
      username: "operator", email: "operator@example.com", password: "first-password",
      name: "Operator", role: "COORDINATOR", database: state.database,
    });
    await expect(ensureOperationalUser({
      username: "operator", email: "operator@example.com", password: "second-password",
      name: "Operator", role: "SUPER_ADMIN", database: state.database,
    })).rejects.toThrow("refusing to change its role");
  });
});
