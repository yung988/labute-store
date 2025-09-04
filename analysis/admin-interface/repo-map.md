# Repo Map - Admin Interface

## Přehled modulů

Admin rozhraní je rozděleno do několika klíčových modulů, které spolupracují na poskytování kompletního administračního prostředí.

### 1. Frontend rozhraní (app/(admin)/admin/)

- **layout.tsx**: Hlavní layout s SidebarProvider, AppSidebar a SiteHeader
- **page.tsx**: Hlavní stránka admin s lazy loading komponentami a stavovou správou

### 2. Komponenty (components/admin/)

- **Dashboard.tsx**: Hlavní dashboard s přehledem statistik a rychlými akcemi
- **OrdersTable.tsx**: Tabulka objednávek s možností filtrování a stránkování
- **InventoryTable.tsx**: Správa skladu a zásob
- **EmailCommunication.tsx**: Komunikace s klienty přes email
- **OrderDetailView.tsx**: Detailní pohled na jednotlivé objednávky
- **NotificationSystem.tsx**: Systém notifikací pro admin uživatele
- **PacketaManagement.tsx**: Správa zásilek přes Packeta
- **StripeManagement.tsx**: Správa plateb přes Stripe

### 3. API endpointy (app/api/admin/)

- **orders/**: CRUD operace s objednávkami, quick actions, komunikace
- **inventory/**: Správa inventáře a zásob
- **emails/**: Odesílání a správa emailů
- **notifications/**: Správa notifikací
- **packeta/**: Integrace s Packeta (vytváření zásilek, sledování)
- **run-packeta-cron/**: Automatické spouštění cron úloh pro Packeta

### 4. Middleware a autentifikace

- **admin-verification.ts**: Middleware pro ověření admin práv
- **admin.ts**: Supabase klient pro admin operace

### 5. Pomocné komponenty

- **NotificationDropdown.tsx**: Dropdown pro notifikace
- **CommandPalette.tsx**: Příkazová paleta pro rychlé akce
- **DataTable.tsx**: Obecná komponenta pro tabulky s daty

## Vazby mezi moduly

### Frontend ↔ API

- Dashboard načítá data z `/api/admin/orders` a `/api/admin/inventory`
- OrdersTable komunikuje s `/api/admin/orders` pro CRUD operace
- EmailCommunication používá `/api/admin/emails` pro odesílání emailů
- PacketaManagement integruje s `/api/admin/packeta` pro správu zásilek

### Komponenty ↔ Supabase

- Všechny komponenty používají `createClient` z `@/lib/supabase/client`
- Admin-specific operace používají `createClient` z `@/lib/supabase/admin`

### Autentifikace a autorizace

- Každý API endpoint používá `withAdminAuth` middleware
- Middleware ověřuje JWT token a admin roli uživatele
- Admin role je definována v `user_metadata.role` nebo `app_metadata.role`

## Datový tok

1. **Přihlášení**: Uživatel se přihlásí přes `/auth/login`
2. **Ověření**: Middleware `admin-verification.ts` ověří admin práva
3. **Načtení dat**: Komponenty volají API endpointy
4. **API zpracování**: Endpointy komunikují s Supabase databází
5. **UI aktualizace**: Data se zobrazí v komponentách

## Klíčové závislosti

- **UI Framework**: Shadcn/ui komponenty (Button, Card, Table, etc.)
- **Stavová správa**: React hooks (useState, useEffect)
- **Routing**: Next.js App Router s URL parametry pro stav
- **Autentifikace**: Supabase Auth s JWT tokeny
- **Databáze**: Supabase s Row Level Security
- **Platební systém**: Stripe pro platby
- **Doručování**: Packeta pro zásilky
- **Email**: Resend pro odesílání emailů

## Architektura

Admin rozhraní používá **modulární architekturu** s jasným oddělením zodpovědností:

- **Prezentační vrstva**: React komponenty
- **Aplikační vrstva**: Next.js API routes
- **Datová vrstva**: Supabase databáze
- **Autentifikační vrstva**: Middleware a Supabase Auth

Tato architektura umožňuje snadnou údržbu, testování a rozšiřitelnost.
