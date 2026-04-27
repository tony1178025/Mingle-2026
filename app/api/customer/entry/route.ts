import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerEntry } from "@/lib/services/customer-entry-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const branchId = request.nextUrl.searchParams.get("branchId") ?? "";
  const tableId = Number(request.nextUrl.searchParams.get("tableId") ?? "0");
  const result = await resolveCustomerEntry({ branchId, tableId });
  return NextResponse.json(result);
}
