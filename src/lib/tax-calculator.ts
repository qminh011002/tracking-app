// Vietnam 2026 Tax Calculator for Individual Business (goods distribution)

export type TaxConfig = {
  year: number;
  vatThreshold: number; // 200,000,000 VND
  pitThreshold: number; // 500,000,000 VND
  vatRate: number; // 1% for goods distribution
  pitRateSimplified: number; // 0.5% for goods distribution
  pitBrackets: { maxRevenue: number; rate: number }[];
  bhxhEnabled: boolean;
  bhxhBaseSalary: number;
  bhxhRate: number; // 25%
  platformVatDeducted: number; // Amount already deducted by platforms
};

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  year: 2026,
  vatThreshold: 200_000_000,
  pitThreshold: 500_000_000,
  vatRate: 0.01,
  pitRateSimplified: 0.005,
  pitBrackets: [
    { maxRevenue: 3_000_000_000, rate: 0.15 },
    { maxRevenue: 50_000_000_000, rate: 0.17 },
    { maxRevenue: Infinity, rate: 0.20 },
  ],
  bhxhEnabled: false,
  bhxhBaseSalary: 0,
  bhxhRate: 0.25,
  platformVatDeducted: 0,
};

export type VatResult = {
  isExempt: boolean;
  threshold: number;
  grossVat: number;
  platformDeducted: number;
  vatPayable: number;
  rate: number;
};

export function calculateVat(
  annualRevenue: number,
  config: TaxConfig
): VatResult {
  const isExempt = annualRevenue <= config.vatThreshold;
  const grossVat = isExempt ? 0 : annualRevenue * config.vatRate;
  const platformDeducted = Math.min(config.platformVatDeducted, grossVat);
  const vatPayable = Math.max(0, grossVat - platformDeducted);

  return {
    isExempt,
    threshold: config.vatThreshold,
    grossVat,
    platformDeducted,
    vatPayable,
    rate: config.vatRate,
  };
}

export type PitMethod1Result = {
  method: 1;
  applicable: boolean;
  isExempt: boolean;
  revenueOverThreshold: number;
  rate: number;
  pitPayable: number;
};

export function calculatePitMethod1(
  annualRevenue: number,
  config: TaxConfig
): PitMethod1Result {
  const isExempt = annualRevenue <= config.pitThreshold;
  const applicable = annualRevenue <= 3_000_000_000;

  if (isExempt || !applicable) {
    return {
      method: 1,
      applicable,
      isExempt,
      revenueOverThreshold: 0,
      rate: config.pitRateSimplified,
      pitPayable: 0,
    };
  }

  const revenueOverThreshold = annualRevenue - config.pitThreshold;
  const pitPayable = revenueOverThreshold * config.pitRateSimplified;

  return {
    method: 1,
    applicable,
    isExempt,
    revenueOverThreshold,
    rate: config.pitRateSimplified,
    pitPayable,
  };
}

export type PitMethod2Result = {
  method: 2;
  isExempt: boolean;
  taxableIncome: number;
  bracketRate: number;
  pitPayable: number;
};

export function calculatePitMethod2(
  annualRevenue: number,
  deductibleExpenses: number,
  config: TaxConfig
): PitMethod2Result {
  const isExempt = annualRevenue <= config.pitThreshold;

  if (isExempt) {
    return {
      method: 2,
      isExempt: true,
      taxableIncome: 0,
      bracketRate: 0,
      pitPayable: 0,
    };
  }

  const taxableIncome = Math.max(0, annualRevenue - deductibleExpenses);
  let bracketRate = 0;

  for (const bracket of config.pitBrackets) {
    if (annualRevenue <= bracket.maxRevenue) {
      bracketRate = bracket.rate;
      break;
    }
  }

  const pitPayable = taxableIncome * bracketRate;

  return {
    method: 2,
    isExempt,
    taxableIncome,
    bracketRate,
    pitPayable,
  };
}

export type BhxhResult = {
  enabled: boolean;
  baseSalary: number;
  rate: number;
  monthlyAmount: number;
  annualAmount: number;
};

export function calculateBhxh(config: TaxConfig): BhxhResult {
  if (!config.bhxhEnabled || config.bhxhBaseSalary <= 0) {
    return {
      enabled: false,
      baseSalary: 0,
      rate: config.bhxhRate,
      monthlyAmount: 0,
      annualAmount: 0,
    };
  }

  const monthlyAmount = config.bhxhBaseSalary * config.bhxhRate;
  return {
    enabled: true,
    baseSalary: config.bhxhBaseSalary,
    rate: config.bhxhRate,
    monthlyAmount,
    annualAmount: monthlyAmount * 12,
  };
}

