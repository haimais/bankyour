import { CalculatorResponse, CalculatorType, PaymentType, TermUnit } from "@/lib/types";

type Numeric = number | string | boolean | undefined | null;

interface CalculatorInput {
  [key: string]: Numeric;
}

type CalcLocale = "ru" | "en";

function resolveLocale(locale?: string): CalcLocale {
  return locale === "ru" ? "ru" : "en";
}

function toNumber(value: Numeric, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toBoolean(value: Numeric, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (["1", "true", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === "number") {
    return value > 0;
  }
  return fallback;
}

function round(value: number, digits = 2): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function asTermUnit(value: Numeric): TermUnit {
  if (value === "days" || value === "months" || value === "years") {
    return value;
  }
  return "months";
}

function asPaymentType(value: Numeric): PaymentType {
  if (value === "annuity" || value === "differentiated") {
    return value;
  }
  return "annuity";
}

function termToMonths(termValue: number, termUnit: TermUnit): number {
  const safeValue = Math.max(1, Math.round(termValue));
  if (termUnit === "days") {
    return Math.max(1, Math.round(safeValue / 30));
  }
  if (termUnit === "years") {
    return Math.max(1, safeValue * 12);
  }
  return safeValue;
}

function annuityPayment(principal: number, annualRatePercent: number, months: number): number {
  if (months <= 0 || principal <= 0) {
    return 0;
  }
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate <= 0) {
    return principal / months;
  }
  const denominator = 1 - Math.pow(1 + monthlyRate, -months);
  if (denominator <= 0) {
    return 0;
  }
  return (principal * monthlyRate) / denominator;
}

function buildLoanSchedule(
  principal: number,
  annualRate: number,
  months: number,
  paymentType: PaymentType
) {
  const monthlyRate = Math.max(0, annualRate / 12 / 100);
  let balance = Math.max(0, principal);
  const schedule: CalculatorResponse["schedule"] = [];

  if (paymentType === "annuity") {
    const monthlyPayment = annuityPayment(principal, annualRate, months);
    for (let period = 1; period <= months; period += 1) {
      const interest = balance * monthlyRate;
      const principalPart = Math.min(balance, Math.max(0, monthlyPayment - interest));
      const payment = principalPart + interest;
      balance = Math.max(0, balance - principalPart);
      schedule.push({
        period,
        principal: round(principalPart),
        interest: round(interest),
        payment: round(payment),
        balance: round(balance)
      });
    }
  } else {
    const principalPartBase = months > 0 ? principal / months : 0;
    for (let period = 1; period <= months; period += 1) {
      const interest = balance * monthlyRate;
      const principalPart = Math.min(balance, principalPartBase);
      const payment = principalPart + interest;
      balance = Math.max(0, balance - principalPart);
      schedule.push({
        period,
        principal: round(principalPart),
        interest: round(interest),
        payment: round(payment),
        balance: round(balance)
      });
    }
  }

  const totalPaid = schedule.reduce((sum, row) => sum + row.payment, 0);
  return {
    schedule,
    totalPaid: round(totalPaid),
    overpayment: round(totalPaid - principal),
    firstPayment: schedule[0]?.payment ?? 0,
    lastPayment: schedule[schedule.length - 1]?.payment ?? 0
  };
}

function buildDebitCard(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const monthlySpend = toNumber(input.monthlySpend, 50_000);
  const cashbackPercent = toNumber(input.cashbackPercent, 3);
  const monthlyFee = toNumber(input.monthlyFee, 0);
  const commissions = toNumber(input.commissions, 0);

  const cashback = (monthlySpend * cashbackPercent) / 100;
  const netBenefit = cashback - monthlyFee - commissions;

  return {
    type: "debit_card",
    result: {
      monthlySpend: round(monthlySpend),
      cashback: round(cashback),
      netBenefit: round(netBenefit)
    },
    explanation:
      locale === "ru"
        ? "Net-benefit = кэшбэк - ежемесячная комиссия - дополнительные комиссии."
        : "Net benefit = cashback - monthly fee - additional commissions.",
    sensitivity: [
      {
        label: locale === "ru" ? "кэшбэк +1 п.п." : "cashback +1 pp",
        value: `${round(netBenefit + monthlySpend * 0.01)}`
      },
      {
        label: locale === "ru" ? "комиссия +20%" : "fee +20%",
        value: `${round(netBenefit - monthlyFee * 0.2)}`
      }
    ]
  };
}

function buildCreditCard(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const debt = toNumber(input.debt, 120_000);
  const annualRate = toNumber(input.annualRate, 29.9);
  const months = Math.max(1, Math.round(toNumber(input.months, 12)));
  const monthlyPayment = toNumber(input.monthlyPayment, Math.max(1, debt / months));
  const graceUsagePercent = Math.min(100, Math.max(0, toNumber(input.graceUsagePercent, 30)));

  const effectiveDebt = debt * (1 - graceUsagePercent / 100);
  const monthlyRate = annualRate / 12 / 100;
  const modeledInterest = Math.max(0, effectiveDebt * monthlyRate * months * 0.6);
  const totalCost = debt + modeledInterest;
  const requiredMonths = monthlyPayment > 0 ? Math.ceil(totalCost / monthlyPayment) : months;

  return {
    type: "credit_card",
    result: {
      debt: round(debt),
      modeledInterest: round(modeledInterest),
      totalCost: round(totalCost),
      estimatedMonths: requiredMonths
    },
    explanation:
      locale === "ru"
        ? "Модель учитывает использование льготного периода и оценивает стоимость обслуживания долга."
        : "Model combines grace-period usage with revolving debt carrying cost.",
    sensitivity: [
      {
        label: locale === "ru" ? "ставка +3 п.п." : "rate +3 pp",
        value: `${round(modeledInterest * 1.1)}`
      },
      {
        label: locale === "ru" ? "льготный период +20 п.п." : "grace usage +20 pp",
        value: `${round(modeledInterest * 0.8)}`
      }
    ]
  };
}

function buildConsumerLoan(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const principal = toNumber(input.principal, 500_000);
  const annualRate = toNumber(input.annualRate, 14.5);
  const termUnit = asTermUnit(input.termUnit);
  const termValue = toNumber(input.termValue, toNumber(input.months, 36));
  const paymentType = asPaymentType(input.paymentType);
  const months = termToMonths(termValue, termUnit);

  const model = buildLoanSchedule(principal, annualRate, months, paymentType);

  return {
    type: "consumer_loan",
    result: {
      principal: round(principal),
      termMonths: months,
      paymentType,
      firstPayment: round(model.firstPayment),
      lastPayment: round(model.lastPayment),
      totalPaid: round(model.totalPaid),
      overpayment: round(model.overpayment)
    },
    explanation:
      locale === "ru"
        ? "Расчет поддерживает аннуитетный и дифференцированный платеж, а также срок в днях/месяцах/годах."
        : "Calculation supports annuity and differentiated payments with term in days/months/years.",
    sensitivity: [
      {
        label: locale === "ru" ? "ставка -2 п.п." : "rate -2 pp",
        value: `${round(
          buildLoanSchedule(principal, Math.max(0, annualRate - 2), months, paymentType).firstPayment
        )}`
      },
      {
        label: locale === "ru" ? "срок +12 мес." : "term +12 months",
        value: `${round(
          buildLoanSchedule(principal, annualRate, months + 12, paymentType).firstPayment
        )}`
      }
    ],
    schedule: model.schedule
  };
}

function buildMortgage(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const propertyPrice = toNumber(input.propertyPrice, 8_000_000);
  const downPaymentMode = input.downPaymentMode === "amount" ? "amount" : "percent";
  const downPaymentValue = toNumber(input.downPaymentValue, toNumber(input.downPaymentPercent, 20));
  const annualRate = toNumber(input.annualRate, 13.2);
  const termUnit = asTermUnit(input.termUnit);
  const termValue = toNumber(input.termValue, toNumber(input.years, 20));
  const paymentType = asPaymentType(input.paymentType);
  const insuranceMode = String(input.insuranceMode ?? "percent");
  const insuranceRatePercent = Math.max(0, toNumber(input.insuranceRatePercent, 1));
  const insuranceYearly = Math.max(0, toNumber(input.insuranceYearly, propertyPrice * 0.01));

  const downPayment =
    downPaymentMode === "amount"
      ? Math.max(0, Math.min(propertyPrice, downPaymentValue))
      : Math.max(0, Math.min(propertyPrice, (propertyPrice * downPaymentValue) / 100));
  const principal = Math.max(0, propertyPrice - downPayment);
  const months = termToMonths(termValue, termUnit);
  const years = months / 12;
  const model = buildLoanSchedule(principal, annualRate, months, paymentType);

  let insuranceTotal = 0;
  if (insuranceMode === "fixed") {
    insuranceTotal = insuranceYearly * years;
  } else if (insuranceMode === "percent") {
    insuranceTotal = principal * (insuranceRatePercent / 100) * years;
  }

  const totalCostWithInsurance = downPayment + model.totalPaid + insuranceTotal;

  return {
    type: "mortgage",
    result: {
      propertyPrice: round(propertyPrice),
      downPayment: round(downPayment),
      principal: round(principal),
      termMonths: months,
      paymentType,
      firstPayment: round(model.firstPayment),
      lastPayment: round(model.lastPayment),
      insuranceTotal: round(insuranceTotal),
      totalCostWithInsurance: round(totalCostWithInsurance)
    },
    explanation:
      locale === "ru"
        ? "Ипотечный расчет учитывает режим платежей, единицы срока, первый взнос и сценарий страхования."
        : "Mortgage model accounts for payment mode, term units, down payment mode, and insurance scenario.",
    sensitivity: [
      {
        label: locale === "ru" ? "первый взнос +10 п.п." : "down payment +10 pp",
        value: `${round(
          buildLoanSchedule(
            Math.max(0, propertyPrice - propertyPrice * ((downPaymentValue + 10) / 100)),
            annualRate,
            months,
            paymentType
          ).firstPayment
        )}`
      },
      {
        label: locale === "ru" ? "ставка -1 п.п." : "rate -1 pp",
        value: `${round(
          buildLoanSchedule(principal, Math.max(0, annualRate - 1), months, paymentType).firstPayment
        )}`
      }
    ],
    schedule: model.schedule
  };
}

function buildDeposit(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const principal = Math.max(0, toNumber(input.principal, 200_000));
  const annualRate = Math.max(0, toNumber(input.annualRate, 10.5));
  const termUnit = asTermUnit(input.termUnit);
  const termValue = toNumber(input.termValue, toNumber(input.months, 12));
  const months = termToMonths(termValue, termUnit);
  const payoutFrequency = String(input.payoutFrequency ?? "end");
  const capitalization = toBoolean(input.capitalization, true);
  const replenishment = Math.max(0, toNumber(input.replenishment, 0));
  const partialWithdrawal = Math.max(0, toNumber(input.partialWithdrawal, 0));
  const taxMode = String(input.taxMode ?? "none");
  const taxRatePercent = Math.max(0, toNumber(input.taxRatePercent, 0));

  const monthlyRate = annualRate / 12 / 100;
  let balance = principal;
  let grossInterest = 0;
  let paidOut = 0;
  let pendingPayout = 0;
  const schedule: CalculatorResponse["schedule"] = [];

  for (let period = 1; period <= months; period += 1) {
    balance += replenishment;
    balance = Math.max(0, balance - Math.min(balance, partialWithdrawal));

    const interest = balance * monthlyRate;
    grossInterest += interest;

    if (capitalization) {
      balance += interest;
    } else {
      pendingPayout += interest;
      const payoutDue =
        payoutFrequency === "monthly" ||
        (payoutFrequency === "quarterly" && period % 3 === 0) ||
        (payoutFrequency === "end" && period === months);

      if (payoutDue) {
        paidOut += pendingPayout;
        pendingPayout = 0;
      }
    }

    schedule.push({
      period,
      principal: round(replenishment - partialWithdrawal),
      interest: round(interest),
      payment: round(capitalization ? 0 : paidOut),
      balance: round(balance)
    });
  }

  if (!capitalization && pendingPayout > 0) {
    paidOut += pendingPayout;
  }

  const taxableInterest = taxMode === "interest_tax" ? grossInterest : 0;
  const tax = (taxableInterest * taxRatePercent) / 100;
  const netIncome = grossInterest - tax;
  const finalAmount = capitalization ? balance - tax : balance + paidOut - tax;
  const effectiveAnnualYield =
    months > 0 ? ((netIncome / Math.max(principal, 1)) * 12 * 100) / months : 0;

  return {
    type: "deposit",
    result: {
      principal: round(principal),
      termMonths: months,
      grossIncome: round(grossInterest),
      paidOut: round(paidOut),
      tax: round(tax),
      netIncome: round(netIncome),
      effectiveAnnualYield: round(effectiveAnnualYield),
      finalAmount: round(finalAmount)
    },
    explanation:
      locale === "ru"
        ? "Расчет учитывает период выплат, капитализацию, пополнение, частичное снятие и налоговый режим."
        : "Deposit model accounts for payout frequency, capitalization, replenishment, partial withdrawal, and tax mode.",
    sensitivity: [
      {
        label: locale === "ru" ? "ставка +1 п.п." : "rate +1 pp",
        value: `${round(principal * ((annualRate + 1) / 100) * (months / 12))}`
      },
      {
        label: locale === "ru" ? "срок +6 мес." : "term +6 months",
        value: `${round(principal * (annualRate / 100) * ((months + 6) / 12))}`
      }
    ],
    schedule
  };
}

function buildInvestment(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const principal = toNumber(input.principal, 300_000);
  const years = Math.max(1, Math.round(toNumber(input.years, 3)));
  const expectedReturn = toNumber(input.expectedReturn, 12);
  const volatility = Math.max(0, toNumber(input.volatility, 18));

  const base = principal * Math.pow(1 + expectedReturn / 100, years);
  const low = principal * Math.pow(1 + Math.max(-50, expectedReturn - volatility) / 100, years);
  const high = principal * Math.pow(1 + (expectedReturn + volatility) / 100, years);

  return {
    type: "investment",
    result: {
      principal: round(principal),
      lowScenario: round(low),
      baseScenario: round(base),
      highScenario: round(high)
    },
    explanation:
      locale === "ru"
        ? "Сценарная модель: базовая доходность и диапазон волатильности. Не является гарантией."
        : "Scenario model with expected return and volatility band. Not a guarantee.",
    sensitivity: [
      {
        label: locale === "ru" ? "доходность -3 п.п." : "return -3 pp",
        value: `${round(principal * Math.pow(1 + (expectedReturn - 3) / 100, years))}`
      },
      {
        label: locale === "ru" ? "волатильность +5 п.п." : "volatility +5 pp",
        value: `${round(principal * Math.pow(1 + (expectedReturn - (volatility + 5)) / 100, years))}`
      }
    ]
  };
}

function buildBusiness(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const onboardingCost = toNumber(input.onboardingCost, 25_000);
  const monthlyMaintenance = toNumber(input.monthlyMaintenance, 7_000);
  const months = Math.max(1, Math.round(toNumber(input.months, 12)));
  const complianceRiskPercent = Math.max(0, Math.min(100, toNumber(input.complianceRiskPercent, 15)));

  const directCost = onboardingCost + monthlyMaintenance * months;
  const riskReserve = (directCost * complianceRiskPercent) / 100;
  const total = directCost + riskReserve;

  return {
    type: "business",
    result: {
      onboardingCost: round(onboardingCost),
      maintenanceCost: round(monthlyMaintenance * months),
      riskReserve: round(riskReserve),
      totalCost: round(total)
    },
    explanation:
      locale === "ru"
        ? "Оценка включает стартовые расходы, обслуживание и резерв на комплаенс-риск."
        : "Estimate includes onboarding, maintenance, and compliance risk reserve.",
    sensitivity: [
      {
        label: locale === "ru" ? "срок +3 мес." : "timeline +3 months",
        value: `${round(onboardingCost + monthlyMaintenance * (months + 3) + riskReserve)}`
      },
      {
        label: locale === "ru" ? "риск -5 п.п." : "risk -5 pp",
        value: `${round(directCost + (directCost * Math.max(0, complianceRiskPercent - 5)) / 100)}`
      }
    ]
  };
}

function buildDocuments(input: CalculatorInput, locale: CalcLocale): CalculatorResponse {
  const documentsCount = Math.max(1, Math.round(toNumber(input.documentsCount, 8)));
  const avgPrepHours = Math.max(0.25, toNumber(input.avgPrepHours, 1.5));
  const hourlyCost = Math.max(0, toNumber(input.hourlyCost, 2000));
  const rejectionRiskPercent = Math.min(100, Math.max(0, toNumber(input.rejectionRiskPercent, 20)));

  const prepCost = documentsCount * avgPrepHours * hourlyCost;
  const expectedRework = prepCost * (rejectionRiskPercent / 100) * 0.4;
  const total = prepCost + expectedRework;
  const timelineDays = Math.ceil((documentsCount * avgPrepHours) / 4);

  return {
    type: "documents",
    result: {
      documentsCount,
      prepCost: round(prepCost),
      expectedRework: round(expectedRework),
      totalCost: round(total),
      timelineDays
    },
    explanation:
      locale === "ru"
        ? "Модель оценивает стоимость подготовки, риск доработок и ожидаемый срок обработки."
        : "Model estimates prep cost, rework risk, and expected processing timeline.",
    sensitivity: [
      {
        label: locale === "ru" ? "риск -10 п.п." : "risk -10 pp",
        value: `${round(prepCost + prepCost * (Math.max(0, rejectionRiskPercent - 10) / 100) * 0.4)}`
      },
      {
        label: locale === "ru" ? "документы +3" : "documents +3",
        value: `${round((documentsCount + 3) * avgPrepHours * hourlyCost)}`
      }
    ]
  };
}

export function runCalculator(
  type: CalculatorType,
  input: CalculatorInput,
  locale = "ru"
): CalculatorResponse {
  const language = resolveLocale(locale);
  if (type === "debit_card") return buildDebitCard(input, language);
  if (type === "credit_card") return buildCreditCard(input, language);
  if (type === "consumer_loan") return buildConsumerLoan(input, language);
  if (type === "mortgage") return buildMortgage(input, language);
  if (type === "deposit") return buildDeposit(input, language);
  if (type === "investment") return buildInvestment(input, language);
  if (type === "business") return buildBusiness(input, language);
  return buildDocuments(input, language);
}
