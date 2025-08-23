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
          backgroundColor: "#f2f2f2",
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#111",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "0",
            maxWidth: "600px",
            border: "1px solid #e5e5e5",
          }}
        >
          {/* Logo */}
          <Section style={{ textAlign: "center", marginBottom: "40px" }}>
            <Img
              src="https://yeezuz2020.store/logo.png"
              width="160"
              alt="yeezuz2020.store"
              style={{ margin: "0 auto" }}
            />
          </Section>

          {/* Hlavní nadpis */}
          <Heading
            style={{
              textAlign: "center",
              fontWeight: "300",
              fontSize: "28px",
              letterSpacing: "2px",
              marginBottom: "10px",
            }}
          >
            Potvrzení objednávky
          </Heading>
          <Text
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#555",
              marginBottom: "40px",
            }}
          >
            Děkujeme za vaši objednávku. Vaše platba byla úspěšně přijata.
          </Text>

          <Hr style={{ borderColor: "#e5e5e5", margin: "40px 0" }} />

          {/* Shrnutí objednávky */}
          <Section style={{ marginBottom: "40px" }}>
            <Text style={{ fontSize: "14px", marginBottom: "6px" }}>
              <strong>Číslo objednávky:</strong> {session.id}
            </Text>
            <Text style={{ fontSize: "14px", marginBottom: "6px" }}>
              <strong>Email:</strong> {session.customer_details?.email || "—"}
            </Text>
            <Text style={{ fontSize: "14px" }}>
              <strong>Celková částka:</strong>{" "}
              {session.amount_total
                ? (session.amount_total / 100).toFixed(2)
                : "0.00"}{" "}
              Kč
            </Text>
          </Section>

          <Hr style={{ borderColor: "#e5e5e5", margin: "40px 0" }} />

          {/* Položky */}
          <Section style={{ marginBottom: "40px" }}>
            <Heading
              as="h3"
              style={{
                fontSize: "16px",
                fontWeight: "500",
                marginBottom: "20px",
                letterSpacing: "1px",
              }}
            >
              Položky objednávky
            </Heading>
            {items?.map((item, i) => (
              <Row key={i} style={{ marginBottom: "12px" }}>
                <Column>
                  <Text style={{ fontSize: "14px" }}>{item.description}</Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: "14px" }}>
                    {item.quantity} × {(item.amount_total / 100).toFixed(2)} Kč
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ borderColor: "#e5e5e5", margin: "40px 0" }} />

          {/* CTA tlačítko */}
          <Section style={{ textAlign: "center", marginTop: "20px" }}>
            <Button
              href={`https://labute-store.vercel.app/orders/${session.id}`}
              style={{
                backgroundColor: "#000",
                color: "#fff",
                padding: "14px 28px",
                borderRadius: "0",
                textDecoration: "none",
                fontSize: "14px",
                letterSpacing: "1px",
              }}
            >
              ZOBRAZIT OBJEDNÁVKU
            </Button>
          </Section>

          <Hr style={{ borderColor: "#e5e5e5", margin: "40px 0" }} />

          {/* Footer */}
          <Text
            style={{
              fontSize: "11px",
              color: "#888",
              textAlign: "center",
              lineHeight: "18px",
            }}
          >
            Tento e-mail byl odeslán z <strong>yeezuz2020.store</strong>.
            <br />
            Pro podporu nás kontaktujte na{" "}
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
