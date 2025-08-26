import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function POST() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const SITE_URL = process.env.SITE_URL?.replace(/\/$/, "");
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!SITE_URL || !CRON_SECRET) {
    return NextResponse.json(
      { error: "Missing SITE_URL or CRON_SECRET on server" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${SITE_URL}/api/cron/packeta-status-check`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        Accept: "application/json",
      },
      // Don't cache
      next: { revalidate: 0 },
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream cron failed", status: res.status, body },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, upstream: body });
  } catch (e) {
    return NextResponse.json(
      { error: "Trigger failed", message: String(e) },
      { status: 500 }
    );
  }
}
