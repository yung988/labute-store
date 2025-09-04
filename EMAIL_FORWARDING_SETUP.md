# Nastavení e-mailového forwarding pro info@yeezuz2020.store

## 🎯 Cíl

Nastavit e-mailovou adresu `info@yeezuz2020.store`, která bude přeposílat všechny příchozí e-maily na `yeezuz332@gmail.com`.

## 📋 Možnosti řešení

### 1. ImprovMX (Nejjednodušší) ⭐

**Doporučeno pro začátek**

#### Krok 1: Registrace na ImprovMX

1. Jděte na [improvMX.com](https://improvmx.com)
2. Zaregistrujte se (mají free plán pro 1 doménu)
3. Přidejte doménu `yeezuz2020.store`

#### Krok 2: Nastavení forwarding pravidla

1. V dashboard ImprovMX klikněte na vaši doménu
2. Přidejte alias:
   - **Alias**: `info`
   - **Forward to**: `yeezuz332@gmail.com`
3. Uložte

#### Krok 3: Aktualizace DNS záznamů

ImprovMX vám poskytne MX záznamy, které musíte přidat do DNS vaší domény:

```
MX záznamy pro yeezuz2020.store:
- mx1.improvmx.com (priority 10)
- mx2.improvmx.com (priority 20)
```

**Kde přidat MX záznamy:**

- Pokud používáte Cloudflare: Dashboard → DNS → Add record → MX
- Pokud používáte jiného providera: Najděte DNS management v jejich dashboard

#### Krok 4: Testování

Pošlete test e-mail na `info@yeezuz2020.store` a ověřte, že dorazí na `yeezuz332@gmail.com`.

---

### 2. Cloudflare Email Routing (Pokud už používáte Cloudflare)

**Skvělé, pokud už máte Cloudflare**

#### Krok 1: Povolení Email Routing

1. Jděte do Cloudflare Dashboard
2. Vyberte doménu `yeezuz2020.store`
3. Jděte do **Email** → **Email Routing**
4. Zapněte Email Routing

#### Krok 2: Nastavení pravidla

1. Klikněte na **Create address**
2. **Email address**: `info@yeezuz2020.store`
3. **Forward to**: `yeezuz332@gmail.com`
4. Uložte

#### Krok 3: Testování

Cloudflare automaticky nastaví MX záznamy. Počkejte 24 hodiny na propagaci DNS.

---

### 3. Forward2Me (Alternativa)

Podobné jako ImprovMX, ale s jiným rozhraním.

---

## 🔧 Technické detaily

### MX Záznamy

Pro ImprovMX přidejte tyto MX záznamy:

| Type | Name | Value            | Priority |
| ---- | ---- | ---------------- | -------- |
| MX   | @    | mx1.improvmx.com | 10       |
| MX   | @    | mx2.improvmx.com | 20       |

### SPF Záznam (volitelné)

Pro lepší deliverability přidejte SPF záznam:

```
v=spf1 include:improvmx.com ~all
```

---

## 📧 Jak to funguje

1. **Někdo pošle e-mail** na `info@yeezuz2020.store`
2. **DNS směruje** e-mail na ImprovMX servery (MX záznamy)
3. **ImprovMX zpracuje** e-mail a přepošle ho na `yeezuz332@gmail.com`
4. **Vy obdržíte** e-mail ve vaší Gmail schránce

---

## 🧪 Testování

### Test 1: Z vašeho Gmailu

Pošlete e-mail z `yeezuz332@gmail.com` na `info@yeezuz2020.store`

### Test 2: Z jiného e-mailu

Použijte dočasný e-mail (např. temp-mail.org) a pošlete na `info@yeezuz2020.store`

### Test 3: Kontrola MX záznamů

```bash
nslookup -type=MX yeezuz2020.store
```

### Test 4: API Test Endpoint (pro administrátory)

Pokud máte přístup k admin panelu aplikace, můžete použít API endpoint pro testování:

#### GET /api/test-email-forwarding

Odešle automatický test e-mail na `info@yeezuz2020.store`

```bash
curl -X GET "https://your-app-url.com/api/test-email-forwarding" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### POST /api/test-email-forwarding

Odešle test e-mail s vlastním test e-mailem v těle

```bash
curl -X POST "https://your-app-url.com/api/test-email-forwarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"testEmail": "admin@example.com"}'
```

**Poznámka:** Endpoint vyžaduje admin přístup pro bezpečnost.

---

## 💡 Tip: Více adres

Můžete nastavit více forwarding adres:

- `support@yeezuz2020.store` → `yeezuz332@gmail.com`
- `contact@yeezuz2020.store` → `yeezuz332@gmail.com`
- `orders@yeezuz2020.store` → `yeezuz332@gmail.com`

---

## ❓ Troubleshooting

### E-maily nedorazí:

1. Zkontrolujte MX záznamy: `nslookup -type=MX yeezuz2020.store`
2. Počkejte 24-48 hodin na propagaci DNS
3. Zkontrolujte spam složku v Gmailu

### Chyba v ImprovMX:

1. Zkontrolujte, jestli je doména správně ověřená
2. Ověřte forwarding pravidlo

---

## 📞 Podpora

- **ImprovMX**: support@improvmx.com
- **Cloudflare**: Podpora v dashboard
- **DNS problémy**: Kontaktujte vašeho DNS providera
