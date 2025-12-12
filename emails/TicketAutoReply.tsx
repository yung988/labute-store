import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface TicketAutoReplyProps {
  ticketNumber: number;
  customerEmail: string;
  subject: string;
}

export default function TicketAutoReply({
  ticketNumber = 123,
  customerEmail = 'zakaznik@email.cz',
  subject = 'Dotaz ohledně objednávky',
}: TicketAutoReplyProps) {
  return (
    <Html>
      <Head />
      <Preview>Děkujeme za vaši zprávu - Ticket #{String(ticketNumber)}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brandName}>YEEZUZ2020</Heading>
            <Text style={brandSubtitle}>Official Merch Shop</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Přijali jsme vaši zprávu</Heading>

            <Text style={text}>
              Dobrý den,
            </Text>

            <Text style={text}>
              Děkujeme za váš dotaz. Vaše zpráva byla úspěšně přijata a
              pracujeme na její odpovědi.
            </Text>

            {/* Ticket Info Box */}
            <Section style={ticketBox}>
              <Text style={ticketLabel}>Číslo ticketu</Text>
              <Text style={ticketNumberStyle}>#{ticketNumber}</Text>
              <Text style={ticketSubject}>{subject}</Text>
            </Section>

            <Text style={text}>
              <strong>Co bude dál?</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Odpovíme vám do 24 hodin</li>
              <li style={listItem}>Pokud máte další dotaz, jednoduše odpovězte na tento email</li>
              <li style={listItem}>Všechny odpovědi budou automaticky přiřazeny k vašemu ticketu</li>
            </ul>

            <Text style={text}>
              Můžete také sledovat status vašeho ticketu pomocí čísla
              <strong> #{ticketNumber}</strong>.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Tento email byl odeslán automaticky. Pokud jste neposlali žádný dotaz,
              prosím ignorujte tento email.
            </Text>
            <Text style={footerBrand}>
              <strong>YEEZUZ2020</strong> - Official Merch Shop
            </Text>
            <Text style={footerLinks}>
              <a href="https://yeezuz2020.cz" style={link}>yeezuz2020.cz</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  marginBottom: '64px',
};

const header = {
  padding: '32px 40px',
  backgroundColor: '#000000',
  textAlign: 'center' as const,
};

const brandName = {
  margin: '0',
  padding: '0',
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#ffffff',
  letterSpacing: '2px',
};

const brandSubtitle = {
  margin: '8px 0 0 0',
  fontSize: '14px',
  color: '#999999',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const content = {
  padding: '40px',
};

const h1 = {
  color: '#000000',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px 0',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const ticketBox = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #e9ecef',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const ticketLabel = {
  margin: '0',
  fontSize: '12px',
  color: '#666666',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const ticketNumberStyle = {
  margin: '8px 0',
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#000000',
  fontFamily: 'monospace',
};

const ticketSubject = {
  margin: '8px 0 0 0',
  fontSize: '14px',
  color: '#666666',
};

const list = {
  margin: '16px 0',
  paddingLeft: '20px',
};

const listItem = {
  margin: '8px 0',
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
};

const hr = {
  border: 'none',
  borderTop: '1px solid #e9ecef',
  margin: '32px 40px',
};

const footer = {
  padding: '0 40px 40px',
};

const footerText = {
  fontSize: '12px',
  color: '#999999',
  lineHeight: '18px',
  margin: '8px 0',
};

const footerBrand = {
  fontSize: '14px',
  color: '#000000',
  margin: '16px 0 8px 0',
};

const footerLinks = {
  fontSize: '12px',
  color: '#999999',
  margin: '8px 0',
};

const link = {
  color: '#000000',
  textDecoration: 'underline',
};
