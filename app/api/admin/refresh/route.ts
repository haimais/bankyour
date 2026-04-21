import { NextRequest, NextResponse } from "next/server";
import { getAllCountrySnapshots, refreshAllSnapshots } from "@/lib/catalog/snapshotStore";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.BANKYOUR_ADMIN_TOKEN;
  if (!expected) {
    return true;
  }
  const provided = request.headers.get("x-admin-token");
  return Boolean(provided && provided === expected);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await refreshAllSnapshots();
    const state = await getAllCountrySnapshots();
    return NextResponse.json({
      ok: true,
      currentSnapshotId: state.currentSnapshotId,
      updatedAt: state.updatedAt
    });
  } catch (error) {
    console.error("Manual refresh API error", error);
    return NextResponse.json({ error: "Failed to refresh snapshots" }, { status: 500 });
  }
}

