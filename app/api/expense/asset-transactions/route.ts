// app/api/expense/asset-transactions/route.ts
import { NextResponse } from "next/server";
import { getTransactionsForAsset } from "@/features/expense/server/asset-queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("asset_id");
  if (!assetId) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }
  try {
    const items = await getTransactionsForAsset(assetId, 50);
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ items: [], error: msg }, { status: 500 });
  }
}
