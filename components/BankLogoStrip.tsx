"use client";

import { useEffect, useMemo, useState } from "react";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";

interface BankLogoItem {
  id: string;
  name: string;
}

interface BanksResponse {
  banks: Array<{
    id: string;
    name: string;
  }>;
}

export function BankLogoStrip() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const [items, setItems] = useState<BankLogoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`/api/banks?country=${country}&lang=${locale}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error("failed");
        }
        const payload = (await response.json()) as BanksResponse;
        if (!cancelled) {
          setItems(
            (payload.banks ?? []).map((bank) => ({
              id: bank.id,
              name: bank.name
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [country, locale]);

  const track = useMemo(() => {
    const source = items.slice(0, 32);
    if (source.length === 0) return [];
    return [...source, ...source];
  }, [items]);

  if (track.length === 0) {
    if (!loading) {
      return null;
    }
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="glass-card shimmer h-16 rounded-2xl border border-slate-200" />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="glass-card overflow-hidden rounded-2xl border border-slate-200 px-3 py-3">
        <div
          className="logo-strip-track flex items-center gap-3 whitespace-nowrap"
          style={{ animationDuration: `${Math.max(24, items.length * 1.6)}s` }}
        >
          {track.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="inline-flex h-11 min-w-[180px] items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm">🏦</span>
              <span className="truncate text-xs font-medium text-slate-700">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
