import { ProductCategory } from "@/lib/types";

export interface CategoryConfig {
  key: ProductCategory;
  anchor: string;
  icon: "debit" | "credit" | "loan" | "mortgage" | "deposit" | "business" | "docs";
  illustration: string;
}

export const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "debit_cards",
    anchor: "debit-cards",
    icon: "debit",
    illustration: "/illustrations/services/debit-cards.svg"
  },
  {
    key: "credit_cards",
    anchor: "credit-cards",
    icon: "credit",
    illustration: "/illustrations/services/credit-cards.svg"
  },
  {
    key: "consumer_loans",
    anchor: "consumer-loans",
    icon: "loan",
    illustration: "/illustrations/services/consumer-loans.svg"
  },
  {
    key: "mortgages",
    anchor: "mortgages",
    icon: "mortgage",
    illustration: "/illustrations/services/mortgages.svg"
  },
  {
    key: "deposits",
    anchor: "deposits",
    icon: "deposit",
    illustration: "/illustrations/services/deposits.svg"
  },
  {
    key: "business_services",
    anchor: "business-services",
    icon: "business",
    illustration: "/illustrations/services/business-services.svg"
  },
  {
    key: "document_assistance",
    anchor: "document-assistance",
    icon: "docs",
    illustration: "/illustrations/services/document-assistance.svg"
  }
];
