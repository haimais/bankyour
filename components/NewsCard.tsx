"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { ActionErrorBanner } from "@/components/common/ActionErrorBanner";
import { getValidExternalUrl } from "@/lib/utils/externalUrl";
import { NewsItem } from "@/lib/types";

interface NewsCardProps {
  item: NewsItem;
  relativeTime: string;
  readSourceLabel: string;
  readOnSiteLabel: string;
  detailHref: string;
  sourceUnavailableLabel: string;
  onOpenDetail?: () => void;
}

export function NewsCard({
  item,
  relativeTime,
  readSourceLabel,
  readOnSiteLabel,
  detailHref,
  sourceUnavailableLabel,
  onOpenDetail
}: NewsCardProps) {
  const sourceUrl = getValidExternalUrl(item.url);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="glass-card rounded-2xl border border-slate-200 p-5 shadow-card"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {item.tag}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {item.country}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-slate-900">{item.title}</h3>
      <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">
        {item.sourceDomain ?? "Financial Pulse"}
      </p>
      <p className="mb-4 text-sm leading-6 text-slate-600">{item.summary}</p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{relativeTime}</span>
        <div className="flex items-center gap-3">
          {onOpenDetail ? (
            <button
              onClick={onOpenDetail}
              className="font-medium text-blue-700 transition hover:text-blue-600"
            >
              {readOnSiteLabel}
            </button>
          ) : (
            <Link href={detailHref} className="font-medium text-blue-700 transition hover:text-blue-600">
              {readOnSiteLabel}
            </Link>
          )}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-blue-700 transition hover:text-blue-600"
            >
              {readSourceLabel}
              <ArrowUpRight size={14} />
            </a>
          ) : (
            <span
              title={sourceUnavailableLabel}
              className="inline-flex cursor-not-allowed items-center gap-1 font-medium text-slate-400"
            >
              {readSourceLabel}
              <ArrowUpRight size={14} />
            </span>
          )}
        </div>
      </div>
      {!sourceUrl ? <ActionErrorBanner message={sourceUnavailableLabel} /> : null}
    </motion.article>
  );
}
