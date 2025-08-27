#!/bin/bash

# Přímý test Packeta API
echo "🚀 Test Packeta API přímo..."

# Test data
API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

# Jednoduchý XML pro test
XML_BODY="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<createPacket>
  <apiPassword>$API_KEY</apiPassword>
  <packetAttributes>
    <number>TEST-$(date +%s)</number>
    <name>Test User</name>
    <surname></surname>
    <email>test@example.com</email>
    <phone>+420733481280</phone>
    <addressId>35582</addressId>
    <cod>1000</cod>
    <value>1000</value>
    <weight>0.2</weight>
    <eshop>$ESHOP_ID</eshop>
  </packetAttributes>
</createPacket>"

echo "📄 XML požadavek:"
echo "$XML_BODY"
echo ""

echo "🔄 Odesílám požadavek..."
echo ""

# HTTP požadavek s curl
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY")

# Rozdělení odpovědi a status kódu
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1 | cut -d: -f2)

echo "📥 HTTP Status: $STATUS"
echo "📥 Packeta API odpověď:"
echo "$BODY"
echo ""

if [[ $STATUS == "200" ]]; then
  echo "✅ Úspěch!"
else
  echo "❌ Chyba s kódem $STATUS"
fi
