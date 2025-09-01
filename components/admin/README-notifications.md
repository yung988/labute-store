# Notifikační systém - Admin rozhraní

Kompletní notifikační systém pro admin rozhraní e-shopu s real-time upozorněními a dropdown menu.

## Komponenty

### 1. NotificationDropdown

- **Umístění**: Sidebar (desktop) a mobilní header
- **Funkce**: Zobrazení seznamu notifikací s filtry a akcemi
- **Vlastnosti**:
  - Badge s počtem nepřečtených notifikací
  - Filtrování (Všechny / Nepřečtené)
  - Označení jako přečtené jedním kliknutím
  - Mazání notifikací
  - Přechod na související stránku (objednávky, sklad)

### 2. NotificationItem

- **Funkce**: Jednotlivá notifikace s ikonami a akcemi
- **Vlastnosti**:
  - Ikony podle typu notifikace (objednávka, platba, sklad, doprava, systém)
  - Časové značky (relativní čas)
  - Visual indicator pro nepřečtené
  - Hover akce pro smazání

### 3. NotificationSystem

- **Funkce**: Real-time toast notifikace pomocí Sonner
- **Vlastnosti**:
  - Automatické zobrazování nových notifikací
  - Akce "Zobrazit" pro přechod na související stránku
  - Mock systém pro testování

## Typy notifikací

```typescript
type NotificationType = 'order' | 'payment' | 'inventory' | 'system' | 'shipping';
```

- **order**: Nové objednávky
- **payment**: Problémy s platbami
- **inventory**: Nízký sklad produktů
- **shipping**: Změny statusu zásilek
- **system**: Systémová upozornění

## Integrace

### Admin stránka (`/admin`)

```tsx
import { NotificationDropdown } from '@/components/admin/NotificationDropdown';
import { NotificationSystem } from '@/components/admin/NotificationSystem';

// V JSX:
<NotificationDropdown /> // V headeru/sidebaru
<NotificationSystem />   // Kdekoli pro toast handling
```

### Layout (`app/layout.tsx`)

```tsx
import { Toaster } from '@/components/ui/sonner';

// V JSX:
<Toaster />; // Pro zobrazování toast notifikací
```

## Mock data

Soubor `notifications-data.ts` obsahuje:

- Ukázkové notifikace pro testování
- Helper funkce pro ikony a barvy
- TypeScript typy

## Real-time simulace

NotificationSystem automaticky simuluje:

- Novou objednávku po 3s
- Problém s platbou po 8s
- Nízký sklad po 15s

## Styling

- Používá existující UI komponenty (Badge, Button, DropdownMenu)
- Konzistentní s design systémem
- Responsivní design
- Smooth animace a hover efekty

## Rozšíření

Pro produkční použití:

1. Nahradit mock data skutečným API
2. Implementovat WebSocket pro real-time notifikace
3. Přidat databázi pro persistenci notifikací
4. Rozšířit typy notifikací podle potřeb
5. Přidat nastavení preferencí notifikací
