import { afterEach, describe, expect, it } from "bun:test";
import { claimRegistrationAcknowledgement, releaseRegistrationAcknowledgementClaim } from "@/lib/registration-acknowledgement";
import {
  approvalEmailHtml,
  approvalEmailText,
  rejectionEmailHtml,
  rejectionEmailText,
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

describe("SMTP mail configuration", () => {
  it("fails closed when SMTP settings are incomplete", async () => {
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]) delete process.env[key];
    await expect(sendEmail(payload)).resolves.toEqual({ success: false, message: "SMTP configuration is incomplete", provider: "configuration" });
  });

  it("does not report failed SMTP delivery as success", async () => {
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = "1";
    process.env.SMTP_USER = "test";
    process.env.SMTP_PASSWORD = "test-secret";
    process.env.SMTP_FROM = "noreply@example.test";
    await expect(sendEmail(payload)).resolves.toMatchObject({ success: false, provider: "smtp" });
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
    for (const content of [approvalEmailHtml(opts), approvalEmailText(opts)]) {
      expect(content).toContain("Your team has been successfully approved");
      expect(content).toContain("officially accepted");
      expect(content).toContain("MAHARAJA INSTITUTE OF TECHNOLOGY THANDAVAPURA");
    }
  });

  it("states rejection and the team name without injecting an unapproved reason", () => {
    const html = rejectionEmailHtml("Team <One>");
    const text = rejectionEmailText("Team <One>");
    for (const content of [html, text]) expect(content).toContain("registration was rejected");
    expect(html).toContain("Team &lt;One&gt;");
    expect(text).toContain("Team <One>");
    expect(html + text).not.toContain("reason:");
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

  it("uses the received subject and addresses the team leader", () => {
    const html = registrationAcknowledgementEmailHtml(opts);
    const text = registrationAcknowledgementEmailText(opts);
    expect(text).toContain("Hackmitten 3.0");
    expect(text).toContain("REGISTRATION RECEIVED");
    expect(html).toContain("awaiting admin review");
    expect(text).not.toContain("Your team has been approved");
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
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM;

    await expect(sendRegistrationAcknowledgementEmail(opts)).resolves.toMatchObject({
      success: false,
      provider: "configuration",
    });
  });

  it("leases acknowledgements and caps delivery attempts at three", async () => {
    let claimedAt: Date | null = null;
    let attempts = 0;
    const client = {
      team: {
        updateMany: async ({ where, data }: { where: { registrationAcknowledgementAttemptCount?: { lt: number }; OR: Array<{ registrationAcknowledgementAttemptedAt: null | { lt: Date } }> }; data: { registrationAcknowledgementAttemptedAt: Date | null; registrationAcknowledgementAttemptCount?: { increment: number } } }) => {
          if (data.registrationAcknowledgementAttemptCount?.increment) {
            if (attempts >= (where.registrationAcknowledgementAttemptCount?.lt ?? Infinity)) return { count: 0 };
            const expiredBefore = where.OR[1].registrationAcknowledgementAttemptedAt;
            if (claimedAt && (expiredBefore === null || claimedAt >= expiredBefore.lt)) return { count: 0 };
            claimedAt = data.registrationAcknowledgementAttemptedAt;
            attempts++;
            return { count: 1 };
          }
          return { count: 1 };
        },
      },
    };

    const firstTime = new Date(Date.now() - 20 * 60 * 1000);
    await expect(claimRegistrationAcknowledgement(client, "team-1", firstTime)).resolves.toBe(true);
    await expect(claimRegistrationAcknowledgement(client, "team-1", firstTime)).resolves.toBe(false);
    const attemptTime = claimedAt!;
    await releaseRegistrationAcknowledgementClaim(client, "team-1", attemptTime);
    await expect(claimRegistrationAcknowledgement(client, "team-1", new Date(attemptTime.getTime() + 11 * 60 * 1000))).resolves.toBe(true);
    await expect(claimRegistrationAcknowledgement(client, "team-1", new Date(attemptTime.getTime() + 22 * 60 * 1000))).resolves.toBe(true);
    await expect(claimRegistrationAcknowledgement(client, "team-1", new Date(attemptTime.getTime() + 33 * 60 * 1000))).resolves.toBe(false);
  });
});
