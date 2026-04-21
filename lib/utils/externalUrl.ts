export function getValidExternalUrl(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if ((parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}
