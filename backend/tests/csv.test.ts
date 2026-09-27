import { describe, expect, it } from "bun:test";
import { csvCell, csvDocument } from "@/lib/csv";
import { coordinatorExportRows } from "@/lib/coordinator-export";

describe("CSV export", () => {
  it("quotes commas, quotes, and line breaks", () => {
    expect(csvCell('Maharaja, "MIT"\nThandavapura')).toBe('"Maharaja, ""MIT""\nThandavapura"');
  });

  it("neutralizes spreadsheet formula cells", () => {
    expect(csvCell("=HYPERLINK(\"bad\")")).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell("@SUM(A1)")).toBe('"\'@SUM(A1)"');
    expect(csvCell("\n=1+1")).toBe('"\'\n=1+1"');
    expect(csvCell("\f+SUM(A1)")).toBe('"\'\f+SUM(A1)"');
    expect(csvCell("\u00a0@SUM(A1)")).toBe('"\'\u00a0@SUM(A1)"');
    expect(csvCell("\u200b-CMD")).toBe('"\'\u200b-CMD"');
  });

  it("exports deterministic UTF-8 BOM and CRLF rows", () => {
    expect(csvDocument([["college", "degree"], ["MIT", "B.E"]])).toBe("\uFEFF\"college\",\"degree\"\r\n\"MIT\",\"B.E\"");
  });

  it("maps all members from multiple 3- and 4-member teams to their own college, degree, and payment", () => {
    const member = (name: string, college: string, degree: string, isLeader = false) => ({
      fullName: name, email: `${name}@example.test`, phone: "9000000000", college, degree,
      participantId: `PID-${name}`, isLeader,
    });
    const rows = coordinatorExportRows([
      { teamName: "Three", registrationId: "HM3-1", status: "APPROVED", payment: { status: "VERIFIED", transactionId: "TXN-3" }, members: [member("A", "College A", "B.E", true), member("B", "College B", "B.Sc"), member("C", "College C", "MCA")] },
      { teamName: "Four", registrationId: "HM3-2", status: "APPROVED", payment: { status: "VERIFIED", transactionId: "TXN-4" }, members: [member("D", "College D", "B.Tech", true), member("E", "College E", "B.E"), member("F", "College F", "MCA"), member("G", "College G", "B.Sc")] },
    ]);
    expect(rows).toHaveLength(8);
    expect(rows[1]).toEqual(["Three", "HM3-1", "A", "A@example.test", "9000000000", "College A", "B.E", "PID-A", "Leader", "APPROVED", "VERIFIED", "TXN-3"]);
    expect(rows[4][5]).toBe("College D");
    expect(rows[4][11]).toBe("TXN-4");
    expect(rows[7][5]).toBe("College G");
  });

  it("keeps columns aligned for missing optional values and escapes CSV injection and quoting", () => {
    const rows = coordinatorExportRows([{ teamName: '=CMD("x")', registrationId: null, status: "APPROVED", payment: null, members: [
      { fullName: 'Leader, "One"', email: "=1+1", phone: "", college: "MIT, Mysore", degree: null, participantId: null, isLeader: true },
    ] }]);
    const csv = csvDocument(rows);
    expect(rows[1]).toHaveLength(rows[0].length);
    expect(csv).toContain("'=CMD");
    expect(csv).toContain("'=1+1");
    expect(csv).toContain('"Leader, ""One"""');
    expect(rows[1].slice(10)).toEqual(["NONE", ""]);
  });
});
