# Email System - YEEZUZ2020 Store

Jednotný email systém pro YEEZUZ2020 store postavený na **React Email** a **Resend**.

## 📧 Dostupné šablony

### 1. Order Confirmation (`OrderConfirmation.tsx`)

Potvrzení objednávky odesílané zákazníkovi po úspěšném vytvoření objednávky.

**Obsahuje:**

- Detaily objednávky (číslo, datum, položky)
- Dodací adresu
- Celkovou cenu
- Informace o dalších krocích

### 2. Shipping Confirmation (`ShippingConfirmation.tsx`)

Potvrzení odeslání zásilky se sledovacími informacemi.

**Obsahuje:**

- Sledovací číslo a odkaz
- Informace o dopravci
- Odhadované datum doručení
- Instrukce pro příjem zásilky

### 3. Delivered Confirmation (`DeliveredConfirmation.tsx`)

Potvrzení úspěšného doručení s výzvou k hodnocení.

**Obsahuje:**

- Potvrzení doručení
- Výzvu k zanechání hodnocení
- Instrukce pro péči o výrobek
- Kontaktní informace

## 🎨 Design systém

Všechny šablony používají jednotný design systém definovaný v `theme.ts`:

- **Barvy:** Černá/bílá schéma odpovídající brand identity
- **Typografie:** Systémové fonty pro optimální čitelnost
- **Rozměry:** 600px šířka, responzivní design
- **Komponenty:** Jednotné tlačítka, sekce, footery

## 🚀 Rychlý start

### 1. Environment setup

```bash
# V .env.local
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=info@yeezuz2020.store  # volitelné, použije se BRAND.supportEmail
```

### 2. Import a použití

```typescript
import { OrderConfirmation } from '@/emails';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Odeslání emailu
await resend.emails.send({
  from: 'YEEZUZ2020 <info@yeezuz2020.store>',
  to: 'customer@example.com',
  subject: 'Potvrzení objednávky',
  react: OrderConfirmation({
    orderId: 'YZ-2024-001234',
    customerName: 'Jan Novák',
    customerEmail: 'customer@example.com',
    items: [
      {
        name: 'Triko Labuť - Černá',
        qty: 1,
        price: '1,200 Kč',
      },
    ],
    total: '1,200 Kč',
  }),
});
```

### 3. API endpoint

```bash
# POST /api/send-email
curl -X POST /api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order-confirmation",
    "to": "customer@example.com",
    "data": {
      "orderId": "YZ-2024-001234",
      "customerName": "Jan Novák",
      "customerEmail": "customer@example.com",
      "items": [...],
      "total": "1,200 Kč"
    }
  }'
```

## 👀 Preview šablon

Všechny šablony můžete prohlížet v browseru:

```
http://localhost:3000/preview/order-confirmation
http://localhost:3000/preview/shipping-confirmation
http://localhost:3000/preview/delivered-confirmation
```

## 📝 Příklady použití

### Order Confirmation

```typescript
import { OrderConfirmation, type OrderConfirmationProps } from '@/emails';

const props: OrderConfirmationProps = {
  orderId: 'YZ-2024-001234',
  customerName: 'Jan Novák',
  customerEmail: 'jan.novak@email.cz',
  orderDate: new Date().toISOString(),
  items: [
    {
      name: 'Triko Labuť - Černá',
      qty: 2,
      price: '1,200 Kč',
    },
  ],
  total: '2,400 Kč',
  shippingAddress: {
    street: 'Wenceslas Square 1',
    city: 'Praha',
    postalCode: '110 00',
    country: 'Česká republika',
  },
};
```

### Shipping Confirmation

```typescript
import { ShippingConfirmation, type ShippingConfirmationProps } from '@/emails';

const props: ShippingConfirmationProps = {
  orderId: 'YZ-2024-001234',
  customerName: 'Jan Novák',
  customerEmail: 'jan.novak@email.cz',
  trackingUrl: 'https://www.postaonline.cz/trackandtrace/...',
  trackingNumber: 'DR1234567890CZ',
  shippingMethod: 'Balík do ruky',
  carrierName: 'Česká pošta',
  estimatedDelivery: '2024-12-25T10:00:00Z',
};
```

### Delivered Confirmation

```typescript
import { DeliveredConfirmation, type DeliveredConfirmationProps } from '@/emails';

const props: DeliveredConfirmationProps = {
  orderId: 'YZ-2024-001234',
  customerName: 'Jan Novák',
  customerEmail: 'jan.novak@email.cz',
  feedbackUrl: 'https://yeezuz2020.com/review/YZ-2024-001234',
  deliveryDate: new Date().toISOString(),
  productNames: ['Triko Labuť - Černá', 'Mikina YEEZUZ2020 - Bílá'],
};
```

## 🛠️ Přizpůsobení

### Změna brand informací

```typescript
// V emails/theme.ts
export const BRAND = {
  name: 'YEEZUZ2020',
  tagline: '2020',
  supportEmail: 'info@yeezuz2020.com',
  website: 'https://yeezuz2020.com',
} as const;
```

### Úprava barev

```typescript
// V emails/theme.ts
export const emailTheme = {
  colors: {
    primary: '#000000', // Hlavní barva (tlačítka)
    background: '#ffffff', // Pozadí
    foreground: '#000000', // Text
    // ... další barvy
  },
};
```

### Vytvoření nové šablony

1. Vytvořte nový soubor `emails/NewTemplate.tsx`
2. Importujte potřebné komponenty z `@react-email/components`
3. Použijte `emailStyles` a `emailTheme` z `./theme`
4. Exportujte v `emails/index.ts`

```typescript
import { emailStyles, emailTheme, BRAND } from './theme';

export default function NewTemplate({ ...props }) {
  return (
    <Html>
      <Head />
      <Preview>Preview text</Preview>
      <Body style={{ backgroundColor: emailTheme.colors.background }}>
        <Container style={emailStyles.container}>
          <Text style={emailStyles.logo}>{BRAND.name}</Text>
          {/* Váš obsah */}
        </Container>
      </Body>
    </Html>
  );
}
```

## 🔧 Integrace do objednávkového procesu

### V Next.js API route

```typescript
// app/api/orders/route.ts
import { OrderConfirmation } from '@/emails';

export async function POST(request: Request) {
  // ... vytvoření objednávky

  // Odeslání potvrzovacího emailu
  await resend.emails.send({
    from: 'YEEZUZ2020 <info@yeezuz2020.store>',
    to: order.customerEmail,
    subject: `Potvrzení objednávky ${order.id}`,
    react: OrderConfirmation({
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items,
      total: order.total,
      shippingAddress: order.shippingAddress,
    }),
  });
}
```

## 📚 Závislosti

- `@react-email/components` - Email komponenty
- `react-email` - React Email framework
- `resend` - Email delivery service

## 🐛 Troubleshooting

### Email se neodešle

1. Zkontrolujte `RESEND_API_KEY` v environment
2. Ověřte platnost email adresy
3. Zkontrolujte logy v Resend dashboard

### Preview nefunguje

1. Ujistěte se, že jsou všechny komponenty správně exportované
2. Zkontrolujte import cesty v preview stránkách
3. Restartujte dev server

### Styling problémy

1. Vždy používejte inline styly pro email
2. Vyhněte se flexbox a grid v emailech
3. Testujte v různých email klientech

## 📄 Licence

Součást YEEZUZ2020 Store - všechna práva vyhrazena.
