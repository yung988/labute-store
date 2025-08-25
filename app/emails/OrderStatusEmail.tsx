import { Html, Head, Body, Container, Section, Text, Heading, Hr } from "@react-email/components";

interface OrderStatusEmailProps {
  customerName?: string;
  orderId: string;
  status: string;
  items?: Array<{
    name?: string;
    quantity?: number;
    size?: string;
    color?: string;
  }>;
  packetaId?: string;
}

const getStatusMessage = (status: string) => {
  const messages = {
    paid: {
      title: "Platba přijata",
      description: "Vaše platba byla úspěšně přijata a objednávka bude brzy zpracována."
    },
    processing: {
      title: "Objednávka se zpracovává", 
      description: "Vaše objednávka je právě připravována k odeslání."
    },
    shipped: {
      title: "Objednávka odeslána",
      description: "Vaše objednávka byla odeslána a brzy bude doručena."
    },
    cancelled: {
      title: "Objednávka zrušena",
      description: "Vaše objednávka byla zrušena. Pokud jste již zaplatili, peníze vám budou vráceny."
    },
    refunded: {
      title: "Platba vrácena",
      description: "Platba za vaši objednávku byla vrácena na váš účet."
    }
  };
  
  return messages[status as keyof typeof messages] || {
    title: "Změna stavu objednávky",
    description: `Stav vaší objednávky byl změněn na: ${status}`
  };
};

export default function OrderStatusEmail({
  customerName = "Zákazník",
  orderId,
  status,
  items = [],
  packetaId
}: OrderStatusEmailProps) {
  const statusInfo = getStatusMessage(status);

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white' }}>
          <Section style={{ padding: '20px' }}>
            <Heading style={{ color: '#333', textAlign: 'center' }}>
              {statusInfo.title}
            </Heading>
            
            <Text style={{ fontSize: '16px', color: '#333' }}>
              Dobrý den {customerName},
            </Text>
            
            <Text style={{ fontSize: '16px', color: '#666', lineHeight: '1.5' }}>
              {statusInfo.description}
            </Text>

            <Section style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
              <Text style={{ margin: '0', fontWeight: 'bold' }}>
                Číslo objednávky: {orderId}
              </Text>
              <Text style={{ margin: '5px 0 0 0', color: '#666' }}>
                Nový stav: <strong style={{ color: '#28a745' }}>{status}</strong>
              </Text>
            </Section>

            {items.length > 0 && (
              <Section>
                <Heading as="h3" style={{ fontSize: '18px', color: '#333' }}>
                  Položky objednávky:
                </Heading>
                {items.map((item, idx) => (
                  <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                    <Text style={{ margin: '0', fontWeight: 'bold' }}>
                      {item.name}
                    </Text>
                    <Text style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                      Množství: {item.quantity || 1}
                      {item.size && ` | Velikost: ${item.size}`}
                      {item.color && ` | Barva: ${item.color}`}
                    </Text>
                  </div>
                ))}
              </Section>
            )}

            {packetaId && (
              <Section style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
                <Text style={{ margin: '0', fontWeight: 'bold', color: '#1976d2' }}>
                  📦 Informace o zásilce
                </Text>
                <Text style={{ margin: '5px 0 0 0', color: '#333' }}>
                  Číslo zásilky: <strong>{packetaId}</strong>
                </Text>
                <Text style={{ margin: '5px 0 0 0', color: '#666' }}>
                  Zásilku můžete sledovat na: 
                  <a href={`https://www.zasilkovna.cz/sledovani/${packetaId}`} style={{ color: '#1976d2' }}>
                    {` zasilkovna.cz/sledovani/${packetaId}`}
                  </a>
                </Text>
              </Section>
            )}

            <Hr style={{ margin: '30px 0' }} />
            
            <Text style={{ fontSize: '14px', color: '#999', textAlign: 'center' }}>
              Děkujeme za vaši objednávku!<br />
              Tým yeezuz2020.store
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}