#!/bin/bash

# Test Packeta API - vytvoření zásilky
# Spusťte: chmod +x test-packeta-curl.sh && ./test-packeta-curl.sh

echo "🚀 Test Packeta API - vytvoření zásilky"
echo ""

# Packeta API údaje
API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

# Test data pro zásilku
ORDER_NUMBER="TEST-$(date +%s)"
CUSTOMER_NAME="Jan Gajdoš"
CUSTOMER_EMAIL="test@example.com"
CUSTOMER_PHONE="+420733481280"
PACKETA_POINT_ID="35582"  # Praha 4 - Pankrác
COD_AMOUNT="1000"
PACKAGE_WEIGHT="0.2"

echo "📦 Test údaje:"
echo "   Číslo objednávky: $ORDER_NUMBER"
echo "   Jméno: $CUSTOMER_NAME"
echo "   Email: $CUSTOMER_EMAIL"
echo "   Telefon: $CUSTOMER_PHONE"
echo "   Výdejní místo ID: $PACKETA_POINT_ID"
echo "   Částka na dobírku: $COD_AMOUNT Kč"
echo "   Váha: $PACKAGE_WEIGHT g"
echo "   Eshop: $ESHOP_ID"
echo ""

# XML tělo požadavku podle Packeta dokumentace
XML_BODY="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<createPacket>
  <apiPassword>$API_KEY</apiPassword>
  <packetAttributes>
    <number>$ORDER_NUMBER</number>
    <name>$CUSTOMER_NAME</name>
    <surname></surname>
    <email>$CUSTOMER_EMAIL</email>
    <phone>$CUSTOMER_PHONE</phone>
    <addressId>$PACKETA_POINT_ID</addressId>
    <cod>$COD_AMOUNT</cod>
    <value>$COD_AMOUNT</value>
    <weight>$PACKAGE_WEIGHT</weight>
    <eshop>$ESHOP_ID</eshop>
  </packetAttributes>
</createPacket>"

echo "📄 XML požadavek:"
echo "$XML_BODY"
echo ""

echo "🔄 Odesílám požadavek na Packeta API..."
echo ""

# Odeslání požadavku
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY")

echo "📥 Packeta API odpověď:"
echo "$RESPONSE"
echo ""

# Kontrola úspěchu
if [[ $RESPONSE == *"<id>"* ]]; then
  PACKET_ID=$(echo "$RESPONSE" | grep -o '<id>[0-9]*</id>' | sed 's/<id>//;s/<\/id>//')
  echo "✅ Úspěch! Vytvořena zásilka s ID: $PACKET_ID"
  echo ""
  echo "🔗 Sledování zásilky: https://www.zasilkovna.cz/sledovani/$PACKET_ID"
else
  echo "❌ Chyba! Zásilka nebyla vytvořena."
  echo "Zkontrolujte API klíč a údaje."
fi