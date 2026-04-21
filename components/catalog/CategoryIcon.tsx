"use client";

import {
  BriefcaseBusiness,
  Building,
  CreditCard,
  FileText,
  HandCoins,
  PiggyBank,
  WalletCards
} from "lucide-react";
import { CategoryConfig } from "@/data/catalog";

interface CategoryIconProps {
  icon: CategoryConfig["icon"];
  className?: string;
  size?: number;
}

export function CategoryIcon({ icon, className, size = 18 }: CategoryIconProps) {
  if (icon === "debit") return <WalletCards className={className} size={size} />;
  if (icon === "credit") return <CreditCard className={className} size={size} />;
  if (icon === "loan") return <HandCoins className={className} size={size} />;
  if (icon === "mortgage") return <Building className={className} size={size} />;
  if (icon === "deposit") return <PiggyBank className={className} size={size} />;
  if (icon === "business") return <BriefcaseBusiness className={className} size={size} />;
  return <FileText className={className} size={size} />;
}
