import {
    Html,
    Head,
    Preview,
    Body,
    Container,
    Section,
    Text,
    Heading,
    Hr,
    Button,
    Img,
    Column,
    Row,
  } from "@react-email/components";
  
  export default function OrderReceiptEmail({ session, items }: { session: any; items: any[] }) {
    return (
      <Html>
        <Head />
        <Preview>Potvrzení objednávky #{session.id}</Preview>
        <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "sans-serif" }}>
          <Container
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "600px",
            }}
          >
            {/* Logo */}
            <Section style={{ textAlign: "center", marginBottom: "20px" }}>
              <Img
                src="https://yeezuz2020.store/logo.png" // nahraď svojí URL loga
                width="120"
                alt="yeezuz2020.store"
                style={{ margin: "0 auto" }}
              />
            </Section>
  
            {/* Hlavní nadpis */}
            <Heading style={{ textAlign: "center", marginBottom: "10px" }}>
              Díky za objednávku!
            </Heading>
            <Text style={{ textAlign: "center", marginBottom: "20px" }}>
              Platba proběhla úspěšně ✅
            </Text>
  
            <Hr />
  
            {/* Shrnutí objednávky */}
            <Section style={{ marginBottom: "20px" }}>
              <Text>
                <strong>Číslo objednávky:</strong> {session.id}
              </Text>
              <Text>
                <strong>Email:</strong> {session.customer_details?.email}
              </Text>
              <Text>
                <strong>Celková částka:</strong>{" "}
                {(session.amount_total / 100).toFixed(2)} Kč
              </Text>
            </Section>
  
            <Hr />
  
            {/* Položky */}
            <Section style={{ marginBottom: "20px" }}>
              <Heading as="h3">Položky objednávky</Heading>
              {items?.map((item, i) => (
                <Row key={i} style={{ marginBottom: "8px" }}>
                  <Column>
                    <Text>{item.description}</Text>
                  </Column>
                  <Column style={{ textAlign: "right" }}>
                    <Text>
                      {item.quantity} × {(item.amount_total / 100).toFixed(2)} Kč
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>
  
            <Hr />
  
            {/* CTA tlačítko */}
            <Section style={{ textAlign: "center", marginTop: "30px" }}>
              <Button
                href={`https://yeezuz2020.store/orders/${session.id}`}
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "6px",
                  textDecoration: "none",
                }}
              >
                Zobrazit objednávku
              </Button>
            </Section>
  
            <Hr />
  
            {/* Footer */}
            <Text style={{ fontSize: "12px", color: "#666", textAlign: "center" }}>
              Tento e-mail byl odeslán z <strong>yeezuz2020.store</strong>.  
              Pokud máte dotazy, napište nám na support@yeezuz2020.store
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }
  