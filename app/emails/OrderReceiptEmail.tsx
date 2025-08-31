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
  customer_details?: { email?: string | null } | null;
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
  const subtotal = items.reduce((sum, it) => sum + it.amount_total, 0);
  const totalFromSession = session.amount_total ?? subtotal;
  const shipping = Math.max(totalFromSession - subtotal, 0);
  const total = totalFromSession;

  return (
    <Html>
      <Head />
      <Preview>Objednávka #{session.id} – yeezuz2020</Preview>

      <Body
        style={{
          backgroundColor: "#f7f7f7",
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#111",
          fontSize: "14px",
          lineHeight: "22px",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Header bar */}
        <Section style={{ backgroundColor: "#000", padding: "24px 0" }}>
          <Container>
            <Img
              src="https://yeezuz2020.store/logo.png"
              width="120"
              alt="yeezuz2020.store"
              style={{ display: "block", margin: "0 auto" }}
            />
          </Container>
        </Section>

        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "40px 20px",
            maxWidth: "600px",
          }}
        >
          {/* Intro */}
          <Heading
            style={{
              fontWeight: "bold",
              fontSize: "20px",
              letterSpacing: "1px",
              margin: "0 0 8px",
            }}
          >
            Thank you for your order
          </Heading>
          <Text style={{ margin: "0 0 24px", color: "#555" }}>
            Order <strong>#{session.id}</strong> has been received and paid.
          </Text>

          {/* Order summary */}
          <Section
            style={{
              border: "1px solid #e5e5e5",
              padding: "20px",
              marginBottom: "40px",
            }}
          >
            {items.map((it, i) => (
              <Row key={i} style={{ marginBottom: "12px" }}>
                <Column>
                  <Text style={{ margin: 0, fontSize: "13px" }}>
                    {it.description}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={{ margin: 0, fontSize: "13px" }}>
                    {it.quantity} × {(it.amount_total / 100).toFixed(2)} Kč
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={{ borderColor: "#e5e5e5", margin: "20px 0" }} />

            <Row style={{ color: "#666" }}>
              <Column>
                <Text style={{ margin: 0, fontSize: "13px" }}>Shipping</Text>
              </Column>
              <Column style={{ textAlign: "right" }}>
                <Text style={{ margin: 0, fontSize: "13px" }}>
                  {(shipping / 100).toFixed(2)} Kč
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: "#e5e5e5", margin: "20px 0" }} />

            <Row>
              <Column>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: "bold" }}>
                  Total
                </Text>
              </Column>
              <Column style={{ textAlign: "right" }}>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: "bold" }}>
                  {(total / 100).toFixed(2)} Kč
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Addresses */}
          <Section style={{ marginBottom: "40px" }}>
            <Row>
              <Column>
                <Text style={{ fontWeight: "bold", margin: "0 0 4px" }}>
                  Delivery address
                </Text>
                <Text style={{ margin: 0, fontSize: "13px", color: "#555" }}>
                  Provided by customer
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: "#e5e5e5", margin: "20px 0" }} />

            <Row>
              <Column>
                <Text style={{ fontWeight: "bold", margin: "0 0 4px" }}>
                  Billing address
                </Text>
                <Text style={{ margin: 0, fontSize: "13px", color: "#555" }}>
                  Provided by customer
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Text
            style={{
              fontSize: "11px",
              color: "#666",
              textAlign: "center",
              margin: 0,
            }}
          >
            This email is an official confirmation from{" "}
            <strong>yeezuz2020.store</strong>
            <br />
            Questions? Reach us at{" "}
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