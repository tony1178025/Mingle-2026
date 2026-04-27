import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["STAFF"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ expenses: [], total: 0 });
}

export async function POST(request: NextRequest) {
  const auth = requireAdminRole(request, ["STAFF"]);
  if ("response" in auth) return auth.response;
  const expense = (await request.json()) as Record<string, unknown>;
  return NextResponse.json({
    expenseId: `expense_${Date.now()}`,
    ...expense
  });
}
