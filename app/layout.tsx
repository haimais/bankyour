import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import type { ThemeMode } from "@/context/ThemeContext";
import { AppShell } from "@/components/AppShell";
import { Country, Locale } from "@/lib/types";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Bank-your | Fintech Aggregator & AI Assistant",
  description:
    "Compare banking products by country and navigate to official providers with AI assistance."
};

const COUNTRIES: Country[] = [
  "armenia",
  "belarus",
  "kazakhstan",
  "georgia",
  "russia",
  "azerbaijan",
  "uae"
];

const LOCALES: Locale[] = ["ru", "en", "hy", "be", "kk", "ka", "az", "ar", "tr"];

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = cookies();
  const countryCookie = cookieStore.get("bankyour-country")?.value;
  const localeCookie = cookieStore.get("bankyour-locale")?.value;
  const themeCookie = cookieStore.get("bankyour-theme")?.value;
  const initialCountry = COUNTRIES.includes(countryCookie as Country) ? (countryCookie as Country) : undefined;
  const initialLocale = LOCALES.includes(localeCookie as Locale) ? (localeCookie as Locale) : undefined;
  const initialTheme =
    themeCookie === "light" || themeCookie === "dark" || themeCookie === "system"
      ? (themeCookie as ThemeMode)
      : undefined;

  return (
    <html
      lang={initialLocale ?? "ru"}
      className={initialTheme === "dark" ? "theme-dark" : "theme-light"}
      data-theme={initialTheme === "dark" ? "dark" : "light"}
    >
      <body className={`${inter.variable} antialiased`}>
        <Providers
          initialCountry={initialCountry}
          initialLocale={initialLocale}
          initialTheme={initialTheme}
        >
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
