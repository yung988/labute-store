import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProductsToStripe, getStripeProducts } from "@/lib/stripe/sync-products";

async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    console.log('🔄 Starting product sync to Stripe...');

    const results = await syncProductsToStripe();

    return NextResponse.json({
      success: true,
      message: `Synchronizace dokončena: ${results.created} vytvořeno, ${results.updated} aktualizováno, ${results.errors} chyb`,
      results
    });

  } catch (error) {
    console.error('❌ Error syncing products:', error);
    return NextResponse.json(
      { error: "Failed to sync products to Stripe" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    console.log('📦 Fetching Stripe products...');

    const products = await getStripeProducts();

    return NextResponse.json({
      success: true,
      products
    });

  } catch (error) {
    console.error('❌ Error fetching Stripe products:', error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe products" },
      { status: 500 }
    );
  }
}