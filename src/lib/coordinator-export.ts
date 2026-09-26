export type CoordinatorExportTeam = {
  teamName: string;
  registrationId: string | null;
  status: string;
  payment: { status: string; transactionId: string | null } | null;
  members: Array<{
    fullName: string;
    email: string;
    phone: string;
    college: string;
    degree: string | null;
    participantId: string | null;
    isLeader: boolean;
  }>;
};

export const COORDINATOR_EXPORT_HEADERS = [
  "Team Name", "Registration ID", "Member Name", "Email", "Phone", "College", "Degree",
  "Participant ID", "Leader Status", "Team Status", "Payment Status", "Transaction Number",
];

export function coordinatorExportRows(teams: CoordinatorExportTeam[]): string[][] {
  const rows: string[][] = [COORDINATOR_EXPORT_HEADERS];
  for (const team of teams) {
    for (const member of team.members) {
      rows.push([
        team.teamName,
        team.registrationId ?? "",
        member.fullName,
        member.email,
        member.phone,
        member.college,
        member.degree ?? "",
        member.participantId ?? "",
        member.isLeader ? "Leader" : "Member",
        team.status,
        team.payment?.status ?? "NONE",
        team.payment?.transactionId ?? "",
      ]);
    }
  }
  return rows;
}
