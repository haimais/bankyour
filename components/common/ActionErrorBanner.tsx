"use client";

interface ActionErrorBannerProps {
  message: string;
}

export function ActionErrorBanner({ message }: ActionErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </div>
  );
}
