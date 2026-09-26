import { describe, expect, it } from "bun:test";
import { jsonError } from "@/lib/api-auth";

describe("API error responses", () => {
  it("does not return internal exception details", async () => {
    const previousError = console.error;
    let logged = "";
    console.error = (...values: unknown[]) => { logged = values.map(String).join(" "); };
    const response = jsonError(new Error("password=private DATABASE_URL=postgres://secret"));
    console.error = previousError;
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("An unexpected error occurred.");
    expect(JSON.stringify(body)).not.toContain("postgres://secret");
    expect(logged).not.toContain("postgres://secret");
  });
});
