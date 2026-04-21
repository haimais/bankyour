import { NextResponse } from "next/server";
import { COUNTRY_OPTIONS } from "@/data/countries";
import { getAllCountrySnapshots } from "@/lib/catalog/snapshotStore";
import { CoverageReportResponse, ProductCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const STALE_MS = 120_000;

const ALL_CATEGORIES: ProductCategory[] = [
  "debit_cards",
  "credit_cards",
  "consumer_loans",
  "mortgages",
  "deposits",
  "investments",
  "business_services",
  "document_assistance"
];

export async function GET() {
  try {
    const snapshots = await getAllCountrySnapshots();
    const countries = COUNTRY_OPTIONS.map((option) => {
      const snapshot = snapshots.byCountry[option.value];
      const ageMs = Date.now() - new Date(snapshot.updatedAt).getTime();
      const stale = !Number.isFinite(ageMs) || ageMs > STALE_MS;

      const sources = {
        sravni: snapshot.products.filter((item) => item.source === "sravni").length,
        bankSite: snapshot.products.filter((item) => item.source === "bank_site").length,
        fallback: snapshot.products.filter((item) => item.source === "registry_fallback").length
      };

      const coverage = {
        full: snapshot.banks.filter((bank) => bank.coverageStatus === "full").length,
        partial: snapshot.banks.filter((bank) => bank.coverageStatus === "partial").length,
        registryOnly: snapshot.banks.filter((bank) => bank.coverageStatus === "registry_only").length
      };

      const categories = ALL_CATEGORIES.reduce((acc, category) => {
        const count = snapshot.products.filter((item) => item.category === category).length;
        if (count > 0) {
          acc[category] = count;
        }
        return acc;
      }, {} as Partial<Record<ProductCategory, number>>);

      return {
        country: option.value,
        snapshotId: snapshot.snapshotId,
        updatedAt: snapshot.updatedAt,
        stale,
        banksTotal: snapshot.banks.length,
        banksCovered: snapshot.banks.filter((bank) => bank.coverageStatus !== "registry_only").length,
        coverage,
        sources,
        categories,
        productsTotal: snapshot.products.length
      };
    });

    const response: CoverageReportResponse = {
      currentSnapshotId: snapshots.currentSnapshotId,
      generatedAt: new Date().toISOString(),
      countries
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Coverage report API error", error);
    return NextResponse.json({ error: "Failed to build coverage report" }, { status: 500 });
  }
}
