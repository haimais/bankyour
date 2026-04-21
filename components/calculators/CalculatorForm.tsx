"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { RetryButton } from "@/components/common/RetryButton";
import { useLocale } from "@/context/LocaleContext";
import { UI_TEXT } from "@/data/i18n";
import { CalculatorResponse, CalculatorType, Locale } from "@/lib/types";

type FieldKind = "number" | "select" | "checkbox";

interface OptionConfig {
  value: string;
  labelKey: string;
}

interface FieldConfig {
  key: string;
  kind: FieldKind;
  labelKey: string;
  placeholder?: string;
  step?: string;
  options?: OptionConfig[];
  defaultValue?: string | boolean;
}

const CALC_I18N: Record<Locale, Record<string, string>> = {
  ru: {
    fillInputs: "Заполните параметры и выполните расчет.",
    sensitivity: "Чувствительность",
    schedule: "График платежей",
    period: "Период",
    payment: "Платеж",
    interest: "Проценты",
    principalPart: "Основной долг",
    balance: "Остаток",
    monthlySpend: "Траты в месяц",
    cashbackPercent: "Кэшбэк, %",
    monthlyFee: "Комиссия в месяц",
    commissions: "Прочие комиссии",
    debt: "Сумма долга",
    annualRate: "Ставка, % годовых",
    months: "Срок, месяцев",
    monthlyPayment: "Платеж в месяц",
    graceUsagePercent: "Использование льготного периода, %",
    principal: "Сумма",
    termValue: "Срок",
    termUnit: "Единица срока",
    paymentType: "Тип платежа",
    propertyPrice: "Стоимость недвижимости",
    downPaymentValue: "Первый взнос",
    downPaymentMode: "Формат первого взноса",
    insuranceMode: "Страхование",
    insuranceRatePercent: "Страхование, % в год",
    insuranceYearly: "Страхование, сумма в год",
    payoutFrequency: "Выплата процентов",
    capitalization: "Капитализация процентов",
    replenishment: "Пополнение в месяц",
    partialWithdrawal: "Частичное снятие в месяц",
    taxMode: "Налоговый режим",
    taxRatePercent: "Налог, %",
    expectedReturn: "Ожидаемая доходность, %",
    volatility: "Волатильность, %",
    years: "Горизонт, лет",
    onboardingCost: "Стоимость подключения",
    monthlyMaintenance: "Ежемесячное обслуживание",
    complianceRiskPercent: "Комплаенс-риск, %",
    documentsCount: "Количество документов",
    avgPrepHours: "Часы на документ",
    hourlyCost: "Стоимость часа",
    rejectionRiskPercent: "Риск отказа, %",
    days: "Дни",
    monthsUnit: "Месяцы",
    yearsUnit: "Годы",
    annuity: "Аннуитетный",
    differentiated: "Дифференцированный",
    percent: "Проценты",
    amount: "Сумма",
    none: "Без страхования",
    fixed: "Фиксированная сумма",
    end: "В конце срока",
    monthly: "Ежемесячно",
    quarterly: "Ежеквартально",
    interest_tax: "Налог на проценты",
    yes: "Да",
    no: "Нет",
    requestFailed: "Не удалось выполнить расчет. Проверьте данные и попробуйте снова.",
    retry: "Повторить"
  },
  en: {
    fillInputs: "Fill inputs and run calculation.",
    sensitivity: "Sensitivity",
    schedule: "Payment schedule",
    period: "Period",
    payment: "Payment",
    interest: "Interest",
    principalPart: "Principal",
    balance: "Balance",
    monthlySpend: "Monthly spend",
    cashbackPercent: "Cashback, %",
    monthlyFee: "Monthly fee",
    commissions: "Other commissions",
    debt: "Debt amount",
    annualRate: "Annual rate, %",
    months: "Term, months",
    monthlyPayment: "Monthly payment",
    graceUsagePercent: "Grace period usage, %",
    principal: "Amount",
    termValue: "Term value",
    termUnit: "Term unit",
    paymentType: "Payment type",
    propertyPrice: "Property price",
    downPaymentValue: "Down payment",
    downPaymentMode: "Down payment mode",
    insuranceMode: "Insurance mode",
    insuranceRatePercent: "Insurance rate, % yearly",
    insuranceYearly: "Insurance fixed yearly",
    payoutFrequency: "Interest payout",
    capitalization: "Interest capitalization",
    replenishment: "Monthly replenishment",
    partialWithdrawal: "Monthly withdrawal",
    taxMode: "Tax mode",
    taxRatePercent: "Tax rate, %",
    expectedReturn: "Expected return, %",
    volatility: "Volatility, %",
    years: "Horizon, years",
    onboardingCost: "Onboarding cost",
    monthlyMaintenance: "Monthly maintenance",
    complianceRiskPercent: "Compliance risk, %",
    documentsCount: "Documents count",
    avgPrepHours: "Hours per document",
    hourlyCost: "Hourly cost",
    rejectionRiskPercent: "Rejection risk, %",
    days: "Days",
    monthsUnit: "Months",
    yearsUnit: "Years",
    annuity: "Annuity",
    differentiated: "Differentiated",
    percent: "Percent",
    amount: "Amount",
    none: "No insurance",
    fixed: "Fixed yearly",
    end: "At maturity",
    monthly: "Monthly",
    quarterly: "Quarterly",
    interest_tax: "Tax on interest",
    yes: "Yes",
    no: "No",
    requestFailed: "Could not run calculation. Check inputs and try again.",
    retry: "Retry"
  },
  hy: {},
  be: {},
  kk: {},
  ka: {},
  az: {},
  ar: {},
  tr: {}
};

