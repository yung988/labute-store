#!/bin/bash

# Test s konkrétními údaji z objednávky
echo "🚀 Test Packeta API s údaji z objednávky 0d9c7c09-eec0-4460-b1e5-ca8299c166f1..."

# Packeta údaje
API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

# Údaje z objednávky
ORDER_ID="0d9c7c09-eec0-4460-b1e5-ca8299c166f1"
CUSTOMER_NAME="Zdenek Pejchal"
CUSTOMER_EMAIL="zdenekpejchal@gmail.com"
CUSTOMER_PHONE="+420734582281"  # Přidal jsem +420
PACKETA_POINT_ID="35582"
AMOUNT_TOTAL=72900  # 729 CZK v haléřích
COD_AMOUNT=729  # 729 CZK
WEIGHT_KG="0.250"  # Váha trička v kg

echo "📋 Údaje objednávky:"
echo "   ID: $ORDER_ID"
echo "   Jméno: $CUSTOMER_NAME"
echo "   Email: $CUSTOMER_EMAIL"
echo "   Telefon: $CUSTOMER_PHONE"
echo "   Výdejní místo: $PACKETA_POINT_ID"
echo "   Částka celkem: $AMOUNT_TOTAL haléřů ($COD_AMOUNT CZK)"
echo "   Váha: $WEIGHT_KG kg"
echo ""

# XML požadavek
XML_BODY="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<createPacket>
  <apiPassword>$API_KEY</apiPassword>
  <packetAttributes>
    <number>$ORDER_ID</number>
    <name>$CUSTOMER_NAME</name>
    <surname></surname>
    <email>$CUSTOMER_EMAIL</email>
    <phone>$CUSTOMER_PHONE</phone>
    <addressId>$PACKETA_POINT_ID</addressId>
    <cod>$COD_AMOUNT</cod>
    <value>$COD_AMOUNT</value>
    <weight>$WEIGHT_KG</weight>
    <eshop>$ESHOP_ID</eshop>
  </packetAttributes>
</createPacket>"

echo "📄 XML požadavek:"
echo "$XML_BODY"
echo ""

echo "🔄 Odesílám požadavek..."
echo ""

# HTTP požadavek
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY")

# Rozdělení odpovědi
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1 | cut -d: -f2)

echo "📥 HTTP Status: $STATUS"
echo "📥 Packeta API odpověď:"
echo "$BODY"
echo ""

if [[ $STATUS == "200" ]]; then
  if [[ $BODY == *"<id>"* ]]; then
    PACKET_ID=$(echo "$BODY" | grep -o '<id>[0-9]*</id>' | sed 's/<id>//;s/<\/id>//')
    echo "✅ Úspěch! Vytvořena zásilka s ID: $PACKET_ID"
  else
    echo "⚠️  API vrátilo 200, ale žádné ID zásilky"
  fi
else
  echo "❌ Chyba s kódem $STATUS"
fi
