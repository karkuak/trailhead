import { NextResponse } from "next/server";
import { resetDatabase } from "@/lib/db";

// Test/preview-only: wipes app state so each Playwright test starts from a
// clean, deterministic seed. Refuses to run in production.
export async function POST() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_RESET) {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }
  await resetDatabase();
  return NextResponse.json({ ok: true });
}
