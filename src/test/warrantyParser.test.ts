import { describe, expect, it } from "vitest";
import { parseSonyWarrantyHtml } from "@/src/lib/warrantyParser";

describe("parseSonyWarrantyHtml", () => {
  it("extracts required fields from Sony html", () => {
    const html = `
      <html>
        <body>
          <table class="info-table">
            <tr>
              <td class="left-col">Ten san pham</td>
              <td class="right-col">WH-1000XM5</td>
            </tr>
            <tr>
              <td class="left-col">So seri</td>
              <td class="right-col">ABC1234567</td>
            </tr>
            <tr>
              <td class="left-col">Ngay het han bao hanh</td>
              <td class="right-col">25/02/2027</td>
            </tr>
            <tr>
              <td class="left-col">Tinh trang bao hanh</td>
              <td class="right-col">Da kich hoat</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const result = parseSonyWarrantyHtml(html);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.data.productName).toBe("WH-1000XM5");
    expect(result.data.serialNumber).toBe("ABC1234567");
    expect(result.data.expiryDate).toBe("25/02/2027");
    expect(result.data.warrantyStatus).toBe("Da kich hoat");
  });

  it("returns not_found when html does not contain required fields", () => {
    const html = `<html><body><div>No table</div></body></html>`;
    const result = parseSonyWarrantyHtml(html);
    expect(result).toEqual({ status: "not_found" });
  });
});

