import { Html, Head, Preview, Body, Container, Section, Text, Hr } from '@react-email/components';
import { emailStyles, emailTheme, BRAND } from './theme';

interface Item {
  name?: string;
  quantity?: number;
  size?: string;
  color?: string;
}

interface Props {
  orderId: string;
  status: 'new' | 'paid' | 'processing' | 'cancelled' | string;
  customerName?: string;
  customerEmail: string;
  items?: Item[];
}

export default function StatusUpdate({ orderId, status, customerName, customerEmail, items = [] }: Props) {
  const statusText: Record<string, string> = {
    new: 'Nová objednávka',
    paid: 'Platba přijata',
    processing: 'Objednávka se zpracovává',
    cancelled: 'Objednávka zrušena',
  };

  const title = statusText[status] || `Aktualizace stavu objednávky`;

  return (
    <Html>
      <Head />
      <Preview>
        {title} #{orderId.slice(-8)} - {BRAND.name}
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
          <Text style={emailStyles.h1}>{title}</Text>

          {/* Greeting */}
          <Text style={emailStyles.body}>{customerName ? `Dobrý den, ${customerName},` : 'Dobrý den,'}</Text>

          {/* Info */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.body}>
              Stav Vaší objednávky <strong>#{orderId.slice(-8)}</strong> byl aktualizován na <strong>{
                statusText[status] || status
              }</strong>.
            </Text>
            <Text style={emailStyles.small}>E-mail: {customerEmail}</Text>
          </Section>

          {items.length > 0 && (
            <Section style={emailStyles.section}>
              <Text style={emailStyles.h3}>Položky objednávky</Text>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <Text style={{ margin: 0, fontSize: '14px' }}>
                    {item.quantity ? `${item.quantity}× ` : ''}
                    {item.name}
                    {item.size ? ` · ${item.size}` : ''}
                    {item.color ? ` · ${item.color}` : ''}
                  </Text>
                </div>
              ))}
            </Section>
          )}

          <Hr style={emailStyles.divider} />

          <Section style={emailStyles.section}>
            <Text style={emailStyles.body}>
              V případě dotazů nás prosím kontaktujte na <strong>{BRAND.supportEmail}</strong>.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={emailStyles.footer}>
            <Text style={{ margin: '0', ...emailStyles.small }}>
              Tento e-mail informuje o změně stavu Vaší objednávky.
              <br />© 2024 {BRAND.name}. Všechna práva vyhrazena.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

