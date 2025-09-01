import { Html, Head, Preview, Body, Container, Section, Text, Hr } from '@react-email/components';
import { emailStyles, emailTheme, BRAND } from './theme';

interface OrderItem {
  name: string;
  qty: number;
  price: string;
  imageUrl?: string;
}

interface Props {
  orderId: string;
  items: OrderItem[];
  total: string;
  customerName?: string;
  customerEmail: string;
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  orderDate?: string;
}

export default function OrderConfirmation({
  orderId,
  items,
  total,
  customerName,
  customerEmail,
  shippingAddress,
  orderDate,
}: Props) {
  const formattedDate = orderDate
    ? new Date(orderDate).toLocaleDateString('cs-CZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('cs-CZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return (
    <Html>
      <Head />
      <Preview>
        Potvrzení objednávky {orderId} - {BRAND.name}
      </Preview>
      <Body
        style={{
          backgroundColor: emailTheme.colors.background,
          fontFamily: emailTheme.fonts.primary,
        }}
      >
        <Container style={emailStyles.container}>
          {/* Brand Header */}
          <Text style={emailStyles.logo}>{BRAND.name}</Text>

          {/* Main Heading */}
          <Text style={emailStyles.h1}>Děkujeme za Vaši objednávku! 🎉</Text>

          {/* Greeting */}
          <Text style={emailStyles.body}>
            {customerName ? `Dobrý den, ${customerName},` : 'Dobrý den,'}
          </Text>

          <Text style={emailStyles.body}>
            Vaše objednávka byla úspěšně přijata a zpracovává se. Níže najdete detaily:
          </Text>

          {/* Order Details Section */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>Detaily objednávky</Text>

            <Text style={emailStyles.body}>
              <strong>Číslo objednávky:</strong> {orderId}
              <br />
              <strong>Datum objednávky:</strong> {formattedDate}
              <br />
              <strong>E-mail:</strong> {customerEmail}
            </Text>
          </Section>

          {/* Shipping Address */}
          {shippingAddress && (
            <Section style={emailStyles.section}>
              <Text style={emailStyles.h3}>Dodací adresa</Text>
              <Text style={emailStyles.body}>
                {shippingAddress.street}
                <br />
                {shippingAddress.postalCode} {shippingAddress.city}
                <br />
                {shippingAddress.country}
              </Text>
            </Section>
          )}

          <Hr style={emailStyles.divider} />

          {/* Order Items */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>Objednané položky</Text>

            {items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom:
                    index < items.length - 1 ? `1px solid ${emailTheme.colors.gray200}` : 'none',
                }}
              >
                <Text
                  style={{
                    margin: '0',
                    fontSize: '16px',
                    color: emailTheme.colors.foreground,
                    fontFamily: emailTheme.fonts.primary,
                  }}
                >
                  <strong>{item.qty}×</strong> {item.name}
                </Text>
                <Text
                  style={{
                    margin: '0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: emailTheme.colors.foreground,
                    fontFamily: emailTheme.fonts.primary,
                  }}
                >
                  {item.price}
                </Text>
              </div>
            ))}

            {/* Order Total */}
            <div
              style={{
                padding: '16px 0',
                marginTop: '16px',
                borderTop: `2px solid ${emailTheme.colors.gray300}`,
                textAlign: 'right',
              }}
            >
              <Text
                style={{
                  margin: '0',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: emailTheme.colors.foreground,
                  fontFamily: emailTheme.fonts.primary,
                }}
              >
                Celkem: {total}
              </Text>
            </div>
          </Section>

          <Hr style={emailStyles.divider} />

          {/* Next Steps */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>Co bude dál?</Text>
            <Text style={emailStyles.body}>
              1. Vaši objednávku připravujeme k odeslání
              <br />
              2. Jakmile bude zásilka odeslána, pošleme Vám sledovací číslo
              <br />
              3. Očekávaná doba doručení je 2-5 pracovních dnů
            </Text>
          </Section>

          {/* Contact Information */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.body}>
              Máte-li jakékoliv dotazy ohledně své objednávky, neváhejte nás kontaktovat na{' '}
              <strong>{BRAND.supportEmail}</strong>.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={emailStyles.footer}>
            <Text style={{ margin: '0', ...emailStyles.small }}>
              Tento e-mail slouží jako automatické potvrzení objednávky.
              <br />© 2024 {BRAND.name}. Všechna práva vyhrazena.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