function t(locale: Locale, key: string): string {
  return CALC_I18N[locale][key] ?? CALC_I18N.en[key] ?? key;
}

function typeTitle(type: CalculatorType, copy: typeof UI_TEXT.en): string {
  if (type === "debit_card") return copy.calculatorDebitCard;
  if (type === "credit_card") return copy.calculatorCreditCard;
  if (type === "consumer_loan") return copy.calculatorCredit;
  if (type === "mortgage") return copy.calculatorMortgage;
  if (type === "deposit") return copy.calculatorDeposit;
  if (type === "investment") return copy.calculatorInvestments;
  if (type === "business") return copy.calculatorBusiness;
  return copy.calculatorDocuments;
}

function fieldConfigs(type: CalculatorType): FieldConfig[] {
  if (type === "debit_card") {
    return [
      { key: "monthlySpend", kind: "number", labelKey: "monthlySpend", placeholder: "50000" },
      { key: "cashbackPercent", kind: "number", labelKey: "cashbackPercent", placeholder: "5", step: "0.1" },
      { key: "monthlyFee", kind: "number", labelKey: "monthlyFee", placeholder: "0" },
      { key: "commissions", kind: "number", labelKey: "commissions", placeholder: "0" }
    ];
  }

  if (type === "credit_card") {
    return [
      { key: "debt", kind: "number", labelKey: "debt", placeholder: "120000" },
      { key: "annualRate", kind: "number", labelKey: "annualRate", placeholder: "29.9", step: "0.1" },
      { key: "months", kind: "number", labelKey: "months", placeholder: "12" },
      { key: "monthlyPayment", kind: "number", labelKey: "monthlyPayment", placeholder: "12000" },
      { key: "graceUsagePercent", kind: "number", labelKey: "graceUsagePercent", placeholder: "30", step: "0.1" }
    ];
  }

  if (type === "consumer_loan") {
    return [
      { key: "principal", kind: "number", labelKey: "principal", placeholder: "500000" },
      { key: "annualRate", kind: "number", labelKey: "annualRate", placeholder: "14.5", step: "0.1" },
      { key: "termValue", kind: "number", labelKey: "termValue", placeholder: "36" },
      {
        key: "termUnit",
        kind: "select",
        labelKey: "termUnit",
        defaultValue: "months",
        options: [
          { value: "days", labelKey: "days" },
          { value: "months", labelKey: "monthsUnit" },
          { value: "years", labelKey: "yearsUnit" }
        ]
      },
      {
        key: "paymentType",
        kind: "select",
        labelKey: "paymentType",
        defaultValue: "annuity",
        options: [
          { value: "annuity", labelKey: "annuity" },
          { value: "differentiated", labelKey: "differentiated" }
        ]
      }
    ];
  }

  if (type === "mortgage") {
    return [
      { key: "propertyPrice", kind: "number", labelKey: "propertyPrice", placeholder: "8000000" },
      { key: "downPaymentValue", kind: "number", labelKey: "downPaymentValue", placeholder: "20" },
      {
        key: "downPaymentMode",
        kind: "select",
        labelKey: "downPaymentMode",
        defaultValue: "percent",
        options: [
          { value: "percent", labelKey: "percent" },
          { value: "amount", labelKey: "amount" }
        ]
      },
      { key: "annualRate", kind: "number", labelKey: "annualRate", placeholder: "13.2", step: "0.1" },
      { key: "termValue", kind: "number", labelKey: "termValue", placeholder: "20" },
      {
        key: "termUnit",
        kind: "select",
        labelKey: "termUnit",
        defaultValue: "years",
        options: [
          { value: "days", labelKey: "days" },
          { value: "months", labelKey: "monthsUnit" },
          { value: "years", labelKey: "yearsUnit" }
        ]
      },
      {
        key: "paymentType",
        kind: "select",
        labelKey: "paymentType",
        defaultValue: "annuity",
        options: [
          { value: "annuity", labelKey: "annuity" },
          { value: "differentiated", labelKey: "differentiated" }
        ]
      },
      {
        key: "insuranceMode",
        kind: "select",
        labelKey: "insuranceMode",
        defaultValue: "percent",
        options: [
          { value: "none", labelKey: "none" },
          { value: "percent", labelKey: "percent" },
          { value: "fixed", labelKey: "fixed" }
        ]
      },
      { key: "insuranceRatePercent", kind: "number", labelKey: "insuranceRatePercent", placeholder: "1", step: "0.1" },
      { key: "insuranceYearly", kind: "number", labelKey: "insuranceYearly", placeholder: "80000" }
    ];
  }

  if (type === "deposit") {
    return [
      { key: "principal", kind: "number", labelKey: "principal", placeholder: "200000" },
      { key: "annualRate", kind: "number", labelKey: "annualRate", placeholder: "10.5", step: "0.1" },
      { key: "termValue", kind: "number", labelKey: "termValue", placeholder: "12" },
      {
        key: "termUnit",
        kind: "select",
        labelKey: "termUnit",
        defaultValue: "months",
        options: [
          { value: "days", labelKey: "days" },
          { value: "months", labelKey: "monthsUnit" },
          { value: "years", labelKey: "yearsUnit" }
        ]
      },
      {
        key: "payoutFrequency",
        kind: "select",
        labelKey: "payoutFrequency",
        defaultValue: "end",
        options: [
          { value: "end", labelKey: "end" },
          { value: "monthly", labelKey: "monthly" },
          { value: "quarterly", labelKey: "quarterly" }
        ]
      },
      { key: "capitalization", kind: "checkbox", labelKey: "capitalization", defaultValue: true },
      { key: "replenishment", kind: "number", labelKey: "replenishment", placeholder: "0" },
      { key: "partialWithdrawal", kind: "number", labelKey: "partialWithdrawal", placeholder: "0" },
      {
        key: "taxMode",
        kind: "select",
        labelKey: "taxMode",
        defaultValue: "none",
        options: [
          { value: "none", labelKey: "none" },
          { value: "interest_tax", labelKey: "interest_tax" }
        ]
      },
      { key: "taxRatePercent", kind: "number", labelKey: "taxRatePercent", placeholder: "0", step: "0.1" }
    ];
  }

  if (type === "investment") {
    return [
      { key: "principal", kind: "number", labelKey: "principal", placeholder: "300000" },
      { key: "expectedReturn", kind: "number", labelKey: "expectedReturn", placeholder: "12", step: "0.1" },
      { key: "volatility", kind: "number", labelKey: "volatility", placeholder: "18", step: "0.1" },
      { key: "years", kind: "number", labelKey: "years", placeholder: "3" }
    ];
  }

  if (type === "business") {
    return [
      { key: "onboardingCost", kind: "number", labelKey: "onboardingCost", placeholder: "25000" },
      { key: "monthlyMaintenance", kind: "number", labelKey: "monthlyMaintenance", placeholder: "7000" },
      { key: "months", kind: "number", labelKey: "months", placeholder: "12" },
      { key: "complianceRiskPercent", kind: "number", labelKey: "complianceRiskPercent", placeholder: "15", step: "0.1" }
    ];
  }

  return [
    { key: "documentsCount", kind: "number", labelKey: "documentsCount", placeholder: "8" },
    { key: "avgPrepHours", kind: "number", labelKey: "avgPrepHours", placeholder: "1.5", step: "0.1" },
    { key: "hourlyCost", kind: "number", labelKey: "hourlyCost", placeholder: "2000" },
    { key: "rejectionRiskPercent", kind: "number", labelKey: "rejectionRiskPercent", placeholder: "20", step: "0.1" }
  ];
}

