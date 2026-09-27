import type { Prisma } from "@prisma/client";

// Explicit allowlist: credentials and QR tokens are never fetched. The image
// path is used only to compute hasImage; private paths are never serialized.
export const ADMIN_EXPORT_TEAM_SELECT = {
  id: true,
  teamName: true,
  registrationId: true,
  registrationAccessExpiresAt: true,
  status: true,
  college: true,
  createdAt: true,
  updatedAt: true,
  registrationAcknowledgementAttemptCount: true,
  registrationAcknowledgementAttemptedAt: true,
  registrationAcknowledgementSentAt: true,
  approvalEmailSentAt: true,
  rejectionEmailSentAt: true,
  members: {
    orderBy: [{ isLeader: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      college: true,
      degree: true,
      participantId: true,
      isLeader: true,
      passVerified: true,
      createdAt: true,
      participantImagePath: true,
      participantImageMimeType: true,
      participantImageSizeBytes: true,
    },
  },
  payment: {
    select: {
      id: true,
      status: true,
      transactionId: true,
      rejectionReason: true,
      verifiedById: true,
      verifiedBy: { select: { name: true, email: true } },
      verifiedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { screenshots: true } },
    },
  },
} as const satisfies Prisma.TeamSelect;

export type AdminExportTeam = Prisma.TeamGetPayload<{ select: typeof ADMIN_EXPORT_TEAM_SELECT }>;

const TEAM_HEADERS = [
  "teamId",
  "teamName",
  "registrationId",
  "status",
  "college",
  "memberCount",
  "createdAt",
  "updatedAt",
  "registrationAccessExpiresAt",
  "registrationAcknowledgementAttemptCount",
  "registrationAcknowledgementAttemptedAt",
  "registrationAcknowledgementSentAt",
  "approvalEmailSentAt",
  "rejectionEmailSentAt",
] as const;

const MEMBER_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "college",
  "degree",
  "participantId",
  "role",
  "passVerified",
  "createdAt",
  "hasImage",
  "imageMimeType",
  "imageSizeBytes",
] as const;

const PAYMENT_HEADERS = [
  "paymentId",
  "paymentStatus",
  "transactionId",
  "paymentRejectionReason",
  "paymentVerifiedById",
  "paymentVerifiedByName",
  "paymentVerifiedBy",
  "paymentVerifiedAt",
  "paymentCreatedAt",
  "paymentUpdatedAt",
  "paymentScreenshotCount",
] as const;

const iso = (date: Date | null | undefined) => date?.toISOString() ?? "";
const boolean = (value: boolean) => String(value);

/**
 * One row per team. Columns are ordered team, member 1..N, payment; members
 * are ordered leader first, then creation time and ID by the Prisma query.
 * Four slots are always present; extra slots preserve anomalous >4-member data.
 */
export function adminExportRows(teams: AdminExportTeam[]): string[][] {
  const memberSlots = teams.reduce((slots, team) => Math.max(slots, team.members.length), 4);
  const headers = [
    ...TEAM_HEADERS,
    ...Array.from({ length: memberSlots }, (_, index) =>
      MEMBER_FIELDS.map((field) => "member" + (index + 1) + "_" + field),
    ).flat(),
    ...PAYMENT_HEADERS,
  ];
  const rows: string[][] = [headers];

  for (const team of teams) {
    const row = [
      team.id,
      team.teamName,
      team.registrationId ?? "",
      team.status,
      team.college ?? team.members.find((member) => member.isLeader)?.college ?? team.members[0]?.college ?? "",
      String(team.members.length),
      iso(team.createdAt),
      iso(team.updatedAt),
      iso(team.registrationAccessExpiresAt),
      String(team.registrationAcknowledgementAttemptCount),
      iso(team.registrationAcknowledgementAttemptedAt),
      iso(team.registrationAcknowledgementSentAt),
      iso(team.approvalEmailSentAt),
      iso(team.rejectionEmailSentAt),
    ];

    for (let index = 0; index < memberSlots; index++) {
      const member = team.members[index];
      row.push(...(member ? [
        member.id,
        member.fullName,
        member.email,
        member.phone,
        member.college,
        member.degree ?? "",
        member.participantId ?? "",
        member.isLeader ? "Leader" : "Member",
        boolean(member.passVerified),
        iso(member.createdAt),
        boolean(member.participantImagePath !== null),
        member.participantImageMimeType ?? "",
        member.participantImageSizeBytes?.toString() ?? "",
      ] : Array(MEMBER_FIELDS.length).fill("")));
    }

    const payment = team.payment;
    row.push(...(payment ? [
      payment.id,
      payment.status,
      payment.transactionId ?? "",
      payment.rejectionReason ?? "",
      payment.verifiedById ?? "",
      payment.verifiedBy?.name ?? "",
      payment.verifiedBy?.email ?? "",
      iso(payment.verifiedAt),
      iso(payment.createdAt),
      iso(payment.updatedAt),
      String(payment._count.screenshots),
    ] : Array(PAYMENT_HEADERS.length).fill("")));
    rows.push(row);
  }
  return rows;
}
