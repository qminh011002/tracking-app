// Thuế hộ kinh doanh BÁN HÀNG HÓA (phân phối, cung cấp hàng hóa) — áp dụng từ 01/01/2026
// Căn cứ: Luật Thuế GTGT/TNCN (sửa đổi) + Nghị định 68/2026/NĐ-CP.
//
// Quy tắc rất đơn giản:
//   • Doanh thu cả năm <= 500 triệu đồng  ->  KHÔNG phải nộp thuế (miễn cả GTGT và TNCN).
//   • Doanh thu cả năm  > 500 triệu đồng  ->  nộp thuế tính trên TOÀN BỘ doanh thu:
//        - Thuế GTGT = Doanh thu x 1%
//        - Thuế TNCN = Doanh thu x 0,5%
//        - Tổng thuế = Doanh thu x 1,5%
//   • Lưu ý: thuế tính trên DOANH THU (tổng tiền bán ra), không phải trên lợi nhuận.
//   • Hộ kê khai theo quý; hạn nộp là ngày cuối của tháng đầu quý kế tiếp.

export const TAX_FREE_THRESHOLD = 500_000_000; // đồng / năm — ngưỡng miễn thuế
export const VAT_RATE = 0.01; // 1% GTGT cho bán hàng hóa
export const PIT_RATE = 0.005; // 0,5% TNCN cho bán hàng hóa
export const TOTAL_TAX_RATE = VAT_RATE + PIT_RATE; // 1,5%

export type TaxEstimate = {
  revenue: number;
  isExempt: boolean;
  threshold: number;
  vat: number;
  pit: number;
  total: number;
  effectiveRate: number; // total / revenue
};

/** Tính thuế phải nộp cho một mức doanh thu cả năm. */
export function estimateTax(annualRevenue: number): TaxEstimate {
  const revenue = Math.max(0, annualRevenue);
  const isExempt = revenue <= TAX_FREE_THRESHOLD;
  const vat = isExempt ? 0 : revenue * VAT_RATE;
  const pit = isExempt ? 0 : revenue * PIT_RATE;
  const total = vat + pit;

  return {
    revenue,
    isExempt,
    threshold: TAX_FREE_THRESHOLD,
    vat,
    pit,
    total,
    effectiveRate: revenue > 0 ? total / revenue : 0,
  };
}

export type CumulativePoint = {
  month: number; // 1-12
  cumulative: number;
  isActual: boolean;
};

export type TaxForecast = {
  ytdRevenue: number; // doanh thu thực tế từ đầu năm tới hiện tại
  currentMonth: number;
  monthlyRunRate: number; // doanh thu trung bình mỗi tháng (theo các tháng có phát sinh)
  projectedAnnualRevenue: number; // dự báo doanh thu cả năm
  remainingToThreshold: number; // còn bao nhiêu doanh thu nữa thì chạm ngưỡng
  alreadyExceeded: boolean; // doanh thu thực tế đã vượt ngưỡng chưa
  willExceedThreshold: boolean; // dự báo cả năm có vượt ngưỡng không
  crossingMonth: number | null; // tháng doanh thu lũy kế chạm ngưỡng (1-12)
  ytdTax: TaxEstimate; // thuế theo doanh thu thực tế tới hiện tại
  projectedTax: TaxEstimate; // thuế dự báo cho cả năm
  cumulativeByMonth: CumulativePoint[];
};

/**
 * Dự báo thuế cả năm dựa trên dữ liệu doanh thu thực tế.
 * @param monthlyRevenue Mảng 12 phần tử — doanh thu thực tế từng tháng (0 nếu chưa có).
 * @param currentMonth   Tháng hiện tại (1-12).
 */
