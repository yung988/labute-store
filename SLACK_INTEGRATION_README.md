# Slack Integration Setup

Tento dokument popisuje, jak nastavit integraci mezi Resend a Slackem pro e-mailové notifikace.

## 🚀 Rychlé nastavení

### 1. Vytvoření Slack Webhook URL

1. Jděte do [Slack Apps](https://api.slack.com/apps)
2. Klikněte na "Create New App" → "From scratch"
3. Zadejte název aplikace (např. "Labute Store Notifications")
4. Vyberte workspace
5. Jděte do "Incoming Webhooks" v levém menu
6. Zapněte "Activate Incoming Webhooks"
7. Klikněte na "Add New Webhook to Workspace"
8. Vyberte kanál, kam chcete posílat notifikace
9. Zkopírujte "Webhook URL" (začíná na `https://hooks.slack.com/services/...`)

### 2. Nastavení Environment Variables

Přidejte do vašeho `.env.local` souboru:

```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Nastavení Resend Webhook

1. Jděte do [Resend Dashboard](https://resend.com/webhooks)
2. Klikněte na "Create webhook"
3. URL: `https://yourdomain.com/api/resend/webhook`
4. Vyberte události: `email.delivered`, `email.bounced`, `email.opened`
5. Uložte webhook

## 📧 Endpointy

### `/api/resend/webhook` - Resend Webhook

- Přijímá webhook události z Resend
- Aktualizuje stav e-mailů v databázi
- Posílá notifikace do Slacku pro:
  - ✅ Doručené e-maily (zelená)
  - ❌ Vrácené e-maily (červená)
  - 👁️ Otevřené e-maily (oranžová)

### `/api/inbound-email` - Příchozí e-maily

- Pro příjem příchozích e-mailů (SendGrid/Postmark)
- Posílá shrnutí do Slacku
- Můžete rozšířit o ukládání do databáze

### `/api/test-slack` - Test endpoint

- GET: `/api/test-slack` - jednoduchý test
- POST: `/api/test-slack` s JSON `{ "message": "Test", "color": "#ffa500" }`

## 🧪 Testování

### Test Slack integrace:

```bash
# Jednoduchý test
curl https://yourdomain.com/api/test-slack

# Vlastní zpráva
curl -X POST https://yourdomain.com/api/test-slack \
  -H "Content-Type: application/json" \
  -d '{"message": "Test zpráva", "color": "#ff0000"}'
```

### Test Resend webhook:

Odešlete test e-mail přes Resend a sledujte Slack kanál.

## 📋 Příklady Slack zpráv

```
✅ E-mail doručen: customer@example.com (ID: em_123456)
❌ E-mail se vrátil: customer@example.com (ID: em_123456)
👁️ E-mail otevřen: customer@example.com (ID: em_123456)
📨 Nový e-mail od: support@customer.com
   📧 Předmět: Otázka k objednávce
   👤 Komu: support@yourstore.com
```

## 🔧 Pokročilé nastavení

### Přesměrování e-mailů do Slacku (bez kódu)

1. V Slack kanálu zapněte "Send emails to this channel"
2. Získáte unikátní e-mail adresu (např. `channel+abc123@slack.example.com`)
3. Přesměrujte `support@yourdomain.com` na tuto adresu pomocí:
   - Cloudflare Email Routing
   - ImprovMX
   - SendGrid Inbound Parse

### Přidání dalších webhook událostí

V Resend dashboard můžete přidat:

- `email.clicked` - kliknutí na odkazy
- `email.complained` - spam complaints
- `email.sent` - odeslání e-mailu

## 🛠️ Troubleshooting

### Slack zprávy se neposílají:

1. Zkontrolujte `SLACK_WEBHOOK_URL` v environment variables
2. Ověřte, že webhook URL je správná
3. Zkontrolujte konzoli pro chybové hlášky

### Resend webhook nefunguje:

1. Ověřte `RESEND_WEBHOOK_SECRET` v environment variables
2. Zkontrolujte URL webhooku v Resend dashboard
3. Testujte webhook pomocí Resend webhook testeru

## 📚 Další zdroje

- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Resend Webhooks](https://resend.com/docs/webhooks)
- [SendGrid Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/inbound-email-parse-webhook)
