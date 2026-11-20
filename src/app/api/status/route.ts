import { connection, NextResponse } from "next/server";
import { integrationStatus } from "@/lib/config/env";

/** Reports which integrations are live. Booleans and provider names only — never secrets. */
export async function GET() {
  await connection();
  return NextResponse.json(integrationStatus());
}
