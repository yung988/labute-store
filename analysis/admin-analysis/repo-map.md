# Repo Map - Admin Část

## Přehled modulů

### Hlavní stránka adminu

- **Soubor**: `app/(admin)/admin/page.tsx`
- **Funkce**: Hlavní dashboard s lazy-loaded komponentami, navigací, notifikacemi
- **Závislosti**: Supabase client, UI komponenty (Radix, Lucide), CommandPalette, NotificationSystem

### Komponenty adminu (`components/admin/`)

- **Dashboard.tsx**: Statistika, upozornění, rychlé akce (vytvoření zásilky, změna statusu)
- **ConsolidatedOrdersTable.tsx**: Tabulka objednávek s filtry, vyhledáváním, akcemi
- **InventoryTable.tsx**: Správa skladu, upozornění na nízké zásoby
- **OrderDetailView.tsx**: Detail objednávky
- **PacketaManagement.tsx**: Správa Packeta zásilek
- **CustomerCommunication.tsx**: Komunikace se zákazníky
- **EmailCommunication.tsx**: Email komunikace
- **NotificationSystem.tsx**: Systém notifikací
- **StripeManagement.tsx**: Správa Stripe (neimplementováno?)

### API endpointy (`app/api/admin/`)

- **inventory/**: Získávání a aktualizace skladu
- **orders/**: Správa objednávek, komunikace, rollback
- **packeta/**: Vytváření zásilek, tisk štítků, sledování

### Závislosti a utility

- **lib/supabase/admin.ts**: Admin Supabase client
- **lib/middleware/admin-verification.ts**: Middleware pro ověření admin role
- **types/products.ts**: Typy pro produkty

## Coupling a vlastníci

- **Vysoký coupling s Supabase**: Většina funkcí závisí na Supabase pro data a auth
- **Stripe integrace**: Pro platby a dashboard
- **Packeta integrace**: Pro dopravu
- **Vlastník**: Admin systém je těsně spojen s e-commerce logikou, žádný oddělený vlastník

## Doporučení

- Oddělit admin logiku do samostatného modulu pro lepší údržbu
- Implementovat service layer pro API volání
- Přidat unit testy pro kritické komponenty
