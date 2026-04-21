import { NextRequest, NextResponse } from "next/server";
import { getBanksSnapshot, getServicesResponse } from "@/lib/catalog/snapshotStore";
import { Country, BusinessBankItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

function asCountry(input: string | null): Country {
  if (!input) return "russia";
  return COUNTRIES.includes(input as Country) ? (input as Country) : "russia";
}

const SERVICE_TEXT_MAP: Record<BusinessBankItem["services"][number], string[]> = {
  rko: ["рко", "settlement", "account", "расчет"],
  acquiring: ["acquiring", "эквайр"],
  guarantees: ["guarantee", "гарант"],
  leasing: ["leasing", "лизинг"],
  ved: ["trade", "вэд", "валют", "foreign"],
  business_loans: ["business loan", "кредит для бизнеса", "финансирован"],
  business_deposits: ["business deposit", "вклад для бизнеса", "депозит"]
};

function inferServices(input: string): BusinessBankItem["services"] {
  const lower = input.toLowerCase();
  const output = new Set<BusinessBankItem["services"][number]>();
  (Object.keys(SERVICE_TEXT_MAP) as Array<BusinessBankItem["services"][number]>).forEach((key) => {
    if (SERVICE_TEXT_MAP[key].some((token) => lower.includes(token))) {
      output.add(key);
    }
  });
  return Array.from(output);
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = asCountry(params.get("country"));
    const serviceFilter = (params.get("service") ?? "").trim().toLowerCase();
    const q = (params.get("q") ?? "").trim().toLowerCase();

    const [banksSnapshot, services] = await Promise.all([
      getBanksSnapshot(country),
      getServicesResponse(country, "ru")
    ]);

    const byBankBusinessText = new Map<string, string>();
    services.offers.business.forEach((offer) => {
      const key = offer.providerName.toLowerCase();
      const current = byBankBusinessText.get(key) ?? "";
      byBankBusinessText.set(
        key,
        `${current} ${offer.name} ${offer.description} ${offer.params.map((item) => `${item.label} ${item.value}`).join(" ")}`
      );
    });

    const items: BusinessBankItem[] = banksSnapshot.banks.map((bank) => {
      const text = `${bank.name} ${bank.website} ${byBankBusinessText.get(bank.name.toLowerCase()) ?? ""}`;
      const inferred = inferServices(text);
      const servicesList =
        inferred.length > 0
          ? inferred
          : (["rko", "acquiring", "business_loans"] as BusinessBankItem["services"]);
      return {
        bankId: bank.id,
        name: bank.name,
        country,
        website: bank.website,
        logoUrl: bank.logoUrl,
        services: servicesList,
        priorityTags: [
          bank.registryStatus ?? "unknown",
          bank.coverageStatus,
          bank.productsCount > 0 ? "has_offers" : "data_pending"
        ]
      };
    });

    const filtered = items.filter((item) => {
      const serviceOk = serviceFilter ? item.services.includes(serviceFilter as BusinessBankItem["services"][number]) : true;
      const qOk = q
        ? `${item.name} ${item.website} ${item.services.join(" ")} ${item.priorityTags.join(" ")}`.toLowerCase().includes(q)
        : true;
      return serviceOk && qOk;
    });

    return NextResponse.json({
      country,
      total: filtered.length,
      items: filtered
    });
  } catch (error) {
    console.error("Business banks API error", error);
    return NextResponse.json({ error: "Failed to load business banks" }, { status: 500 });
  }
}
