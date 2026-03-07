import { NextResponse } from "next/server";
import { getPublicSimMetadata } from "@/lib/sim-metadata";

export const dynamic = "force-dynamic";

export function GET() {
  const response = NextResponse.json(getPublicSimMetadata());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
