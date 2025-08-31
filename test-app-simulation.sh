#!/bin/bash

# Simulace toho, co dělá aplikace
echo "🎯 Simulace aplikace - test Packeta API..."

API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

# Údaje z objednávky (přesně jak je v DB)
ORDER_ID="0d9c7c09-eec0-4460-b1e5-ca8299c166f1"
CUSTOMER_NAME="Zdenek Pejchal"
CUSTOMER_EMAIL="zdenekpejchal@gmail.com"
CUSTOMER_PHONE="734582281"  # Bez +420 jako v DB
PACKETA_POINT_ID="35582"
AMOUNT_TOTAL=72900  # V haléřích jako v DB
COD_AMOUNT=729      # Převedeno na CZK
WEIGHT_KG="0.250"   # Váha trička

echo "📋 Přesné údaje z DB:"
echo "   ID: $ORDER_ID"
echo "   Jméno: $CUSTOMER_NAME"
echo "   Email: $CUSTOMER_EMAIL"
echo "   Telefon: $CUSTOMER_PHONE (bez +420)"
echo "   Výdejní místo: $PACKETA_POINT_ID"
echo "   Částka: $AMOUNT_TOTAL haléřů -> $COD_AMOUNT CZK"
echo "   Váha: $WEIGHT_KG kg"
echo ""

# XML přesně jako ho generuje aplikace
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

echo "📄 XML (přesně jako aplikace):"
echo "$XML_BODY"
echo ""

echo "🔄 Odesílám požadavek..."
echo ""

# Stejný požadavek jako aplikace
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY")

BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1 | cut -d: -f2)

echo "📥 HTTP Status: $STATUS"
echo "📥 Raw odpověď:"
echo "$BODY"
echo ""

if [[ $STATUS == "200" ]]; then
  if [[ $BODY == *"<id>"* ]]; then
    PACKET_ID=$(echo "$BODY" | grep -o '<id>[0-9]*</id>' | sed 's/<id>//;s/<\/id>//')
    BARCODE=$(echo "$BODY" | grep -o '<barcode>[^<]*</barcode>' | sed 's/<barcode>//;s/<\/barcode>//')
    echo "✅ Úspěch!"
    echo "   Packeta ID: $PACKET_ID"
    echo "   Barcode: $BARCODE"
    echo "   Tracking URL: https://tracking.packeta.com/cs/Z$PACKET_ID"
  else
    echo "⚠️  API vrátilo 200, ale žádné ID"
  fi
else
  echo "❌ HTTP chyba $STATUS"
fi
