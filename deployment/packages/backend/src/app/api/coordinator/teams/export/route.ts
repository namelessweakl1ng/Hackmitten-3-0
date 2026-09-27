import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { csvDocument } from "@/lib/csv";
import { coordinatorExportRows } from "@/lib/coordinator-export";

export async function GET() {
  try {
    await requirePermission("dashboard:view");
    const teams = await db.team.findMany({
      orderBy: [{ registrationId: "asc" }, { createdAt: "asc" }],
      select: {
        teamName: true,
        registrationId: true,
        status: true,
        payment: { select: { status: true, transactionId: true } },
        members: {
          select: { fullName: true, email: true, phone: true, college: true, degree: true, participantId: true, isLeader: true },
          orderBy: { isLeader: "desc" },
        },
      },
    });
    const csv = csvDocument(coordinatorExportRows(teams));
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hackmitten-coordinator-teams-${date}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return jsonError(error); }
}