function initialValues(fields: FieldConfig[]): Record<string, string | boolean> {
  const next: Record<string, string | boolean> = {};
  fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      next[field.key] = field.defaultValue;
    } else if (field.kind === "checkbox") {
      next[field.key] = false;
    } else {
      next[field.key] = "";
    }
  });
  return next;
}

const RESULT_KEYS: Record<string, string> = {
  monthlySpend: "monthlySpend",
  cashback: "cashbackPercent",
  netBenefit: "serviceSummaryTitle",
  debt: "debt",
  modeledInterest: "interest",
  totalCost: "serviceSummaryTitle",
  estimatedMonths: "months",
  principal: "principal",
  termMonths: "months",
  paymentType: "paymentType",
  firstPayment: "payment",
  lastPayment: "payment",
  totalPaid: "serviceSummaryTitle",
  overpayment: "interest",
  propertyPrice: "propertyPrice",
  downPayment: "downPaymentValue",
  insuranceTotal: "insuranceMode",
  totalCostWithInsurance: "serviceSummaryTitle",
  grossIncome: "interest",
  paidOut: "payment",
  tax: "taxRatePercent",
  netIncome: "serviceSummaryTitle",
  effectiveAnnualYield: "expectedReturn",
  finalAmount: "serviceSummaryTitle",
  lowScenario: "volatility",
  baseScenario: "expectedReturn",
  highScenario: "expectedReturn",
  onboardingCost: "onboardingCost",
  maintenanceCost: "monthlyMaintenance",
  riskReserve: "complianceRiskPercent",
  documentsCount: "documentsCount",
  prepCost: "hourlyCost",
  expectedRework: "rejectionRiskPercent",
  timelineDays: "termValue"
};

