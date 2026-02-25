export type WarrantyInfo = {
  productName: string;
  serialNumber: string;
  expiryDate: string;
  warrantyStatus: string;
};

export type WarrantyParseResult =
  | { status: "success"; data: WarrantyInfo }
  | { status: "not_found" };

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickField(map: Map<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = map.get(key);
    if (value) return value;
  }
  return null;
}

export function parseSonyWarrantyHtml(html: string): WarrantyParseResult {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll("table.info-table tr"));
  const fieldMap = new Map<string, string>();

  for (const row of rows) {
    const leftCell = row.querySelector(".left-col");
    const rightCell = row.querySelector(".right-col");
    if (!leftCell || !rightCell) continue;

    const key = normalizeKey(leftCell.textContent ?? "");
    const value = normalizeValue(rightCell.textContent ?? "");
    if (key && value) {
      fieldMap.set(key, value);
    }
  }

  const productName = pickField(fieldMap, ["ten san pham"]);
  const serialNumber = pickField(fieldMap, [
    "so seri",
    "so serial",
    "so serial imei",
  ]);
  const expiryDate = pickField(fieldMap, ["ngay het han bao hanh"]);
  const warrantyStatus = pickField(fieldMap, ["tinh trang bao hanh"]);

  if (productName && serialNumber && expiryDate && warrantyStatus) {
    return {
      status: "success",
      data: {
        productName,
        serialNumber,
        expiryDate,
        warrantyStatus,
      },
    };
  }

  return { status: "not_found" };
}

