import { describe, expect, it } from "bun:test";
import { ADMIN_EXPORT_TEAM_SELECT, adminExportRows, type AdminExportTeam } from "@/lib/admin-export";
import { csvDocument } from "@/lib/csv";

const createdAt = new Date("2026-09-01T10:30:00.000Z");
const updatedAt = new Date("2026-09-02T11:45:00.000Z");

function makeMember(index: number, overrides: Partial<AdminExportTeam["members"][number]> = {}): AdminExportTeam["members"][number] {
  return {
    id: "member-" + index,
    fullName: "Participant " + index,
    email: "member" + index + "@example.test",
    phone: "900000000" + index,
    college: "MITT",
    degree: index === 3 ? null : "B.Tech",
    participantId: "HM-P-" + index,
    isLeader: index === 1,
    passVerified: index === 2,
    createdAt,
    participantImagePath: index === 1 ? "private://participant-images/photo-1.jpg" : null,
    participantImageMimeType: index === 1 ? "image/jpeg" : null,
    participantImageSizeBytes: index === 1 ? 12345 : null,
    ...overrides,
  };
}

function makeTeam(memberCount: number, overrides: Partial<AdminExportTeam> = {}): AdminExportTeam {
  return {
    id: "team-1",
    teamName: "Event Horizon",
    registrationId: "HM3-0001",
    registrationAccessExpiresAt: updatedAt,
    status: "REJECTED",
    college: "MITT",
    createdAt,
    updatedAt,
    registrationAcknowledgementAttemptCount: 2,
    registrationAcknowledgementAttemptedAt: createdAt,
    registrationAcknowledgementSentAt: updatedAt,
    approvalEmailSentAt: null,
    rejectionEmailSentAt: updatedAt,
    members: Array.from({ length: memberCount }, (_, index) => makeMember(index + 1)),
    payment: {
      id: "payment-1",
      status: "REJECTED",
      transactionId: "TXN-1",
      rejectionReason: "Receipt did not match",
      verifiedById: "admin-1",
      verifiedBy: { name: "Verifier", email: "verifier@example.test" },
      verifiedAt: null,
      createdAt,
      updatedAt,
      _count: { screenshots: 2 },
    },
    ...overrides,
  };
}

function cell(rows: string[][], rowIndex: number, header: string): string {
  const index = rows[0].indexOf(header);
  if (index < 0) throw new Error("Missing CSV header: " + header);
  return rows[rowIndex][index];
}

