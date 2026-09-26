import { describe, expect, it } from "bun:test";
import { csvCell, csvDocument } from "@/lib/csv";

describe("CSV export", () => {
  it("quotes commas, quotes, and line breaks", () => {
    expect(csvCell('Maharaja, "MIT"\nThandavapura')).toBe('"Maharaja, ""MIT""\nThandavapura"');
  });

  it("neutralizes spreadsheet formula cells", () => {
    expect(csvCell("=HYPERLINK(\"bad\")")).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell("@SUM(A1)")).toBe('"\'@SUM(A1)"');
  });

  it("exports deterministic UTF-8 BOM and CRLF rows", () => {
    expect(csvDocument([["college", "degree"], ["MIT", "B.E"]])).toBe("\uFEFF\"college\",\"degree\"\r\n\"MIT\",\"B.E\"");
  });
});
