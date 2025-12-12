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
  Button,
} from '@react-email/components';

interface TicketReplyProps {
  ticketNumber: number;
  subject: string;
  message: string;
  customerEmail: string;
}

export default function TicketReply({
  ticketNumber = 123,
  subject = 'Dotaz ohledně objednávky',
  message = 'Zde je odpověď na váš dotaz...',
  customerEmail = 'zakaznik@email.cz',
}: TicketReplyProps) {
  return (
    <Html>
      <Head />
      <Preview>Odpověď na váš dotaz - Ticket #{String(ticketNumber)}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brandName}>YEEZUZ2020</Heading>
            <Text style={brandSubtitle}>Official Merch Shop</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Odpověď na váš dotaz</Heading>

            <Text style={text}>
              Dobrý den,
            </Text>

            {/* Ticket Info */}
            <Section style={ticketInfo}>
              <Text style={ticketLabel}>Ticket #{ticketNumber}</Text>
              <Text style={ticketSubject}>{subject}</Text>
            </Section>

            {/* Reply Message */}
            <Section style={replyBox}>
              <div dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, '<br />') }} />
            </Section>

            <Hr style={divider} />

            <Text style={text}>
              Pokud máte další dotaz, jednoduše odpovězte na tento email.
              Vaše odpověď bude automaticky přiřazena k ticketu #{ticketNumber}.
            </Text>

            <Text style={helpText}>
              Jsme tu pro vás a rádi vám pomůžeme s čímkoliv dalším!
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerBrand}>
              <strong>YEEZUZ2020</strong>
            </Text>
            <Text style={footerSubtitle}>
              Official Merch Shop
            </Text>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              Tento email je odpověď na váš dotaz. Pro další komunikaci
              odpovězte přímo na tento email.
            </Text>
            <Text style={footerLinks}>
              <a href="https://yeezuz2020.cz" style={link}>Web</a>
              {' • '}
              <a href="https://yeezuz2020.cz/pomoc" style={link}>Pomoc</a>
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
  maxWidth: '600px',
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

const ticketInfo = {
  backgroundColor: '#f8f9fa',
  padding: '16px',
  borderRadius: '6px',
  margin: '24px 0',
  borderLeft: '4px solid #000000',
};

const ticketLabel = {
  margin: '0 0 4px 0',
  fontSize: '12px',
  color: '#666666',
  fontFamily: 'monospace',
  fontWeight: 'bold' as const,
};

const ticketSubject = {
  margin: '0',
  fontSize: '14px',
  color: '#333333',
};

const replyBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333333',
};

const divider = {
  border: 'none',
  borderTop: '1px solid #e9ecef',
  margin: '24px 0',
};

const helpText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0',
  fontStyle: 'italic' as const,
};

const hr = {
  border: 'none',
  borderTop: '1px solid #e9ecef',
  margin: '32px 40px',
};

const footer = {
  padding: '0 40px 40px',
  textAlign: 'center' as const,
};

const footerBrand = {
  fontSize: '18px',
  color: '#000000',
  margin: '0',
  fontWeight: 'bold' as const,
};

const footerSubtitle = {
  fontSize: '12px',
  color: '#666666',
  margin: '4px 0 16px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const footerDivider = {
  border: 'none',
  borderTop: '2px solid #000000',
  margin: '16px auto',
  width: '60px',
};

const footerText = {
  fontSize: '12px',
  color: '#999999',
  lineHeight: '18px',
  margin: '16px 0',
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
