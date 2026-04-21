import { notFound, redirect } from "next/navigation";
import { CalculatorForm } from "@/components/calculators/CalculatorForm";
import { CalculatorType } from "@/lib/types";

const TYPES: CalculatorType[] = [
  "debit_card",
  "credit_card",
  "consumer_loan",
  "mortgage",
  "deposit",
  "business",
  "documents"
];

export default function CalculatorPage({
  params
}: {
  params: { type: string };
}) {
  if (params.type === "investment") {
    redirect("/calculators/deposit");
  }

  const type = params.type as CalculatorType;
  if (!TYPES.includes(type)) {
    notFound();
  }

  return <CalculatorForm type={type} />;
}
