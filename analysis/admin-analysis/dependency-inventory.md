# Dependency Inventory - Admin Část

## Externí závislosti

### Databáze a Auth

- **@supabase/supabase-js**: Klient pro Supabase databázi a autentifikaci
- **@supabase/ssr**: Server-side rendering podpora pro Supabase

### Platby

- **stripe**: Stripe SDK pro platby a dashboard

### UI komponenty

- **@radix-ui/react-\***: Komponenty pro dialogy, dropdowny, selecty atd.
- **lucide-react**: Ikony
- **@tabler/icons-react**: Dodatečné ikony
- **@tanstack/react-table**: Tabulky s sorting/filtry
- **cmdk**: Command palette komponenta

### Email a komunikace

- **@react-email/components**: Email komponenty
- **react-email**: Email rendering
- **resend**: Email služba

### Další utility

- **posthog-js**: Analytics
- **jszip**: ZIP soubory pro export
- **pdf-lib**: PDF generování pro štítky
- **lenis**: Smooth scrolling
- **class-variance-authority**: CSS varianty
- **clsx**: Conditional CSS classes
- **tailwind-merge**: Tailwind utility merging

## Interní závislosti

### Supabase klienty

- `lib/supabase/client.ts`: Klient pro frontend
- `lib/supabase/server.ts`: Server-side klient
- `lib/supabase/admin.ts`: Admin klient s service role

### Middleware

- `lib/middleware/admin-verification.ts`: Ověření admin role
- `middleware.ts`: Hlavní middleware

### Utility

- `lib/utils.ts`: Obecné utility
- `lib/product-images.ts`: Obrázky produktů
- `lib/inventory.ts`: Skladové funkce

## Rizikové závislosti

- **Supabase service role key**: Vysoké riziko, pokud unikne
- **Stripe secret keys**: Kritické pro platby
- **PostHog**: Analytics, potenciální PII

## Doporučení

- Auditovat závislosti na zranitelnosti pravidelně
- Použít environment-specific klíče
- Implementovat rate limiting pro admin API
- Přidat monitoring pro externí služby
