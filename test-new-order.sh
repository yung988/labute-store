#!/bin/bash

# Test s úplně novými údaji
echo "🆕 Test s novými údaji..."

API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

# Nové údaje
ORDER_ID="NEW-$(date +%s)"
CUSTOMER_NAME="Test Customer"
CUSTOMER_EMAIL="test@example.com"
CUSTOMER_PHONE="+420777888999"
PACKETA_POINT_ID="35582"
COD_AMOUNT="500"
WEIGHT_KG="0.300"

echo "📋 Nové údaje:"
echo "   ID: $ORDER_ID"
echo "   Jméno: $CUSTOMER_NAME"
echo "   Telefon: $CUSTOMER_PHONE"
echo "   Výdejní místo: $PACKETA_POINT_ID"
echo ""

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

echo "🔄 Odesílám požadavek..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY")

BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1 | cut -d: -f2)

echo "📥 HTTP Status: $STATUS"
echo "📥 Raw response:"
echo "'$BODY'"
echo ""

if [[ $STATUS == "200" && $BODY == *"<id>"* ]]; then
  PACKET_ID=$(echo "$BODY" | grep -o '<id>[0-9]*</id>' | sed 's/<id>//;s/<\/id>//')
  BARCODE=$(echo "$BODY" | grep -o '<barcode>[^<]*</barcode>' | sed 's/<barcode>//;s/<\/barcode>//')
  echo "✅ ÚSPĚCH!"
  echo "   Packeta ID: $PACKET_ID"
  echo "   Barcode: $BARCODE"
else
  echo "❌ Problém s odpovědí"
fi
