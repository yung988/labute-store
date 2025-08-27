#!/bin/bash

# Test s přesně stejnými údaji, které fungovaly
echo "🎯 Test s fungujícími údaji z debug testu..."

API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

# Přesně stejné údaje jako v debug testu, který fungoval
XML_BODY="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<createPacket>
  <apiPassword>$API_KEY</apiPassword>
  <packetAttributes>
    <number>DEBUG-$(date +%s)</number>
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

echo "🔄 Odesílám fungující požadavek..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY")

BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1 | cut -d: -f2)

echo "📥 HTTP Status: $STATUS"
echo "📥 Odpověď:"
echo "$BODY"
echo ""

if [[ $STATUS == "200" && $BODY == *"<id>"* ]]; then
  PACKET_ID=$(echo "$BODY" | grep -o '<id>[0-9]*</id>' | sed 's/<id>//;s/<\/id>//')
  BARCODE=$(echo "$BODY" | grep -o '<barcode>[^<]*</barcode>' | sed 's/<barcode>//;s/<\/barcode>//')
  echo "✅ Funguje!"
  echo "   Packeta ID: $PACKET_ID"
  echo "   Barcode: $BARCODE"
else
  echo "❌ Nefunguje"
fi
