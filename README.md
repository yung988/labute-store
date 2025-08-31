# YEEZUZ2020 Store

Modern e-commerce platform built with Next.js, Supabase, and React Email.

## 🚨 Important: Package Manager

**This project uses [pnpm](https://pnpm.io/) as the package manager. Please ensure all developers and AI agents use pnpm exclusively.**

❌ **DO NOT USE:** `npm install`, `yarn install`, or `yarn add`  
✅ **USE ONLY:** `pnpm install`, `pnpm add`, `pnpm dev`, etc.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (install with `npm install -g pnpm`)
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd labute-store
   ```

2. **Install dependencies with pnpm**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local` and fill in:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Email (Resend)
   RESEND_API_KEY=your_resend_api_key
   FROM_EMAIL=info@yeezuz2020.com
   
   # Stripe (optional)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
   
   # PostHog (optional)
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Key Features

- **Modern Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database:** Supabase with Row Level Security
- **Payments:** Stripe integration
- **Email System:** React Email + Resend with branded templates
- **Analytics:** PostHog integration
- **Shipping:** Packeta API integration
- **UI Components:** shadcn/ui with custom design system
- **Cart Management:** Context-based shopping cart
- **Admin Dashboard:** Order management and analytics

## 📧 Email System

The project includes a comprehensive email system with branded templates:

- **Order Confirmation** - Sent after successful order placement
- **Shipping Confirmation** - Sent when order is dispatched
- **Delivery Confirmation** - Sent when order is delivered

### Preview Email Templates
```bash
# View email templates in browser
pnpm dev
# Then visit:
# http://localhost:3000/preview/order-confirmation
# http://localhost:3000/preview/shipping-confirmation
# http://localhost:3000/preview/delivered-confirmation
```

### Send Test Emails
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order-confirmation",
    "to": "test@example.com",
    "data": { ... }
  }'
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Package Management (IMPORTANT: Only use pnpm)
pnpm add [package]           # Add dependency
pnpm add -D [package]        # Add dev dependency  
pnpm remove [package]        # Remove dependency
pnpm update                  # Update all dependencies
```

### Project Structure

```
labute-store/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── preview/           # Email template previews
│   └── ...
├── components/            # React components
├── emails/               # Email templates
├── context/              # React contexts
├── hooks/                # Custom hooks
├── lib/                  # Utilities and configurations
├── types/                # TypeScript type definitions
└── supabase/             # Database migrations and types
```

## 🗄️ Database

The project uses Supabase with the following main tables:

- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Individual order items
- `customers` - Customer information
- `shipments` - Shipping information

### Database Migrations

```bash
# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > types/supabase.ts
```

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   ```bash
   pnpm add -g vercel
   vercel
   ```

2. **Set Environment Variables**
   Add all environment variables in Vercel dashboard

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Manual Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test [filename]

# Run tests in watch mode
pnpm test:watch
```

## 📱 API Documentation

### Orders API
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/[id]` - Get order details
- `PUT /api/orders/[id]` - Update order

### Email API
- `POST /api/send-email` - Send templated email

### Products API
- `GET /api/products` - List products
- `GET /api/products/[id]` - Get product details

## 🤝 Contributing

1. **Use pnpm** for all package operations
2. Follow the existing code style and patterns
3. Write TypeScript types for new features
4. Test email templates in preview mode
5. Ensure responsive design works on all screen sizes

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages

## 📄 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `RESEND_API_KEY` | Resend email service key | ✅ |
| `FROM_EMAIL` | Default sender email | ❌ |
| `STRIPE_SECRET_KEY` | Stripe secret key | ❌ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | ❌ |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics key | ❌ |

## 🆘 Troubleshooting

### Common Issues

1. **pnpm not found**
   ```bash
   npm install -g pnpm
   ```

2. **Supabase connection issues**
   - Check environment variables
   - Verify Supabase project is running
   - Check RLS policies

3. **Email sending fails**
   - Verify RESEND_API_KEY
   - Check email template props
   - Review Resend dashboard logs

4. **Build errors**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   pnpm dev
   ```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Email Documentation](https://react.email)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [pnpm Documentation](https://pnpm.io/)

## 📄 License

All rights reserved - YEEZUZ2020 Store © 2024