describe("admin CSV export", () => {
  it("has the complete, documented team, member, and payment column order", () => {
    const teamHeaders = [
      "teamId", "teamName", "registrationId", "status", "college", "memberCount",
      "createdAt", "updatedAt", "registrationAccessExpiresAt",
      "registrationAcknowledgementAttemptCount", "registrationAcknowledgementAttemptedAt",
      "registrationAcknowledgementSentAt", "approvalEmailSentAt", "rejectionEmailSentAt",
    ];
    const memberFields = [
      "id", "name", "email", "phone", "college", "degree", "participantId",
      "role", "passVerified", "createdAt", "hasImage", "imageMimeType", "imageSizeBytes",
    ];
    const paymentHeaders = [
      "paymentId", "paymentStatus", "transactionId", "paymentRejectionReason",
      "paymentVerifiedById", "paymentVerifiedByName", "paymentVerifiedBy",
      "paymentVerifiedAt", "paymentCreatedAt", "paymentUpdatedAt", "paymentScreenshotCount",
    ];
    const expectedHeaders = [
      ...teamHeaders,
      ...Array.from({ length: 4 }, (_, index) =>
        memberFields.map((field) => "member" + (index + 1) + "_" + field),
      ).flat(),
      ...paymentHeaders,
    ];
    expect(adminExportRows([])).toEqual([expectedHeaders]);
    const rows = adminExportRows([makeTeam(3), makeTeam(4, { id: "team-2" })]);
    expect(rows[0]).toEqual(expectedHeaders);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveLength(expectedHeaders.length);
    expect(rows[2]).toHaveLength(expectedHeaders.length);
    expect(cell(rows, 1, "memberCount")).toBe("3");
    expect(cell(rows, 2, "memberCount")).toBe("4");
    expect(cell(rows, 1, "member3_name")).toBe("Participant 3");
    expect(cell(rows, 2, "member4_name")).toBe("Participant 4");
    expect(cell(rows, 1, "member1_role")).toBe("Leader");
    expect(cell(rows, 1, "member2_passVerified")).toBe("true");
    expect(cell(rows, 1, "member1_hasImage")).toBe("true");
    expect(cell(rows, 1, "member1_imageMimeType")).toBe("image/jpeg");
    expect(cell(rows, 1, "member1_imageSizeBytes")).toBe("12345");
    expect(cell(rows, 1, "registrationAcknowledgementAttemptCount")).toBe("2");
    expect(cell(rows, 1, "paymentRejectionReason")).toBe("Receipt did not match");
    expect(cell(rows, 1, "paymentVerifiedBy")).toBe("verifier@example.test");
    expect(cell(rows, 1, "paymentScreenshotCount")).toBe("2");
    expect(cell(rows, 1, "createdAt")).toBe(createdAt.toISOString());
  });

  it("keeps missing optional data and fourth-member slots empty", () => {
    const rows = adminExportRows([makeTeam(3, {
      registrationId: null,
      college: null,
      registrationAccessExpiresAt: null,
      registrationAcknowledgementAttemptedAt: null,
      registrationAcknowledgementSentAt: null,
      rejectionEmailSentAt: null,
      payment: null,
      members: [makeMember(1, { college: null }), makeMember(2, { college: null }), makeMember(3, { college: null })],
    })]);
    expect(rows[1]).toHaveLength(rows[0].length);
    for (const header of rows[0].filter((name) => name.startsWith("member4_") || name.startsWith("payment"))) {
      expect(cell(rows, 1, header)).toBe("");
    }
    for (const header of [
      "registrationId", "college", "registrationAccessExpiresAt",
      "registrationAcknowledgementAttemptedAt", "registrationAcknowledgementSentAt",
      "rejectionEmailSentAt", "member3_degree", "member3_imageMimeType",
      "member3_imageSizeBytes",
    ]) {
      expect(cell(rows, 1, header)).toBe("");
    }
    expect(cell(rows, 1, "member3_hasImage")).toBe("false");
  });

  it("quotes Unicode, commas, quotes and newlines, and neutralizes formulas", () => {
    const member = { ...makeMember(1), fullName: '+SUM(1,2)', email: "-2+2" };
    const rows = adminExportRows([makeTeam(3, {
      teamName: '=HYPERLINK("https://bad.example")',
      college: 'Mysuru, "MITT"\nಕನ್ನಡ',
      members: [member, makeMember(2), makeMember(3)],
      payment: {
        ...makeTeam(3).payment!,
        rejectionReason: "@SUM(A1)",
      },
    })]);
    const csv = csvDocument(rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"")"');
    expect(csv).toContain('"\'+SUM(1,2)"');
    expect(csv).toContain('"\'-2+2"');
    expect(csv).toContain('"\'@SUM(A1)"');
    expect(csv).toContain('"Mysuru, ""MITT""\nಕನ್ನಡ"');
  });

  it("never fetches or serializes hashes, QR tokens, or private paths", () => {
    expect("registrationAccessTokenHash" in ADMIN_EXPORT_TEAM_SELECT).toBe(false);
    expect("qrToken" in ADMIN_EXPORT_TEAM_SELECT.members.select).toBe(false);
    expect("passwordHash" in ADMIN_EXPORT_TEAM_SELECT.payment.select.verifiedBy.select).toBe(false);
    expect("recoveryHash" in ADMIN_EXPORT_TEAM_SELECT.payment.select.verifiedBy.select).toBe(false);
    expect("screenshots" in ADMIN_EXPORT_TEAM_SELECT.payment.select).toBe(false);

    const team = makeTeam(3);
    Object.assign(team, { registrationAccessTokenHash: "secret-access-hash" });
    Object.assign(team.members[0], { qrToken: "secret-qr-token", participantImagePath: "private://secret-photo-path" });
    Object.assign(team.payment!.verifiedBy!, { passwordHash: "secret-password-hash", recoveryHash: "secret-recovery-hash" });
    Object.assign(team.payment!, { screenshots: [{ filePath: "private://secret-receipt-path" }] });
    const csv = csvDocument(adminExportRows([team]));
    for (const secret of [
      "secret-access-hash", "secret-qr-token", "secret-photo-path", "secret-password-hash",
      "secret-recovery-hash", "secret-receipt-path", "private://",
    ]) {
      expect(csv).not.toContain(secret);
    }
    expect(cell(adminExportRows([team]), 1, "member1_hasImage")).toBe("true");
  });

  it("falls back to the leader college when the team college is empty", () => {
    const team = makeTeam(1, {
      college: null,
      members: [makeMember(1, { isLeader: true, college: "Maharaja Institute" })],
    });

    const rows = adminExportRows([team]);

    expect(cell(rows, 1, "college")).toBe("Maharaja Institute");
  });

  it("adds slots for anomalous teams with more than four members", () => {
    const rows = adminExportRows([makeTeam(5)]);
    expect(cell(rows, 1, "member5_name")).toBe("Participant 5");
    expect(rows[1]).toHaveLength(rows[0].length);
  });
});