export type TaxSummary = {
  annualRevenue: number;
  vat: VatResult;
  pitMethod1: PitMethod1Result;
  pitMethod2: PitMethod2Result;
  recommendedPitMethod: 1 | 2;
  recommendedPit: number;
  bhxh: BhxhResult;
  totalObligation: number;
  netIncomeAfterTax: number;
};

export function calculateFullTax(
  annualRevenue: number,
  deductibleExpenses: number,
  config: TaxConfig
): TaxSummary {
  const vat = calculateVat(annualRevenue, config);
  const pitMethod1 = calculatePitMethod1(annualRevenue, config);
  const pitMethod2 = calculatePitMethod2(annualRevenue, deductibleExpenses, config);
  const bhxh = calculateBhxh(config);

  const recommendedPitMethod: 1 | 2 =
    pitMethod1.applicable && pitMethod1.pitPayable <= pitMethod2.pitPayable ? 1 : 2;
  const recommendedPit =
    recommendedPitMethod === 1 ? pitMethod1.pitPayable : pitMethod2.pitPayable;

  const totalObligation = vat.vatPayable + recommendedPit + bhxh.annualAmount;
  const netIncomeAfterTax = annualRevenue - deductibleExpenses - totalObligation;

  return {
    annualRevenue,
    vat,
    pitMethod1,
    pitMethod2,
    recommendedPitMethod,
    recommendedPit,
    bhxh,
    totalObligation,
    netIncomeAfterTax,
  };
}

// Tax calendar deadlines for 2026
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
      id: "q1-vat",
      title: "Q1/2026 VAT filing",
      description: "Submit VAT return for January-March 2026",
      dueDate: "2026-04-30",
      quarter: 1,
      type: "vat",
    },
    {
      id: "q1-pit",
      title: "Q1/2026 PIT prepayment",
      description: "Pay provisional PIT for Q1/2026",
      dueDate: "2026-04-30",
      quarter: 1,
      type: "pit",
    },
    {
      id: "q2-vat",
      title: "Q2/2026 VAT filing",
      description: "Submit VAT return for April-June 2026",
      dueDate: "2026-07-31",
      quarter: 2,
      type: "vat",
    },
    {
      id: "q2-pit",
      title: "Q2/2026 PIT prepayment",
      description: "Pay provisional PIT for Q2/2026",
      dueDate: "2026-07-31",
      quarter: 2,
      type: "pit",
    },
    {
      id: "q3-vat",
      title: "Q3/2026 VAT filing",
      description: "Submit VAT return for July-September 2026",
      dueDate: "2026-10-31",
      quarter: 3,
      type: "vat",
    },
    {
      id: "q3-pit",
      title: "Q3/2026 PIT prepayment",
      description: "Pay provisional PIT for Q3/2026",
      dueDate: "2026-10-31",
      quarter: 3,
      type: "pit",
    },
    {
      id: "q4-vat",
      title: "Q4/2026 VAT filing",
      description: "Submit VAT return for October-December 2026",
      dueDate: "2027-01-31",
      quarter: 4,
      type: "vat",
    },
    {
      id: "q4-pit",
      title: "Q4/2026 PIT prepayment",
      description: "Pay provisional PIT for Q4/2026",
      dueDate: "2027-01-31",
      quarter: 4,
      type: "pit",
    },
    {
      id: "annual-pit",
      title: "Annual PIT finalization for 2026",
      description: "Submit annual PIT finalization return for 2026",
      dueDate: "2027-03-31",
      quarter: 4,
      type: "pit",
    },
    {
      id: "einvoice-check",
      title: "E-invoice compliance check",
      description: "Ensure all electronic invoices are issued and recorded properly",
      dueDate: "2026-12-31",
      quarter: 4,
      type: "other",
    },
  ];
}

// Compliance checklist
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
      title: "Electronic invoices",
      description: "Issue electronic invoices for each sales transaction",
      required: true,
    },
    {
      id: "bookkeeping",
      title: "Bookkeeping records",
      description: "Maintain complete purchase, sales, and expense records",
      required: true,
    },
    {
      id: "etax",
      title: "eTax registration",
      description: "Register and use the official eTax filing system",
      required: true,
    },
    {
      id: "bank-account",
      title: "Business bank account",
      description: "Maintain a dedicated bank account for business operations",
      required: true,
    },
    {
      id: "business-license",
      title: "Business license validity",
      description: "Keep the business license active and valid",
      required: true,
    },
    {
      id: "bhxh-register",
      title: "Social insurance registration",
      description: "Register mandatory social insurance when applicable",
      required: false,
    },
  ];
}
