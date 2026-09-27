export function normalizeTeamName(teamName: string): string {
  return teamName.trim().toLowerCase().replace(/\s+/g, " ");
}