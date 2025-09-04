# Dependency Inventory - Admin Interface

## Přehled závislostí

Admin rozhraní využívá moderní stack s důrazem na výkon, bezpečnost a vývojářskou zkušenost.

## Klíčové závislosti

### Backend/Database

- **@supabase/supabase-js**: `latest` - Klient pro Supabase API
- **@supabase/ssr**: `latest` - Server-side rendering podpora pro Supabase
- **stripe**: `^18.4.0` - Platební systém pro zpracování transakcí

### UI Framework & Komponenty

- **@radix-ui/react-alert-dialog**: `^1.1.15` - Přístupné dialogy
- **@radix-ui/react-avatar**: `^1.1.10` - Avatar komponenty
- **@radix-ui/react-checkbox**: `^1.3.3` - Checkbox komponenty
- **@radix-ui/react-dialog**: `^1.1.15` - Modal dialogy
- **@radix-ui/react-dropdown-menu**: `^2.1.16` - Dropdown menu
- **@radix-ui/react-label**: `^2.1.7` - Form labels
- **@radix-ui/react-select**: `^2.2.6` - Select komponenty
- **@radix-ui/react-separator**: `^1.1.7` - Vizuální separátory
- **@radix-ui/react-slot**: `^1.2.3` - Slot systém pro komponenty
- **@radix-ui/react-tabs**: `^1.1.13` - Tab komponenty
- **@radix-ui/react-tooltip**: `^1.2.8` - Tooltip komponenty

### Tabulky a data

- **@tanstack/react-table**: `^8.21.3` - Pokročilé tabulky s filtrováním a stránkováním
- **react-window**: `2.0.1` - Virtualizace pro velké seznamy
- **react-window-infinite-loader**: `1.0.10` - Nekonečné scrollování

### Ikony a styly

- **lucide-react**: `^0.511.0` - Ikony (LogOut, ShoppingCart, Package, atd.)
- **class-variance-authority**: `^0.7.1` - CSS varianty pro komponenty
- **clsx**: `^2.1.1` - CSS class utility
- **tailwind-merge**: `^3.3.0` - Tailwind CSS merging

### Grafy a vizualizace

- **recharts**: `2.15.4` - React grafy pro dashboard statistiky

### Email a komunikace

- **@react-email/components**: `^0.5.1` - Email komponenty
- **react-email**: `^4.2.8` - Email templates
- **resend**: `^6.0.1` - Email sending service

### Utility a pomocné knihovny

- **zod**: `^4.1.5` - Schema validace
- **date-fns**: `^4.1.0` - Datum utility (přestože není v package.json, používá se v kódu)
- **cmdk**: `1.1.1` - Command palette komponenta
- **vaul**: `^1.1.2` - Drawer komponenty

### Vývojové závislosti

- **@types/node**: `^20` - TypeScript typy pro Node.js
- **@types/react**: `^19` - TypeScript typy pro React
- **@types/react-dom**: `^19` - TypeScript typy pro React DOM
- **typescript**: `^5` - TypeScript compiler
- **eslint**: `^9` - Linting
- **prettier**: `^3.2.5` - Code formatting

## Externí služby

### Supabase

- **Database**: Postgres s Row Level Security
- **Auth**: Uživatelská autentifikace a autorizace
- **Storage**: Soubory (avatary, dokumenty)
- **Edge Functions**: Serverless funkce

### Stripe

- **Payments**: Zpracování plateb
- **Webhooks**: Notifikace o platebních událostech

### Packeta

- **Shipping**: Doručovací služba
- **API**: Vytváření a sledování zásilek

### Resend

- **Email**: Odesílání transakčních emailů

## Verze a kompatibilita

Všechny závislosti používají nejnovější stabilní verze s kompatibilitou:

- React 19
- Next.js latest
- TypeScript 5
- Node.js >= 18.0.0

## Rizika závislostí

### Vysoká priorita

- **Stripe**: Externí platební služba - výpadek ovlivní obchod
- **Supabase**: Core databáze a API - kritická závislost
- **Packeta**: Doručovací služba - ovlivní logistiku

### Střední priorita

- **@radix-ui/**: UI komponenty - alternativa existuje (shadcn/ui)
- **@tanstack/react-table**: Tabulky - alternativa existuje (react-table v7)

### Nízká priorita

- **lucide-react**: Ikony - alternativa existuje (heroicons, feather)
- **recharts**: Grafy - alternativa existuje (chart.js, d3)

## Doporučení

1. **Monitorování verzí**: Pravidelně aktualizovat závislosti kvůli bezpečnostním záplatám
2. **Fallback plány**: Mít alternativy pro kritické externí služby
3. **Testing**: Pokrytí testy pro všechny klíčové závislosti
4. **Documentation**: Dokumentovat custom wrappery kolem externích API
