import { NextRequest, NextResponse } from "next/server";
import { getAccountResponse } from "@/lib/account";
import { routeErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getAccountResponse(request));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
