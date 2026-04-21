import { Suspense } from "react";
import { ServicesPageClient } from "@/app/services/ServicesPageClient";

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-600 sm:px-6 lg:px-8">
          Loading catalog...
        </div>
      }
    >
      <ServicesPageClient />
    </Suspense>
  );
}

