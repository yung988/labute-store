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
  feedbackUrl: string;
  customerName?: string;
  customerEmail: string;
  deliveryDate?: string;
  productNames?: string[];
}

export default function DeliveredConfirmation({
  orderId,
  feedbackUrl,
  customerName,
  customerEmail,
  deliveryDate,
  productNames = [],
}: Props) {
  const formatDeliveryDate = (date: string) => {
    return new Date(date).toLocaleDateString('cs-CZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentDate = deliveryDate || new Date().toISOString();

  return (
    <Html>
      <Head />
      <Preview>Objednávka {orderId} byla doručena! - {BRAND.name}</Preview>
      <Body style={{ backgroundColor: emailTheme.colors.background, fontFamily: emailTheme.fonts.primary }}>
        <Container style={emailStyles.container}>
          {/* Brand Header */}
          <Text style={emailStyles.logo}>
            {BRAND.name}
          </Text>

          {/* Main Heading */}
          <Text style={emailStyles.h1}>
            Vaše objednávka byla doručena! ✅
          </Text>

          {/* Greeting */}
          <Text style={emailStyles.body}>
            {customerName ? `Dobrý den, ${customerName},` : 'Dobrý den,'}
          </Text>

          <Text style={emailStyles.body}>
            Skvělé zprávy! Vaše objednávka <strong>{orderId}</strong> byla úspěšně doručena.
          </Text>

          {/* Delivery Details Section */}
          <Section style={{
            ...emailStyles.section,
            backgroundColor: emailTheme.colors.success + '10',
            padding: '20px',
            borderRadius: emailTheme.borderRadius.md,
            border: `1px solid ${emailTheme.colors.success}30`,
          }}>
            <Text style={emailStyles.h3}>
              Detaily doručení
            </Text>

            <Text style={emailStyles.body}>
              <strong>Číslo objednávky:</strong> {orderId}<br />
              <strong>Doručeno:</strong> {formatDeliveryDate(currentDate)}
              {productNames.length > 0 && (
                <>
                  <br />
                  <strong>Doručené produkty:</strong> {productNames.join(', ')}
                </>
              )}
            </Text>
          </Section>

          {/* Success Message */}
          <Section style={{
            ...emailStyles.section,
            textAlign: 'center',
            margin: '32px 0',
          }}>
            <Text style={{
              fontSize: '48px',
              margin: '0 0 16px 0',
            }}>
              🎉
            </Text>
            <Text style={{
              ...emailStyles.h2,
              margin: '0 0 8px 0',
              color: emailTheme.colors.success,
            }}>
              Doručení dokončeno!
            </Text>
            <Text style={{
              ...emailStyles.body,
              margin: '0',
              fontSize: '18px',
            }}>
              Doufáme, že jste s nákupem spokojeni
            </Text>
          </Section>

          <Hr style={emailStyles.divider} />

          {/* Feedback Request */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>
              Vaše zpětná vazba je pro nás důležitá
            </Text>

            <Text style={emailStyles.body}>
              Pomohli byste nám zlepšit naše služby? Zanechte prosím hodnocení vašeho nákupu.
              Vaše zkušenost je pro nás velmi cenná a pomáhá ostatním zákazníkům při rozhodování.
            </Text>

            <div style={{
              textAlign: 'center',
              margin: '24px 0',
            }}>
              <Button
                href={feedbackUrl}
                style={emailStyles.button.primary}
              >
                ⭐ Zanechat hodnocení
              </Button>
            </div>

            <Text style={emailStyles.small}>
              Hodnocení zabere jen pár minut a pomůže nám poskytovat ještě lepší služby.
            </Text>
          </Section>

          {/* Care Instructions */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>
              Péče o výrobek
            </Text>
            <Text style={emailStyles.body}>
              • Pro zachování kvality doporučujeme praní v chladné vodě<br />
              • Nepoužívejte bělidla nebo agresivní prací prostředky<br />
              • Sušte na vzduchu, ne v sušičce<br />
              • Žehlete z rubu při nízké teplotě
            </Text>
          </Section>

          <Hr style={emailStyles.divider} />

          {/* Customer Support */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.body}>
              Máte-li jakékoliv problémy s výrobkem nebo potřebujete pomoc,
              neváhejte nás kontaktovat na <strong>{BRAND.supportEmail}</strong>.
              Jsme tu pro vás!
            </Text>
          </Section>

          {/* Thank You Section */}
          <Section style={{
            ...emailStyles.section,
            textAlign: 'center',
            backgroundColor: emailTheme.colors.gray50,
            padding: '32px',
            borderRadius: emailTheme.borderRadius.lg,
            marginTop: '32px',
          }}>
            <Text style={{
              ...emailStyles.h3,
              margin: '0 0 16px 0',
            }}>
              Děkujeme za Vaši důvěru! 🙏
            </Text>
            <Text style={{
              ...emailStyles.body,
              margin: '0 0 16px 0',
            }}>
              Jste součástí {BRAND.name} komunity a velmi si toho vážíme.
            </Text>
            <Text style={{
              ...emailStyles.small,
              margin: '0',
            }}>
              Sledujte nás pro novinky o nových kolekcích a exkluzivních nabídkách.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={emailStyles.footer}>
            <Text style={{ margin: '0', ...emailStyles.small }}>
              Tento e-mail potvrzuje úspěšné doručení Vaší objednávky.<br />
              © 2024 {BRAND.name}. Všechna práva vyhrazena.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