export function forecastTax(
  monthlyRevenue: number[],
  currentMonth: number,
): TaxForecast {
  const month = Math.min(12, Math.max(1, currentMonth));
  const months = Array.from({ length: 12 }, (_, i) => monthlyRevenue[i] ?? 0);

  const ytdRevenue = months.slice(0, month).reduce((a, b) => a + b, 0);

  // Run-rate dựa trên số tháng thực sự có doanh thu (tránh kéo trung bình xuống thấp).
  const activeMonths = months.slice(0, month).filter((v) => v > 0).length;
  const monthsForRate = Math.max(1, activeMonths || month);
  const monthlyRunRate = ytdRevenue / monthsForRate;

  // Các tháng còn lại được dự báo theo run-rate.
  const projected = months.map((value, i) =>
    i + 1 <= month ? value : monthlyRunRate,
  );
  const projectedAnnualRevenue = projected.reduce((a, b) => a + b, 0);

  let cum = 0;
  let crossingMonth: number | null = null;
  const cumulativeByMonth: CumulativePoint[] = projected.map((value, i) => {
    cum += value;
    if (crossingMonth === null && cum > TAX_FREE_THRESHOLD) {
      crossingMonth = i + 1;
    }
    return { month: i + 1, cumulative: cum, isActual: i + 1 <= month };
  });

  return {
    ytdRevenue,
    currentMonth: month,
    monthlyRunRate,
    projectedAnnualRevenue,
    remainingToThreshold: Math.max(0, TAX_FREE_THRESHOLD - ytdRevenue),
    alreadyExceeded: ytdRevenue > TAX_FREE_THRESHOLD,
    willExceedThreshold: projectedAnnualRevenue > TAX_FREE_THRESHOLD,
    crossingMonth,
    ytdTax: estimateTax(ytdRevenue),
    projectedTax: estimateTax(projectedAnnualRevenue),
    cumulativeByMonth,
  };
}

// ---------------------------------------------------------------------------
// Lịch khai/nộp thuế 2026 (hộ kê khai theo quý)
// ---------------------------------------------------------------------------

export type TaxDeadline = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  quarter: number;
  type: "vat" | "pit" | "report" | "other";
};

export function getTaxCalendar2026(): TaxDeadline[] {
  return [
    {
      id: "q1",
      title: "Khai & nộp thuế Quý 1/2026",
      description: "Tờ khai thuế GTGT + TNCN cho doanh thu tháng 1–3/2026",
      dueDate: "2026-04-30",
      quarter: 1,
      type: "vat",
    },
    {
      id: "q2",
      title: "Khai & nộp thuế Quý 2/2026",
      description: "Tờ khai thuế GTGT + TNCN cho doanh thu tháng 4–6/2026",
      dueDate: "2026-07-31",
      quarter: 2,
      type: "vat",
    },
    {
      id: "q3",
      title: "Khai & nộp thuế Quý 3/2026",
      description: "Tờ khai thuế GTGT + TNCN cho doanh thu tháng 7–9/2026",
      dueDate: "2026-10-31",
      quarter: 3,
      type: "vat",
    },
    {
      id: "q4",
      title: "Khai & nộp thuế Quý 4/2026",
      description: "Tờ khai thuế GTGT + TNCN cho doanh thu tháng 10–12/2026",
      dueDate: "2027-01-31",
      quarter: 4,
      type: "vat",
    },
    {
      id: "annual",
      title: "Quyết toán thuế năm 2026",
      description: "Tổng hợp doanh thu cả năm và quyết toán nghĩa vụ thuế 2026",
      dueDate: "2027-03-31",
      quarter: 4,
      type: "pit",
    },
  ];
}

/** Mốc khai/nộp thuế sắp tới gần nhất tính từ một thời điểm cho trước. */
export function getNextDeadline(now: Date): TaxDeadline | null {
  const upcoming = getTaxCalendar2026()
    .map((d) => ({ d, due: new Date(`${d.dueDate}T23:59:59`).getTime() }))
    .filter((x) => x.due >= now.getTime())
    .sort((a, b) => a.due - b.due);
  return upcoming[0]?.d ?? null;
}

// ---------------------------------------------------------------------------
// Checklist tuân thủ
// ---------------------------------------------------------------------------

export type ComplianceItem = {
  id: string;
  title: string;
  description: string;
  required: boolean;
};

export function getComplianceChecklist(): ComplianceItem[] {
  return [
    {
      id: "einvoice",
      title: "Hóa đơn điện tử",
      description: "Xuất hóa đơn điện tử cho từng giao dịch bán hàng",
      required: true,
    },
    {
      id: "bookkeeping",
      title: "Sổ sách kế toán",
      description: "Lưu đầy đủ chứng từ mua, bán và chi phí",
      required: true,
    },
    {
      id: "etax",
      title: "Đăng ký eTax",
      description: "Đăng ký và kê khai trên hệ thống thuế điện tử eTax",
      required: true,
    },
    {
      id: "bank-account",
      title: "Tài khoản ngân hàng kinh doanh",
      description: "Dùng tài khoản riêng cho hoạt động kinh doanh",
      required: true,
    },
    {
      id: "business-license",
      title: "Giấy phép kinh doanh",
      description: "Giữ giấy phép hộ kinh doanh còn hiệu lực",
      required: true,
    },
  ];
}
