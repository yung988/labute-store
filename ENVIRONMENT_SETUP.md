# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key_here

# Zasilkovna (Packeta) Configuration
NEXT_PUBLIC_ZASILKOVNA_API_KEY=your_zasilkovna_api_key_here

# Resend Email Configuration
RESEND_API_KEY=your_resend_api_key_here

# Vercel Configuration (optional)
VERCEL_URL=localhost:3000
VERCEL_ENV=development
```

## Getting Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers > API Keys
3. Copy your test secret key (starts with `sk_test_`)
4. Copy your test publishable key (starts with `pk_test_`)

## Getting Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy your Project URL and anon/public key

## Getting Zasilkovna API Key

1. Register at [Zasilkovna API](https://client.packeta.com)
2. Generate API key from your account settings

## Getting Resend API Key

1. Go to [Resend Dashboard](https://resend.com)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)

## Setting up Supabase Webhook for Order Emails

1. **Go to Supabase Dashboard** → your project → Database → Webhooks
2. **Click "Create webhook"**
3. **Fill in the details:**
   - **Name**: `Order Confirmation Email`
   - **Table**: `orders`
   - **Events**: Check `INSERT`
   - **HTTP Method**: `POST`
   - **URL**: `https://yeezuz2020.store/api/webhooks/order-email`
   - **Headers**: Leave empty (or add authentication if needed)
   - **Body**: Leave as default

4. **Click "Create"**

**Note**: Replace `yourdomain.com` with your actual domain. For local development, you can use ngrok or similar tool to expose your local server.

## Testing the Payment Flow

After setting up environment variables, restart your development server:

```bash
npm run dev
# or
pnpm dev
```

Then test the payment flow by:
1. Adding items to cart
2. Going to `/cart` page
3. Filling out the form
4. Clicking "Zaplatit" button

After successful payment, customer should receive a confirmation email!
