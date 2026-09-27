/** SMTP mail transport and Hackmitten registration templates. */
import nodemailer from "nodemailer";

interface EmailPayload { to: string; subject: string; html: string; text: string }
export interface EmailResult { success: boolean; message: string; provider: "smtp" | "configuration" }

function escapeHtml(value: string): string {
  return value.replace(/[&<>\'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] ?? character);
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from) {
    return { success: false, message: "SMTP configuration is incomplete", provider: "configuration" };
  }
  try {
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465,
      auth: { user, pass: password }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 });
    await transport.sendMail({ from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
    return { success: true, message: "Email accepted by SMTP server", provider: "smtp" };
  } catch (error) {
    console.error("[email] SMTP delivery failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return { success: false, message: "SMTP delivery failed", provider: "smtp" };
  }
}

export function registrationAcknowledgementEmailHtml(opts: {
  leaderName: string;
  teamName: string;
  contactEmail?: string | null;
}): string {
  const leaderName = escapeHtml(opts.leaderName);
  const teamName = escapeHtml(opts.teamName);
  const contactEmail = opts.contactEmail ? escapeHtml(opts.contactEmail) : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#030303;font-family:'Inter',Arial,sans-serif;color:#F2F2F2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030303;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#080808;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B52A32;">HACKMITTEN 3.0</div>
              <h1 style="font-size:32px;font-weight:700;color:#F2F2F2;margin:16px 0 8px;">REGISTRATION RECEIVED</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;color:#A8A8A8;font-size:14px;line-height:1.7;">
              <p style="margin:0 0 20px;color:#F2F2F2;">Hello ${leaderName},</p>
              <p style="margin:0 0 20px;">Your team registration for Hackmitten 3.0 has been successfully received.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#151515;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#A8A8A8;">TEAM</td><td style="padding:16px 20px;font-size:16px;color:#F2F2F2;font-weight:600;text-align:right;">${teamName}</td></tr>
                <tr><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#A8A8A8;border-top:1px solid rgba(255,255,255,0.05);">REGISTRATION STATUS</td><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:16px;color:#B52A32;font-weight:600;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">RECEIVED</td></tr>
              </table>
              <p style="margin:0 0 12px;">Your registration is awaiting admin review. Your registration and payment details will be reviewed by the Hackmitten coordinators.</p>
              <p style="margin:0 0 8px;color:#F2F2F2;font-weight:600;">Please note:</p>
              <ul style="margin:0 0 20px;padding-left:20px;">
                <li>This email confirms that your registration has been received.</li>
                <li>It does NOT mean that your payment has been verified.</li>
                <li>It does NOT mean that your team has been approved.</li>
                <li>The coordinators will contact you regarding the next step after verification.</li>
              </ul>
              <p style="margin:0;">Keep this email for your records.</p>
              ${contactEmail ? `<p style="margin:20px 0 0;">Official contact: <a href="mailto:${contactEmail}" style="color:#F2F2F2;">${contactEmail}</a></p>` : ""}
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#A8A8A8;margin:24px 0 0;opacity:0.6;">© 2026 Hackmitten · Black is the universe · White is information · Red is energy</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function registrationAcknowledgementEmailText(opts: {
  leaderName: string;
  teamName: string;
  contactEmail?: string | null;
}): string {
  return `HACKMITTEN 3.0

REGISTRATION RECEIVED

Hello ${opts.leaderName},

Your team registration for Hackmitten 3.0 has been successfully received.

Team: ${opts.teamName}
Registration status: RECEIVED

Your registration is awaiting admin review. Your registration and payment details will be reviewed by the Hackmitten coordinators.

Please note:
- This email confirms that your registration has been received.
- It does NOT mean that your payment has been verified.
- It does NOT mean that your team has been approved.
- The coordinators will contact you regarding the next step after verification.

Keep this email for your records.${opts.contactEmail ? `

Official contact: ${opts.contactEmail}` : ""}`.trim();
}

export async function sendRegistrationAcknowledgementEmail(opts: {
  to: string;
  leaderName: string;
  teamName: string;
  contactEmail?: string | null;
}): Promise<EmailResult> {
  return sendEmail({
    to: opts.to,
    subject: "Hackmitten 3.0 — Registration Received",
    html: registrationAcknowledgementEmailHtml(opts),
    text: registrationAcknowledgementEmailText(opts),
  });
}

/**
 * Generate the approval email HTML for a participant.
 */
export function approvalEmailHtml(opts: {
  participantName: string;
  teamName: string;
  registrationId: string;
  participantId: string;
  passUrl: string;
  whatsappGroupUrl: string;
}): string {
  const participantName = escapeHtml(opts.participantName);
  const teamName = escapeHtml(opts.teamName);
  const registrationId = escapeHtml(opts.registrationId);
  const participantId = escapeHtml(opts.participantId);
  const passUrl = escapeHtml(opts.passUrl);
  const whatsappGroupUrl = escapeHtml(opts.whatsappGroupUrl);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#030303;font-family:'Inter',Arial,sans-serif;color:#F2F2F2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030303;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#080808;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B52A32;">HACKMITTEN 3.0</div>
              <h1 style="font-size:32px;font-weight:700;color:#F2F2F2;margin:16px 0 8px;">TEAM APPROVED.</h1>
              <p style="font-size:14px;color:#A8A8A8;margin:0;">Your team has been successfully approved. You are officially accepted for the hackathon.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#151515;border-radius:8px;">
                <tr><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#A8A8A8;">TEAM</td><td style="padding:16px 20px;font-size:16px;color:#F2F2F2;font-weight:600;text-align:right;">${teamName}</td></tr>
                <tr><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#A8A8A8;border-top:1px solid rgba(255,255,255,0.05);">REGISTRATION ID</td><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:16px;color:#B52A32;font-weight:600;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${registrationId}</td></tr>
                <tr><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#A8A8A8;border-top:1px solid rgba(255,255,255,0.05);">TEAM LEADER</td><td style="padding:16px 20px;font-size:16px;color:#F2F2F2;font-weight:600;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${participantName}</td></tr>
                <tr><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#A8A8A8;border-top:1px solid rgba(255,255,255,0.05);">PARTICIPANT ID</td><td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:16px;color:#B52A32;font-weight:600;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${participantId}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 40px;text-align:center;">
              <p>For further instructions, the team leader must join the official WhatsApp group:</p>
              <a href="${whatsappGroupUrl}" style="display:inline-block;background:#B52A32;color:#F2F2F2;text-decoration:none;padding:14px 36px;border-radius:999px;font-size:14px;font-weight:600;letter-spacing:1px;">JOIN HACKMITTEN WHATSAPP GROUP</a>
              <p><a href="${whatsappGroupUrl}">${whatsappGroupUrl}</a></p>
              <p>Venue: MAHARAJA INSTITUTE OF TECHNOLOGY THANDAVAPURA</p>
              <p style="font-size:12px;color:#A8A8A8;margin:16px 0 0;">Please join the official team group and keep your registration details available for the event.</p>
              <a href="${passUrl}" style="display:inline-block;color:#F2F2F2;text-decoration:underline;margin-top:16px;font-size:13px;">VIEW YOUR DIGITAL PASS</a>
              <p style="font-size:12px;color:#A8A8A8;margin:16px 0 0;">Present the QR code on your pass at the food check-in counter.</p>
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#A8A8A8;margin:24px 0 0;opacity:0.6;">© 2026 Hackmitten · Black is the universe · White is information · Red is energy</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function rejectionEmailHtml(teamName: string): string {
  return `<html><body><h1>Hackmitten 3.0</h1><p>Your team registration was rejected.</p><p>Team: ${escapeHtml(teamName)}</p></body></html>`;
}

export function rejectionEmailText(teamName: string): string {
  return `Hackmitten 3.0\n\nYour team registration was rejected.\n\nTeam: ${teamName}`;
}

export function approvalEmailText(opts: {
  participantName: string;
  teamName: string;
  registrationId: string;
  participantId: string;
  passUrl: string;
  whatsappGroupUrl: string;
}): string {
  return `HACKMITTEN 3.0 — TEAM APPROVED.

Your team has been successfully approved.
You are officially accepted for the Hackmitten 3.0 hackathon.

Team: ${opts.teamName}
Registration ID: ${opts.registrationId}
Team leader: ${opts.participantName}
Participant ID: ${opts.participantId}

Join the official Hackmitten 3.0 WhatsApp group: ${opts.whatsappGroupUrl}

Venue: MAHARAJA INSTITUTE OF TECHNOLOGY THANDAVAPURA

View your digital pass: ${opts.passUrl}

Present the QR code on your pass at the food check-in counter.

© 2026 Hackmitten`.trim();
}
