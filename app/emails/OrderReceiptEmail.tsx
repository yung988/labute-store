import { Html, Head, Preview, Body, Container, Section, Text, Hr } from '@react-email/components';
import { emailStyles, emailTheme, BRAND } from '../../emails/theme';

interface Session {
  id: string;
  customer_details?: { email?: string | null; name?: string | null } | null;
  amount_total: number | null;
  metadata?: {
    customer_first_name?: string;
    customer_last_name?: string;
    customer_phone?: string;
    delivery_method?: string;
    delivery_address?: string;
    delivery_city?: string;
    delivery_postal_code?: string;
    packeta_point_id?: string;
    packeta_point_name?: string;
    packeta_point_address?: string;
  };
  custom_fields?: Array<{
    key: string;
    text?: string | { value?: string };
  }>;
}

interface LineItem {
  description: string;
  quantity: number;
  amount_total: number;
}

export default function OrderReceiptEmail({
  session,
  items,
  orderId,
}: {
  session: Session;
  items: LineItem[];
  orderId?: string;
}) {
  const subtotal = items.reduce((sum, it) => sum + it.amount_total, 0);
  const totalFromSession = session.amount_total ?? subtotal;
  const shipping = Math.max(totalFromSession - subtotal, 0);
  const total = totalFromSession;

  // Extract customer info
  const firstName = session.metadata?.customer_first_name;
  const lastName = session.metadata?.customer_last_name;
  const customerPhone = session.metadata?.customer_phone;
  const customerEmail = session.customer_details?.email;
  const customerName =
    firstName && lastName ? `${firstName} ${lastName}` : session.customer_details?.name;

  // Extract delivery info
  const deliveryMethod = session.metadata?.delivery_method || 'pickup';
  const deliveryAddress = session.metadata?.delivery_address;
  const deliveryCity = session.metadata?.delivery_city;
  const deliveryPostalCode = session.metadata?.delivery_postal_code;

  // Extract pickup point info
  let packetaPointName = session.metadata?.packeta_point_name;
  let packetaPointAddress = session.metadata?.packeta_point_address;
  const packetaPointId = session.metadata?.packeta_point_id;

  // Fallback to custom fields if metadata doesn't have pickup point info
  if (!packetaPointName && session.custom_fields) {
    const nameField = session.custom_fields.find((field) => field.key === 'pickup_point_name');
    if (nameField?.text) {
      packetaPointName = typeof nameField.text === 'string' ? nameField.text : nameField.text.value;
    }
  }

  if (!packetaPointAddress && session.custom_fields) {
    const addressField = session.custom_fields.find(
      (field) => field.key === 'pickup_point_address'
    );
    if (addressField?.text) {
      packetaPointAddress =
        typeof addressField.text === 'string' ? addressField.text : addressField.text.value;
    }
  }

  const displayOrderId = orderId || session.id;
  const formattedDate = new Date().toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatPrice = (amount: number) => {
    return `${(amount / 100).toFixed(0)} Kč`;
  };

  return (
    <Html>
      <Head />
      <Preview>
        Potvrzení objednávky {displayOrderId} - {BRAND.name}
      </Preview>
      <Body
        style={{
          backgroundColor: emailTheme.colors.background,
          fontFamily: emailTheme.fonts.primary,
        }}
      >
        <Container style={emailStyles.container}>
          {/* Brand Header */}
          <div
            style={{
              backgroundColor: emailTheme.colors.primary,
              padding: '24px',
              textAlign: 'center',
              marginBottom: '32px',
              borderRadius: emailTheme.borderRadius.md,
            }}
          >
            <Text
              style={{
                ...emailStyles.logo,
                color: emailTheme.colors.primaryForeground,
                margin: '0',
              }}
            >
              {BRAND.name}
            </Text>
          </div>

          {/* Main Heading */}
          <Text style={emailStyles.h1}>Děkujeme za Vaši objednávku! 🎉</Text>

          {/* Greeting */}
          <Text style={emailStyles.body}>
            {customerName ? `Dobrý den, ${customerName},` : 'Dobrý den,'}
          </Text>

          <Text style={emailStyles.body}>
            Vaše objednávka byla úspěšně přijata a zaplacena. Níže najdete detaily:
          </Text>

          {/* Order Details Section */}
          <Section
            style={{
              ...emailStyles.section,
              backgroundColor: emailTheme.colors.gray50,
              padding: '20px',
              borderRadius: emailTheme.borderRadius.md,
              border: `1px solid ${emailTheme.colors.gray200}`,
            }}
          >
            <Text style={emailStyles.h3}>Detaily objednávky</Text>

            <Text style={emailStyles.body}>
              <strong>Číslo objednávky:</strong> {displayOrderId}
              <br />
              <strong>Datum objednávky:</strong> {formattedDate}
              <br />
              <strong>E-mail:</strong> {customerEmail}
              {customerPhone && (
                <>
                  <br />
                  <strong>Telefon:</strong> {customerPhone}
                </>
              )}
            </Text>
          </Section>

          {/* Delivery Information */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>Informace o doručení</Text>

            {deliveryMethod === 'home_delivery' ? (
              <div
                style={{
                  backgroundColor: emailTheme.colors.info + '10',
                  padding: '16px',
                  borderRadius: emailTheme.borderRadius.md,
                  border: `1px solid ${emailTheme.colors.info}30`,
                }}
              >
                <Text style={{ ...emailStyles.body, margin: '0 0 8px 0' }}>
                  <strong>🏠 Doručení domů</strong>
                </Text>
                <Text style={{ ...emailStyles.body, margin: '0' }}>
                  {deliveryAddress}
                  <br />
                  {deliveryPostalCode} {deliveryCity}
                  <br />
                  Česká republika
                </Text>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: emailTheme.colors.warning + '10',
                  padding: '16px',
                  borderRadius: emailTheme.borderRadius.md,
                  border: `1px solid ${emailTheme.colors.warning}30`,
                }}
              >
                <Text style={{ ...emailStyles.body, margin: '0 0 8px 0' }}>
                  <strong>📦 Výdejní místo Zásilkovna</strong>
                </Text>
                <Text style={{ ...emailStyles.body, margin: '0' }}>
                  {packetaPointName || 'Vybrané výdejní místo'}
                  {packetaPointAddress && (
                    <>
                      <br />
                      {packetaPointAddress}
                    </>
                  )}
                  {packetaPointId && (
                    <>
                      <br />
                      <span style={{ color: emailTheme.colors.gray600, fontSize: '14px' }}>
                        ID: {packetaPointId}
                      </span>
                    </>
                  )}
                </Text>
              </div>
            )}
          </Section>

          <Hr style={emailStyles.divider} />

          {/* Order Items */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>Objednané položky</Text>

            <div
              style={{
                border: `1px solid ${emailTheme.colors.gray200}`,
                borderRadius: emailTheme.borderRadius.md,
                overflow: 'hidden',
              }}
            >
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    borderBottom:
                      index < items.length - 1 ? `1px solid ${emailTheme.colors.gray200}` : 'none',
                    backgroundColor:
                      index % 2 === 0 ? emailTheme.colors.background : emailTheme.colors.gray50,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        margin: '0',
                        fontSize: '16px',
                        color: emailTheme.colors.foreground,
                        fontFamily: emailTheme.fonts.primary,
                        flex: 1,
                      }}
                    >
                      <strong>{item.quantity}×</strong> {item.description}
                    </Text>
                    <Text
                      style={{
                        margin: '0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: emailTheme.colors.foreground,
                        fontFamily: emailTheme.fonts.primary,
                        textAlign: 'right',
                      }}
                    >
                      {formatPrice(item.amount_total)}
                    </Text>
                  </div>
                </div>
              ))}

              {/* Shipping */}
              {shipping > 0 && (
                <div
                  style={{
                    padding: '16px',
                    borderBottom: `1px solid ${emailTheme.colors.gray300}`,
                    backgroundColor: emailTheme.colors.gray50,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        margin: '0',
                        fontSize: '16px',
                        color: emailTheme.colors.gray600,
                        fontFamily: emailTheme.fonts.primary,
                      }}
                    >
                      Doprava
                    </Text>
                    <Text
                      style={{
                        margin: '0',
                        fontSize: '16px',
                        color: emailTheme.colors.gray600,
                        fontFamily: emailTheme.fonts.primary,
                      }}
                    >
                      {formatPrice(shipping)}
                    </Text>
                  </div>
                </div>
              )}

              {/* Order Total */}
              <div
                style={{
                  padding: '20px 16px',
                  backgroundColor: emailTheme.colors.primary,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      margin: '0',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: emailTheme.colors.primaryForeground,
                      fontFamily: emailTheme.fonts.primary,
                    }}
                  >
                    Celkem zaplaceno
                  </Text>
                  <Text
                    style={{
                      margin: '0',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: emailTheme.colors.primaryForeground,
                      fontFamily: emailTheme.fonts.primary,
                    }}
                  >
                    {formatPrice(total)}
                  </Text>
                </div>
              </div>
            </div>
          </Section>

          <Hr style={emailStyles.divider} />

          {/* Next Steps */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.h3}>Co bude dál? 📋</Text>
            <div
              style={{
                backgroundColor: emailTheme.colors.gray50,
                padding: '20px',
                borderRadius: emailTheme.borderRadius.md,
              }}
            >
              <Text style={{ ...emailStyles.body, margin: '0 0 12px 0' }}>
                <strong>1. Příprava objednávky</strong>
                <br />
                Vaši objednávku nyní připravujeme k odeslání
              </Text>
              <Text style={{ ...emailStyles.body, margin: '0 0 12px 0' }}>
                <strong>2. Odeslání a sledování</strong>
                <br />
                Jakmile bude zásilka odeslána, pošleme Vám e-mail se sledovacím číslem
              </Text>
              <Text style={{ ...emailStyles.body, margin: '0' }}>
                <strong>3. Doručení</strong>
                <br />
                Očekávaná doba doručení je 2-5 pracovních dnů
              </Text>
            </div>
          </Section>

          {/* Contact Information */}
          <Section style={emailStyles.section}>
            <Text style={emailStyles.body}>
              Máte-li jakékoliv dotazy ohledně své objednávky, neváhejte nás kontaktovat na{' '}
              <a
                href={`mailto:${BRAND.supportEmail}`}
                style={{
                  color: emailTheme.colors.primary,
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                {BRAND.supportEmail}
              </a>
            </Text>
          </Section>

          {/* Thank You Section */}
          <Section
            style={{
              ...emailStyles.section,
              textAlign: 'center',
              backgroundColor: emailTheme.colors.gray50,
              padding: '32px 24px',
              borderRadius: emailTheme.borderRadius.lg,
              marginTop: '32px',
            }}
          >
            <Text
              style={{
                ...emailStyles.h3,
                margin: '0 0 16px 0',
                fontSize: '24px',
              }}
            >
              Děkujeme za Vaši důvěru! 🙏
            </Text>
            <Text
              style={{
                ...emailStyles.body,
                margin: '0',
                fontSize: '18px',
              }}
            >
              Jste součástí {BRAND.name} komunity a velmi si toho vážíme.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={emailStyles.footer}>
            <Text style={{ margin: '0', ...emailStyles.small }}>
              Tento e-mail slouží jako automatické potvrzení objednávky a daňový doklad.
              <br />© 2024 {BRAND.name}. Všechna práva vyhrazena.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
