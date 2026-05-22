import { NextRequest, NextResponse } from "next/server";
import { redeemAdminCode } from "@/lib/account";
import { routeErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code : "";
    return NextResponse.json(await redeemAdminCode(request, code));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
