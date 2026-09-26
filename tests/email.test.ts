import { afterEach, describe, expect, it } from "bun:test";
import { claimRegistrationAcknowledgement, releaseRegistrationAcknowledgementClaim } from "@/lib/registration-acknowledgement";
import {
  approvalEmailHtml,
  approvalEmailText,
  registrationAcknowledgementEmailHtml,
  registrationAcknowledgementEmailText,
  sendEmail,
  sendRegistrationAcknowledgementEmail,
} from "@/lib/email";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

const payload = {
  to: "leader@example.com",
  subject: "Hackmitten 3.0 — Team Approved",
  html: "<p>approved</p>",
  text: "approved",
};

describe("sendEmail", () => {
  it("reports missing Resend configuration in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = "Hackmitten <noreply@example.com>";

    await expect(sendEmail(payload)).resolves.toEqual({
      success: false,
      message: "RESEND_API_KEY is not configured in production",
      provider: "configuration",
    });
  });

  it("reports missing sender configuration in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "re_test_key";
    delete process.env.EMAIL_FROM;

    await expect(sendEmail(payload)).resolves.toEqual({
      success: false,
      message: "EMAIL_FROM is not configured in production",
      provider: "configuration",
    });
  });

  it("uses the console fallback locally", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;

    await expect(sendEmail(payload)).resolves.toMatchObject({
      success: true,
      provider: "console",
    });
  });

  it("reports a successful Resend delivery", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Hackmitten <noreply@example.com>";
    let requestBody = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ id: "email_test_1" }), { status: 200 });
    };

    try {
      await expect(sendEmail(payload)).resolves.toMatchObject({ success: true, provider: "resend" });
      expect(requestBody).toContain('"to":["leader@example.com"]');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports a Resend failure", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Hackmitten <noreply@example.com>";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "provider rejected request" }), { status: 400 });

    try {
      await expect(sendEmail(payload)).resolves.toMatchObject({ success: false, provider: "resend" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("approval email templates", () => {
  const opts = {
    participantName: "Leader",
    teamName: "Nova",
    registrationId: "HM3-00001",
    participantId: "HM3-00001-01",
    passUrl: "https://example.com/pass/token",
    whatsappGroupUrl: "https://chat.whatsapp.com/CKjNXeNALPzAymQ0GhfMCj",
  };

  it("contains the WhatsApp URL in both templates", () => {
    expect(approvalEmailHtml(opts)).toContain(opts.whatsappGroupUrl);
    expect(approvalEmailText(opts)).toContain(opts.whatsappGroupUrl);
  });

  it("targets the team leader email in the approval payload", () => {
    expect(approvalEmailText(opts)).toContain("Leader");
    expect(payload.to).toBe("leader@example.com");
  });
});

describe("registration acknowledgement email", () => {
  const opts = {
    to: "leader@gmail.com",
    leaderName: "Leader",
    teamName: "Nova",
    contactEmail: "hodcse@mitt.edu.in",
  };

  it("uses the received subject and sends only to the team leader", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Hackmitten <noreply@example.com>";
    let requestBody = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ id: "email_registration_1" }), { status: 200 });
    };

    try {
      await expect(sendRegistrationAcknowledgementEmail(opts)).resolves.toMatchObject({
        success: true,
        provider: "resend",
      });
      expect(requestBody).toContain('"to":["leader@gmail.com"]');
      expect(requestBody).toContain("Hackmitten 3.0 — Registration Received");
      expect(requestBody).not.toContain("Team Approved");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("contains received status and coordinator review wording without approval claims", () => {
    const html = registrationAcknowledgementEmailHtml(opts);
    const text = registrationAcknowledgementEmailText(opts);
    for (const content of [html, text]) {
      expect(content).toContain("REGISTRATION RECEIVED");
      expect(content).toContain("RECEIVED");
      expect(content).toContain("payment has been verified");
      expect(content).toContain("team has been approved");
      expect(content).toContain(opts.contactEmail);
      expect(content).not.toContain("TEAM APPROVED.");
    }
  });

  it("keeps registration acknowledgement failure non-fatal", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = "Hackmitten <noreply@example.com>";

    await expect(sendRegistrationAcknowledgementEmail(opts)).resolves.toMatchObject({
      success: false,
      provider: "configuration",
    });
  });

  it("claims an acknowledgement only once across retries", async () => {
    let claimedAt: Date | null = null;
    const client = {
      team: {
        updateMany: async ({ data }: { data: { registrationAcknowledgementAttemptedAt: Date | null } }) => {
          if (data.registrationAcknowledgementAttemptedAt === null) {
            claimedAt = null;
            return { count: 1 };
          }
          if (claimedAt) return { count: 0 };
          claimedAt = data.registrationAcknowledgementAttemptedAt;
          return { count: 1 };
        },
      },
    };

    await expect(claimRegistrationAcknowledgement(client, "team-1")).resolves.toBe(true);
    await expect(claimRegistrationAcknowledgement(client, "team-1")).resolves.toBe(false);
    const attemptTime = claimedAt!;
    await releaseRegistrationAcknowledgementClaim(client, "team-1", attemptTime);
    await expect(claimRegistrationAcknowledgement(client, "team-1")).resolves.toBe(true);
  });
});
