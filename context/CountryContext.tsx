"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { COUNTRIES_BY_VALUE, detectCountryFromLocale } from "@/data/countries";
import { Country } from "@/lib/types";

interface CountryContextValue {
  country: Country;
  setCountry: Dispatch<SetStateAction<Country>>;
}

const STORAGE_KEY = "bankyour-country";
const CountryContext = createContext<CountryContextValue | null>(null);

interface CountryProviderProps {
  children: ReactNode;
  initialCountry?: Country;
}

function setCountryCookie(country: Country) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `bankyour-country=${country}; path=/; max-age=31536000; samesite=lax`;
}

export function CountryProvider({ children, initialCountry }: CountryProviderProps) {
  const [country, setCountry] = useState<Country>(initialCountry ?? "russia");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedCountry = window.localStorage.getItem(STORAGE_KEY);
    if (savedCountry && savedCountry in COUNTRIES_BY_VALUE) {
      const next = savedCountry as Country;
      setCountry(next);
      setCountryCookie(next);
      return;
    }

    const detected = initialCountry ?? detectCountryFromLocale();
    setCountry(detected);
    setCountryCookie(detected);
  }, [initialCountry]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, country);
    setCountryCookie(country);
  }, [country]);

  const value = useMemo(
    () => ({
      country,
      setCountry
    }),
    [country]
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  const context = useContext(CountryContext);

  if (!context) {
    throw new Error("useCountry must be used within CountryProvider");
  }

  return context;
}

export function useCountryMeta() {
  const { country } = useCountry();
  return COUNTRIES_BY_VALUE[country];
}
