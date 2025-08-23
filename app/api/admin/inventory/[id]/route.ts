import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await req.json();
  const { size, stock } = body;

  try {
    // Update stock for specific size of product
    const { data, error } = await supabaseAdmin
      .from("skus")
      .update({ stock })
      .eq("product_id", id)
      .eq("size", size)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sku: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}