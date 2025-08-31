# Admin Dashboard Dependency Inventory

## Core Dependencies

### Frontend Framework
- **Next.js 14+**: App Router, server components, API routes
- **React 18+**: Hooks, concurrent features, client/server rendering
- **TypeScript**: Type safety and developer experience

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
  - Button, Card, Table, Input, Select, Dialog, etc.
- **Lucide React**: Modern icon library
- **Radix UI**: Accessible component primitives (via shadcn)

### Database & Backend
- **Supabase**: PostgreSQL database with real-time capabilities
  - Authentication (user management)
  - Database (orders, products, inventory)
  - Storage (file uploads)
  - Edge Functions (serverless functions)

### Payment Processing
- **Stripe**: Payment gateway integration
  - Payment intents
  - Webhooks for order updates
  - Invoice management
  - Refunds and disputes

### Shipping & Logistics
- **Packeta API**: Czech/Slovak delivery service
  - Shipment creation
  - Label printing
  - Tracking integration
  - Point selection

### Analytics & Monitoring
- **PostHog**: User analytics and event tracking
- **Vercel**: Deployment and monitoring

## Version Information

### Package.json Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@stripe/stripe-js": "^2.x",
    "lucide-react": "^0.x",
    "next": "^14.x",
    "react": "^18.x",
    "tailwindcss": "^3.x"
  }
}
```

## External API Dependencies

### Critical APIs
1. **Supabase REST API**
   - Base URL: Configured via NEXT_PUBLIC_SUPABASE_URL
   - Authentication: JWT tokens
   - Rate limits: Standard Supabase limits

2. **Stripe API**
   - Base URL: https://api.stripe.com/v1
   - Authentication: Secret keys
   - Webhooks: Event-driven updates

3. **Packeta API**
   - Base URL: Packeta API endpoints
   - Authentication: API keys
   - Rate limits: Service-specific limits

### Third-party Services
- **Email Service**: Likely integrated via Supabase or external provider
- **Analytics**: PostHog for user behavior tracking
- **CDN**: For static assets and images

## Security Dependencies

### Authentication
- **Supabase Auth**: JWT-based authentication
- **Row Level Security (RLS)**: Database-level access control
- **Service Role Key**: Admin operations (high privilege)

### Data Protection
- **HTTPS**: Required for all external communications
- **API Key Management**: Environment variables for secrets
- **CORS**: Configured for allowed origins

## Performance Dependencies

### Caching
- **Browser Cache**: Static assets
- **Supabase Cache**: Query result caching
- **CDN**: Global content delivery

### Optimization
- **Next.js Optimization**: Automatic code splitting, image optimization
- **Bundle Analysis**: Webpack bundle analyzer
- **Lazy Loading**: Component and route lazy loading

## Maintenance Considerations

### Update Frequency
- **Next.js**: Regular security updates
- **Supabase**: SDK updates with new features
- **Stripe**: API version management
- **UI Libraries**: Component library updates

### Breaking Changes Risk
- **High**: Supabase SDK major versions
- **Medium**: Stripe API changes
- **Low**: UI component updates (semantic versioning)

### Vendor Lock-in
- **High**: Supabase (database + auth + storage)
- **Medium**: Stripe (payment processing)
- **Low**: UI components (easily replaceable)

## Recommendations

### Immediate Actions
1. **Audit API Keys**: Ensure proper environment variable management
2. **Update Dependencies**: Check for security vulnerabilities
3. **Monitor Usage**: Track API rate limits and costs

### Long-term Planning
1. **Multi-provider Strategy**: Consider alternatives for critical services
2. **API Version Pinning**: Lock to specific API versions
3. **Dependency Scanning**: Implement automated security scanning