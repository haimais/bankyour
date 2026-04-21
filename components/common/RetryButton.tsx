"use client";

interface RetryButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function RetryButton({ label, onClick, disabled = false }: RetryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
