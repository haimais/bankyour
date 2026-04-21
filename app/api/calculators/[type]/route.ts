import { NextRequest, NextResponse } from "next/server";
import { runCalculator } from "@/lib/calculators/runCalculator";
import { translateText } from "@/lib/news/articleTools";
import { CalculatorType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPES: CalculatorType[] = [
  "debit_card",
  "credit_card",
  "consumer_loan",
  "mortgage",
  "deposit",
  "business",
  "documents"
];

function asType(value: string): CalculatorType | null {
  if (value === "investment") {
    return "deposit";
  }
  if (TYPES.includes(value as CalculatorType)) {
    return value as CalculatorType;
  }
  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: { type: string } }
) {
  try {
    const type = asType(context.params.type);
    if (!type) {
      return NextResponse.json({ error: "Unsupported calculator type" }, { status: 400 });
    }

    const rawBody = await request.text();
    const parsedBody = rawBody.trim().length > 0 ? (JSON.parse(rawBody) as unknown) : {};
    const body =
      typeof parsedBody === "object" && parsedBody !== null
        ? (parsedBody as Record<string, number | string | boolean | null | undefined>)
        : {};
    const localeInput = typeof body.locale === "string" ? body.locale : request.nextUrl.searchParams.get("lang");
    const locale = localeInput ?? "ru";
    const result = runCalculator(type, body, locale);

    if (locale !== "ru" && locale !== "en") {
      result.explanation = await translateText(result.explanation, locale as "hy" | "be" | "kk" | "ka" | "az" | "ar" | "tr");
      result.sensitivity = await Promise.all(
        result.sensitivity.map(async (item) => ({
          ...item,
          label: await translateText(item.label, locale as "hy" | "be" | "kk" | "ka" | "az" | "ar" | "tr")
        }))
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Calculator API error", error);
    return NextResponse.json({ error: "Failed to run calculator" }, { status: 500 });
  }
}
