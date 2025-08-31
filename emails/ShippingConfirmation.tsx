import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import { emailStyles, emailTheme, BRAND } from "./theme";

interface Props {
  orderId: string;
  trackingUrl: string;
  trackingNumber?: string;
  customerName?: string;
  customerEmail: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  carrierName?: string;
}

export default function ShippingConfirmation({
  orderId,
  trackingUrl,
  trackingNumber,
  customerName,
  customerEmail,
  shippingMethod = "Standardní doručení",
  estimatedDelivery,
  carrierName = "Česká pošta",
}: Props) {
  const formatEstimatedDelivery = (date: string) => {
    return new Date(date).toLocaleDateString('cs-CZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Html>
      <Head />
      <Preview>Objednávka {orderId} je na cestě! - {BRAND.name}</Preview>
      <Body style={{ backgroundColor: emailTheme.colors.background, fontFamily: emailTheme.fonts.primary }}>
        <Container style={emailStyles.container}>
          {/* Brand Header */}
          <Text style={emailStyles.logo}>
            {BRAND.name}
          </Text>

          {/* Main Heading */}
          <Text style={emailStyles.h1}>
            Vaše objednávka je na cestě! 🚚
          </Text>

          {/* Greeting */}
          <Text style={emailStyles.body}>
            {customerName ? `Dobrý den, ${customerName},` : 'Dobrý den,'}
          </Text>

          <Text style={emailStyles.body}>
            Skvělé zprávy! Vaše objednávka <strong>{orderId}</strong> byla odeslána a je na cestě k Vám.
          </Text>

          {/* Shipping Details Section */}
          <Section style={{
            ...emailStyles.section,
            backgroundColor: emailTheme.colors.gray50,
            padding: '20px',
            borderRadius: emailTheme.borderRadius.md,
            border: `1px solid ${emailTheme.colors.gray200}`,
          }}>
            <Text style={emailStyles.h3}>
              Informace o zásilce
            </Text>

            <Text style={emailStyles.body}>
              <strong>Číslo objednávky:</strong> {orderId}<br />
              {trackingNumber && (
                <>
                  <strong>Sledovací číslo:</strong> {trackingNumber}<br />
                </>
              )}
              <strong>Dopravce:</strong> {carrierName}<br />
              <strong>Způsob doručení:</strong> {shippingMethod}
              {estimatedDelivery && (
                <>
                  <br />
                  <strong>Očekávané doručení:</strong> {formatEstimatedDelivery(estimatedDelivery)}
                </>
              )}
            </Text>
          </Section>

          {/* Tracking Button */}
          <Section style={{
            ...emailStyles.section,
            textAlign: 'center',
            margin: '32px 0',
          }}>
            <Button
              href={trackingUrl}
              style={emailStyles.button.primary}
            >
              Sledovat zásilku
            </Button>
          </Section>

          <Hr style={emailStyles.divider} />

          {/* Delivery Instructions */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>
              Příprava na doručení
            </Text>
            <Text style={emailStyles.body}>
              <strong>Doručení probíhá obvykle:</strong><br />
              • Pondělí až Pátek: 8:00 - 18:00<br />
              • Sobota: 8:00 - 12:00<br /><br />

              <strong>Důležité upozornění:</strong><br />
              Prosíme, buďte k dispozici na uvedené adrese. V případě nepřítomnosti bude zásilka uložena na nejbližší pobočce.
            </Text>
          </Section>

          {/* Customer Support */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.body}>
              Sledování zásilky můžete kdykoliv zkontrolovat kliknutím na tlačítko výše nebo na našich webových stránkách.
            </Text>

            <Text style={emailStyles.body}>
              V případě jakýchkoliv problémů s doručením nás kontaktujte na{' '}
              <strong>{BRAND.supportEmail}</strong>.
            </Text>
          </Section>

          {/* Thank You */}
          <Section style={{
            ...emailStyles.section,
            textAlign: 'center',
            backgroundColor: emailTheme.colors.gray50,
            padding: '24px',
            borderRadius: emailTheme.borderRadius.md,
            marginTop: '32px',
          }}>
            <Text style={{
              ...emailStyles.body,
              margin: '0',
              fontSize: '18px',
              fontWeight: '600',
            }}>
              Děkujeme za Vaši důvěru! 🙏
            </Text>
            <Text style={{
              ...emailStyles.small,
              margin: '8px 0 0 0',
            }}>
              Těšíme se na Vaši další návštěvu
            </Text>
          </Section>

          {/* Footer */}
          <Section style={emailStyles.footer}>
            <Text style={{ margin: '0', ...emailStyles.small }}>
              Tento e-mail obsahuje informace o odeslání Vaší objednávky.<br />
              © 2024 {BRAND.name}. Všechna práva vyhrazena.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
