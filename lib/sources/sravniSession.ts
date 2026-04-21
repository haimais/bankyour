interface SravniSessionState {
  cookie: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
}

const sessionState: SravniSessionState = {
  cookie: null,
  updatedAt: null,
  expiresAt: null
};

export function setSravniSession(input: { cookie: string; ttlMinutes?: number }) {
  const ttlMinutes = input.ttlMinutes ?? 120;
  const now = Date.now();
  sessionState.cookie = input.cookie;
  sessionState.updatedAt = new Date(now).toISOString();
  sessionState.expiresAt = new Date(now + ttlMinutes * 60_000).toISOString();
}

export function getSravniSession() {
  return { ...sessionState };
}

export function getSravniHealth() {
  if (!sessionState.cookie || !sessionState.expiresAt) {
    return "degraded" as const;
  }

  const expiresAt = new Date(sessionState.expiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return "down" as const;
  }

  return "healthy" as const;
}
