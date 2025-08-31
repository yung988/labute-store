import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Find abandoned carts that:
    // 1. Were last updated more than 1 hour ago
    // 2. Haven't been marked as abandoned yet
    // 3. Haven't been recovered
    // 4. Have customer email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: carts, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .lt('updated_at', oneHourAgo)
      .is('abandoned_at', null)
      .is('recovered_at', null)
      .not('customer_email', 'is', null)
      .limit(50); // Process max 50 at a time

    if (error) {
      console.error('Error fetching abandoned carts:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!carts || carts.length === 0) {
      return NextResponse.json({ 
        message: 'No abandoned carts found',
        processed: 0 
      });
    }

    let emailsSent = 0;
    let errors = 0;

    for (const cart of carts) {
      try {
        // Mark as abandoned first
        await supabase
          .from('abandoned_carts')
          .update({ abandoned_at: new Date().toISOString() })
          .eq('id', cart.id);

        // Skip if no email
        if (!cart.customer_email) continue;

        // Calculate cart total
        const items = cart.cart_items as Array<{
          name: string;
          price: number;
          quantity: number;
          size?: string;
        }>;
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = cart.total_amount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Send abandoned cart email
        const { error: emailError } = await resend.emails.send({
          from: 'yeezuz2020.store <noreply@yeezuz2020.store>',
          to: [cart.customer_email],
          subject: `Zapomněli jste něco v košíku? 🛒`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Ahoj ${cart.customer_name || 'zákazníku'}!</h2>
              
              <p>Všimli jsme si, že jste si něco přidali do košíku, ale nedokončili jste objednávku.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Váš košík obsahuje:</h3>
                ${items.map(item => `
                  <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>${item.name}</strong><br>
                    Velikost: ${item.size || 'N/A'} | Množství: ${item.quantity}<br>
                    Cena: ${item.price} Kč
                  </div>
                `).join('')}
                
                <div style="margin-top: 15px; font-size: 18px; font-weight: bold;">
                  Celkem: ${totalAmount} Kč (${totalItems} ${totalItems === 1 ? 'položka' : totalItems < 5 ? 'položky' : 'položek'})
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yeezuz2020.store/cart" 
                   style="background: #000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Dokončit objednávku
                </a>
              </div>
              
              <p style="color: #666; font-size: 12px;">
                Pokud už jste objednávku dokončili, můžete tento email ignorovat.
              </p>
            </div>
          `
        });

        if (emailError) {
          console.error('Error sending abandoned cart email:', emailError);
          errors++;
        } else {
          // Mark email as sent
          await supabase
            .from('abandoned_carts')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', cart.id);
          
          emailsSent++;
        }

      } catch (error) {
        console.error('Error processing abandoned cart:', cart.id, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Abandoned cart check completed',
      processed: carts.length,
      emailsSent,
      errors
    });

  } catch (error) {
    console.error('Abandoned cart cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}