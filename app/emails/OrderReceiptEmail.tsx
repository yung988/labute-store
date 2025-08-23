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
  Img,
  Column,
  Row,
} from "@react-email/components";

interface Session {
  id: string;
  customer_details?: {
    email?: string | null;
  } | null;
  amount_total: number | null;
}

interface LineItem {
  description: string;
  quantity: number;
  amount_total: number;
}

export default function OrderReceiptEmail({
  session,
  items,
}: {
  session: Session;
  items: LineItem[];
}) {
  return (
    <Html>
      <Head />
      <Preview>Objednávka #{session.id} – yeezuz2020</Preview>
      <Body
        style={{
          backgroundColor: "#ffffff",
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#111",
          fontSize: "14px",
          lineHeight: "22px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "40px 20px",
            maxWidth: "600px",
          }}
        >
          {/* Logo */}
          <Section style={{ textAlign: "center", marginBottom: "30px" }}>
            <Img
              src="https://yeezuz2020.store/logo.png"
              width="160"
              alt="yeezuz2020.store"
              style={{ marginBottom: "20px" }}
            />
          </Section>

          {/* Úvodní text */}
          <Heading
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "20px",
              letterSpacing: "1px",
              marginBottom: "20px",
            }}
          >
            Yeezuz2020 Merch – Potvrzení objednávky
          </Heading>

          <Text style={{ marginBottom: "20px", textAlign: "center" }}>
            Díky, že podporuješ <strong>yeezuz2020</strong>. Tvůj drip je na cestě.
          </Text>

          <Text style={{ marginBottom: "30px", textAlign: "center", color: "#555" }}>
            Objednávka <strong>#{session.id}</strong> byla úspěšně přijata a zaplacena.
          </Text>

          {/* Shrnutí objednávky */}
          <Section
            style={{
              border: "1px solid #e5e5e5",
              padding: "20px",
              marginBottom: "40px",
            }}
          >
            {items?.map((item, i) => (
              <Row key={i} style={{ marginBottom: "12px" }}>
                <Column>
                  <Text style={{ fontSize: "13px" }}>{item.description}</Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: "13px" }}>
                    {item.quantity} × {(item.amount_total / 100).toFixed(2)} Kč
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={{ borderColor: "#e5e5e5", margin: "20px 0" }} />

            <Row>
              <Column>
                <Text style={{ fontSize: "13px" }}>Celkem</Text>
              </Column>
              <Column style={{ textAlign: "right" }}>
                <Text style={{ fontSize: "13px", fontWeight: "bold" }}>
                  {session.amount_total
                    ? (session.amount_total / 100).toFixed(2)
                    : "0.00"}{" "}
                  Kč
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Adresy */}
          <Section style={{ marginBottom: "40px" }}>
            <Row>
              <Column>
                <Text style={{ fontSize: "13px", fontWeight: "bold" }}>
                  Dodací adresa:
                </Text>
                <Text style={{ fontSize: "13px" }}>Vyplněná zákazníkem</Text>
              </Column>
              <Column>
                <Text style={{ fontSize: "13px", fontWeight: "bold" }}>
                  Fakturační adresa:
                </Text>
                <Text style={{ fontSize: "13px" }}>Vyplněná zákazníkem</Text>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Text
            style={{
              fontSize: "11px",
              color: "#666",
              marginTop: "40px",
              textAlign: "center",
            }}
          >
            Tento e-mail je oficiální potvrzení z <strong>yeezuz2020.store</strong>.<br />
            Jakékoli dotazy směřuj na {" "}
            <a
              href="mailto:support@yeezuz2020.store"
              style={{ color: "#000", textDecoration: "none" }}
            >
              support@yeezuz2020.store
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}