interface CalculatorFormProps {
  type: CalculatorType;
}

export function CalculatorForm({ type }: CalculatorFormProps) {
  const { locale } = useLocale();
  const copy = UI_TEXT[locale];
  const [result, setResult] = useState<CalculatorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dynamicTerms, setDynamicTerms] = useState<Record<string, string>>({});

  const fields = useMemo(() => fieldConfigs(type), [type]);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => initialValues(fields));

  useEffect(() => {
    setValues(initialValues(fields));
    setResult(null);
    setSubmitError(null);
  }, [fields]);

  useEffect(() => {
    if (locale === "ru" || locale === "en") {
      setDynamicTerms({});
      return;
    }

    let cancelled = false;

    async function loadTerms() {
      try {
        const enEntries = Object.entries(CALC_I18N.en);
        const uniqueTerms = Array.from(new Set(enEntries.map(([, value]) => value)));
        const response = await fetch("/api/i18n/terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lang: locale,
            terms: uniqueTerms
          })
        });
        if (!response.ok) {
          throw new Error("Terms translation failed");
        }
        const payload = (await response.json()) as { translations?: Record<string, string> };
        const translatedByKey: Record<string, string> = {};
        enEntries.forEach(([key, enValue]) => {
          translatedByKey[key] = payload.translations?.[enValue] ?? enValue;
        });
        if (!cancelled) {
          setDynamicTerms(translatedByKey);
        }
      } catch {
        if (!cancelled) {
          setDynamicTerms({});
        }
      }
    }

    void loadTerms();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const label = (key: string) => {
    if (locale === "ru" || locale === "en") {
      return t(locale, key);
    }
    return dynamicTerms[key] ?? CALC_I18N.en[key] ?? key;
  };

  async function runCalculation() {
    setLoading(true);
    setSubmitError(null);
    try {
      const payload: Record<string, string | boolean> = { locale };
      fields.forEach((field) => {
        payload[field.key] = values[field.key];
      });

      const response = await fetch(`/api/calculators/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("Calculator API error");
      }
      const data = (await response.json()) as CalculatorResponse;
      setResult(data);
    } catch {
      setResult(null);
      setSubmitError(label("requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runCalculation();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-3xl font-semibold text-slate-900">{typeTitle(type, copy)}</h1>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">{label(field.labelKey)}</span>
              {field.kind === "number" ? (
                <input
                  type="number"
                  step={field.step ?? "any"}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: event.target.value
                    }))
                  }
                  placeholder={field.placeholder}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
              ) : null}

              {field.kind === "select" ? (
                <select
                  value={String(values[field.key] ?? field.options?.[0]?.value ?? "")}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: event.target.value
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {label(option.labelKey)}
                    </option>
                  ))}
                </select>
              ) : null}

              {field.kind === "checkbox" ? (
                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3">
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.key])}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: event.target.checked
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">
                    {Boolean(values[field.key]) ? label("yes") : label("no")}
                  </span>
                </div>
              ) : null}
            </label>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? copy.loadingOffers : copy.checkRate}
          </button>

          {submitError ? (
            <div className="space-y-2">
              <ActionErrorBanner message={submitError} />
              <RetryButton label={label("retry")} onClick={() => void runCalculation()} disabled={loading} />
            </div>
          ) : null}
        </form>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-xl font-semibold text-slate-900">{copy.serviceSummaryTitle}</h2>
          {!result ? (
            <p className="mt-3 text-sm text-slate-600">{label("fillInputs")}</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {Object.entries(result.result).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">{label(RESULT_KEYS[key] ?? key)}</span>
                  <span className="font-semibold text-slate-900">{String(value)}</span>
                </div>
              ))}
              <p className="rounded-lg border border-blue-100 bg-blue-50 p-3">{result.explanation}</p>
              <div className="space-y-1">
                <p className="font-medium text-slate-800">{label("sensitivity")}</p>
                {result.sensitivity.map((item) => (
                  <p key={item.label}>
                    {item.label}: <span className="font-semibold text-slate-900">{item.value}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>

      {result?.schedule && result.schedule.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">{label("schedule")}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2">{label("period")}</th>
                  <th className="px-2 py-2">{label("payment")}</th>
                  <th className="px-2 py-2">{label("interest")}</th>
                  <th className="px-2 py-2">{label("principalPart")}</th>
                  <th className="px-2 py-2">{label("balance")}</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.slice(0, 120).map((row) => (
                  <tr key={`${row.period}-${row.balance}`} className="border-b border-slate-100">
                    <td className="px-2 py-1.5">{row.period}</td>
                    <td className="px-2 py-1.5">{row.payment}</td>
                    <td className="px-2 py-1.5">{row.interest}</td>
                    <td className="px-2 py-1.5">{row.principal}</td>
                    <td className="px-2 py-1.5">{row.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
