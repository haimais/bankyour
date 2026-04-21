import { NextResponse } from "next/server";
import {
  isMobileExpoRefreshStateStale,
  readMobileExpoLinkFile,
  readMobileExpoRefreshState,
  toMobileExpoLinkResponse,
  writeMobileExpoRefreshState
} from "@/lib/mobile/expoLink";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [payload, refreshState] = await Promise.all([
      readMobileExpoLinkFile(),
      readMobileExpoRefreshState()
    ]);
    const now = Date.now();
    let nextRefreshState = refreshState;
    if (isMobileExpoRefreshStateStale(refreshState, now, payload)) {
      nextRefreshState = {
        refreshInProgress: false,
        startedAt: refreshState?.startedAt,
        pid: refreshState?.pid,
        lastRefreshError: refreshState?.lastRefreshError ?? "refresh_stale",
        lastSuccessfulAt: refreshState?.lastSuccessfulAt ?? null,
        retryAttempt: refreshState?.retryAttempt,
        retryMax: refreshState?.retryMax
      };
      await writeMobileExpoRefreshState(nextRefreshState);
    }

    const response = toMobileExpoLinkResponse(payload, now, nextRefreshState);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Mobile expo-link API error", error);
    return NextResponse.json(
      {
        status: "unavailable",
        refreshInProgress: false,
        lastRefreshError: "unexpected_error",
        lastSuccessfulAt: null,
        message:
          "Could not read Expo Go link state. Try refreshing the link again."
      },
      { status: 200 }
    );
  }
}
