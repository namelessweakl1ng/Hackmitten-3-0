import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { csvDocument } from "@/lib/csv";

/**
 * GET /api/admin/export
 * Returns CSV of all teams + members + payment summary.
 */
export async function GET() {
  try {
    await requirePermission("export:data");

    const teams = await db.team.findMany({
      include: {
        members: true,
        payment: { include: { verifiedBy: { select: { email: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows: string[][] = [
      [
        "teamName",
        "registrationId",
        "status",
        "college",
        "member1_name",
        "member1_email",
        "member1_phone",
        "member1_college",
        "member1_degree",
        "member2_name",
        "member2_email",
        "member2_phone",
        "member2_college",
        "member2_degree",
        "member3_name",
        "member3_email",
        "member3_phone",
        "member3_college",
        "member3_degree",
        "member4_name",
        "member4_email",
        "member4_phone",
        "member4_college",
        "member4_degree",
        "paymentStatus",
        "transactionId",
        "paymentVerifiedBy",
        "paymentVerifiedAt",
        "createdAt",
      ],
    ];

    for (const t of teams) {
      const row: string[] = [
        t.teamName,
        t.registrationId ?? "",
        t.status,
        t.college ?? "",
      ];
      for (let i = 0; i < 4; i++) {
        const m = t.members[i];
        if (m) {
          row.push(m.fullName, m.email, m.phone, m.college, m.degree ?? "");
        } else {
          row.push("", "", "", "", "");
        }
      }
      row.push(
        t.payment?.status ?? "NONE",
        t.payment?.transactionId ?? "",
        t.payment?.verifiedBy?.email ?? "",
        t.payment?.verifiedAt?.toISOString() ?? "",
        t.createdAt.toISOString(),
      );
      rows.push(row);
    }

    const csvText = csvDocument(rows);
    return new Response(csvText, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="hackmitten-registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
