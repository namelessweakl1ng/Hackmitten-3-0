import { describe, expect, it } from "bun:test";

import {
  DEFAULT_EVENT_CONFIG,
  ensureSingletonEventConfig,
  ensureSuperAdminBootstrap,
} from "@/lib/bootstrap";
import { getEventState } from "@/lib/event-state";

function makeDatabase() {
  let eventConfig: Record<string, unknown> | null = null;
  let user: Record<string, unknown> | null = null;
  let eventCreates = 0;
  let userCreates = 0;

  const database = {
    eventConfig: {
      findUnique: async () => eventConfig,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        eventCreates += 1;
        eventConfig = { ...data };
        return eventConfig;
      },
    },
    user: {
      findFirst: async () => user,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        userCreates += 1;
        user = { id: "user-1", ...data };
        return user;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        user = { ...user, ...data };
        return user;
      },
    },
    team: {
      count: async () => 0,
    },
  };

  return {
    database: database as never,
    getEventConfig: () => eventConfig,
    getUser: () => user,
    getEventCreates: () => eventCreates,
    getUserCreates: () => userCreates,
  };
}

describe("production bootstrap", () => {
  it("creates the singleton EventConfig from canonical defaults", async () => {
    const state = makeDatabase();

    const config = await ensureSingletonEventConfig(state.database);

    expect(config).toEqual(DEFAULT_EVENT_CONFIG);
    expect(state.getEventCreates()).toBe(1);
  });

  it("preserves an existing EventConfig and does not create a duplicate", async () => {
    const state = makeDatabase();
    const existing = { ...DEFAULT_EVENT_CONFIG, eventName: "Configured event" };
    await state.database.eventConfig.create({ data: existing });

    const config = await ensureSingletonEventConfig(state.database);

    expect(config).toEqual(existing);
    expect(state.getEventCreates()).toBe(1);
  });

  it("creates and then reuses the configured SUPER_ADMIN", async () => {
    const state = makeDatabase();
    const credentials = {
      username: "bootstrap-admin",
      email: "admin@example.com",
      password: "test-only-password",
      database: state.database,
    };

    const first = await ensureSuperAdminBootstrap(credentials);
    const second = await ensureSuperAdminBootstrap(credentials);

    expect(first?.role).toBe("SUPER_ADMIN");
    expect(second?.role).toBe("SUPER_ADMIN");
    expect(state.getUserCreates()).toBe(1);
    expect(state.getUser()?.passwordHash).toBeString();
  });

  it("reports all registration flags closed when EventConfig is missing", async () => {
    const mockState = makeDatabase();
    const state = await getEventState(mockState.database);

    expect(state.registrationOpen).toBe(false);
    expect(state.registrationAvailable).toBe(false);
    expect(state.registrationsOpen).toBe(false);
  });
});