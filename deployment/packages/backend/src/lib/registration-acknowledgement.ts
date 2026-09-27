import { db } from "@/lib/db";
import { sendRegistrationAcknowledgementEmail } from "@/lib/email";

type AcknowledgementClient = {
  team: {
    updateMany(args: { where: any; data: any }): Promise<{ count: number }>;
    findUnique(args: any): Promise<any>;
  };
};

const CLAIM_LEASE_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export async function claimRegistrationAcknowledgement(
  client: AcknowledgementClient,
  teamId: string,
  now = new Date(),
): Promise<boolean> {
  const result = await client.team.updateMany({
    where: {
      id: teamId,
      registrationAcknowledgementSentAt: null,
      registrationAcknowledgementAttemptCount: { lt: MAX_ATTEMPTS },
      OR: [
        { registrationAcknowledgementAttemptedAt: null },
        { registrationAcknowledgementAttemptedAt: { lt: new Date(now.getTime() - CLAIM_LEASE_MS) } },
      ],
    },
    data: { registrationAcknowledgementAttemptedAt: now, registrationAcknowledgementAttemptCount: { increment: 1 } },
  });
  return result.count === 1;
}

export async function completeRegistrationAcknowledgement(
  client: AcknowledgementClient,
  teamId: string,
  claimedAt: Date,
): Promise<void> {
  await client.team.updateMany({
    where: { id: teamId, registrationAcknowledgementAttemptedAt: claimedAt, registrationAcknowledgementSentAt: null },
    data: { registrationAcknowledgementAttemptedAt: null, registrationAcknowledgementSentAt: new Date() },
  });
}

export async function releaseRegistrationAcknowledgementClaim(
  client: AcknowledgementClient,
  teamId: string,
  claimedAt: Date,
): Promise<void> {
  await client.team.updateMany({
    where: { id: teamId, registrationAcknowledgementAttemptedAt: claimedAt, registrationAcknowledgementSentAt: null },
    data: { registrationAcknowledgementAttemptedAt: claimedAt },
  });
}

export async function attemptRegistrationAcknowledgement(
  teamId: string,
  client: AcknowledgementClient = db,
): Promise<boolean> {
  const claimedAt = new Date();
  if (!(await claimRegistrationAcknowledgement(client, teamId, claimedAt))) return false;
  try {
    const team = await client.team.findUnique({ where: { id: teamId }, include: { members: true } });
    const leader = team?.members.find((member: { isLeader: boolean }) => member.isLeader);
    if (!leader?.email) throw new Error("Leader email is missing");

    const result = await sendRegistrationAcknowledgementEmail({
      to: leader.email,
      leaderName: leader.fullName,
      teamName: team.teamName,
    });
    if (!result.success) throw new Error("Email provider did not accept the acknowledgement");

    await completeRegistrationAcknowledgement(client, teamId, claimedAt);
    return true;
  } catch (error) {
    console.error("[registration-acknowledgement] delivery failed", {
      teamId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    await releaseRegistrationAcknowledgementClaim(client, teamId, claimedAt);
    return false;
  }
}
