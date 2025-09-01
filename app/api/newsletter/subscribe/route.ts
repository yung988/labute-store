import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    // Validace
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Neplatný email' }, { status: 400 });
    }

    // Email regex validace
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Neplatný formát emailu' }, { status: 400 });
    }

    const supabase = await createClient();

    // Zkontrolovat, zda email již neexistuje
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          message: 'Email je již přihlášen k odběru novinek',
        },
        { status: 200 }
      );
    }

    // Přidat nového subscribera
    const { error } = await supabase.from('newsletter_subscribers').insert({
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      subscribed_at: new Date().toISOString(),
      is_active: true,
      source: 'website',
    });

    if (error) {
      console.error('Newsletter subscription error:', error);
      return NextResponse.json(
        {
          error: 'Chyba při přihlašování k odběru',
        },
        { status: 500 }
      );
    }

    // Úspěšná odpověď
    return NextResponse.json(
      {
        message: 'Úspěšně přihlášeno k odběru novinek!',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Newsletter API error:', error);
    return NextResponse.json(
      {
        error: 'Chyba serveru',
      },
      { status: 500 }
    );
  }
}
