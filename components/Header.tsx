"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CountrySelector } from "@/components/CountrySelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SearchWidgetModal } from "@/components/SearchWidgetModal";
import { useCountry } from "@/context/CountryContext";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { UI_TEXT } from "@/data/i18n";

const NAV_ITEMS = [
  { key: "navServices", href: "/services" },
  { key: "navNews", href: "/news" },
  { key: "navAcademy", href: "/academy" },
  { key: "navCalculators", href: "/calculators" },
  { key: "navBusiness", href: "/business" },
  { key: "navAbout", href: "/about" },
  { key: "navContact", href: "/contact" }
] as const;

const PRODUCT_ITEMS = [
  { key: "navDebitCards", href: "/services?category=debit_cards" },
  { key: "navCreditCards", href: "/services?category=credit_cards" },
  { key: "navLoans", href: "/services?category=consumer_loans" },
  { key: "navMortgage", href: "/services?category=mortgages" },
  { key: "navDeposits", href: "/services?category=deposits" },
  { key: "categoryBusinessServices", href: "/services?category=business_services" },
  { key: "categoryDocumentAssistance", href: "/services?category=document_assistance" },
  { key: "navBusiness", href: "/business" },
  { key: "financialPulse", href: "/news" }
] as const;

export function Header() {
  const pathname = usePathname();
  const { country, setCountry } = useCountry();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const copy = UI_TEXT[locale];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="glass-card sticky top-0 z-40 border-b border-blue-100/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="whitespace-nowrap text-xl font-semibold leading-none tracking-tight text-blue-700">
            Bank-your
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap transition hover:text-blue-600 ${
                    isActive ? "text-blue-700" : "text-slate-700"
                  }`}
                >
                  {copy[item.key]}
                </Link>
              );
            })}
            <Link
              href="/mobile"
              className={`whitespace-nowrap transition hover:text-blue-600 ${
                pathname === "/mobile" ? "text-blue-700" : "text-slate-700"
              }`}
            >
              {locale === "ru" ? "Приложение" : "Mobile App"}
            </Link>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Search size={15} />
              {locale === "ru" ? "Поиск" : "Search"}
            </button>
            <button
              onClick={() =>
                setTheme((prev) =>
                  prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
                )
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title={
                locale === "ru"
                  ? `Тема: ${theme}`
                  : `Theme: ${theme}`
              }
              aria-label={locale === "ru" ? "Сменить тему" : "Change theme"}
            >
              {resolvedTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <LanguageSelector value={locale} onChange={setLocale} />
            <CountrySelector value={country} locale={locale} onChange={setCountry} />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 text-slate-700"
              aria-label={locale === "ru" ? "Открыть поиск" : "Open search"}
            >
              <Search size={18} />
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 text-slate-700"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={copy.openMenu}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="glass-card space-y-3 border-t border-blue-100 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setTheme((prev) =>
                    prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                {resolvedTheme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                {locale === "ru" ? `Тема: ${theme}` : `Theme: ${theme}`}
              </button>
              <LanguageSelector value={locale} onChange={setLocale} />
              <CountrySelector value={country} locale={locale} onChange={setCountry} />
            </div>
            <nav className="grid gap-2 text-sm font-medium text-slate-700">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-2 py-1 transition hover:bg-blue-50 hover:text-blue-700 ${
                    pathname === item.href ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  {copy[item.key]}
                </Link>
              ))}
              <Link
                href="/mobile"
                className={`whitespace-nowrap rounded-md px-2 py-1 transition hover:bg-blue-50 hover:text-blue-700 ${
                  pathname === "/mobile" ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                {locale === "ru" ? "Приложение" : "Mobile App"}
              </Link>
            </nav>
          </div>
        )}

        <div className="glass-card hidden border-t border-slate-100 bg-white md:block">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-4 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            {PRODUCT_ITEMS.map((item) => (
              <Link
                key={item.href + item.key}
                href={item.href}
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
              >
                {copy[item.key]}
              </Link>
            ))}
          </div>
        </div>
      </motion.header>

      <SearchWidgetModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
