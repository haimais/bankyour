"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  ctaText: string;
  icon: LucideIcon;
  onClick: () => void;
  index: number;
}

export function ServiceCard({
  title,
  description,
  ctaText,
  icon: Icon,
  onClick,
  index
}: ServiceCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="group rounded-2xl border border-blue-100 bg-white p-6 text-left shadow-card transition hover:border-blue-300"
    >
      <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-700">
        <Icon size={20} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-4 inline-block text-sm font-medium text-blue-700 transition group-hover:text-blue-600">
        {ctaText}
      </span>
    </motion.button>
  );
}
