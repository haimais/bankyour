"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ChatBot } from "@/components/ChatBot";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  return (
    <main className="grid-bg min-h-screen bg-slate-50 text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.12),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.1),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.08),transparent_30%)]" />
      <Header />
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      <Footer />
      <ChatBot />
    </main>
  );
}
