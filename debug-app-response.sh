#!/bin/bash

# Debug aplikace - simulace přesného volání
echo "🔍 Debug aplikace - přesná simulace..."

API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

# Přesné údaje z objednávky
ORDER_ID="0d9c7c09-eec0-4460-b1e5-ca8299c166f1"
CUSTOMER_NAME="Zdenek Pejchal"
CUSTOMER_EMAIL="zdenekpejchal@gmail.com"
CUSTOMER_PHONE="+420734582281"  # S +420
PACKETA_POINT_ID="35582"
COD_AMOUNT="729"
WEIGHT_KG="0.250"

echo "📋 Údaje objednávky:"
echo "   ID: $ORDER_ID"
echo "   Telefon: $CUSTOMER_PHONE"
echo "   Výdejní místo: $PACKETA_POINT_ID"
echo "   Částka: $COD_AMOUNT CZK"
echo "   Váha: $WEIGHT_KG kg"
echo ""

# Přesný XML jako aplikace
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

echo "📄 XML požadavek (přesně jako aplikace):"
echo "$XML_BODY"
echo ""

echo "🔄 Odesílám požadavek..."
echo ""

# Přesný fetch jako aplikace
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY")

BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1 | cut -d: -f2)

echo "📥 HTTP Status: $STATUS"
echo "📥 Raw response body:"
echo "'$BODY'"
echo ""

if [[ $STATUS == "200" ]]; then
  echo "✅ HTTP 200 - kontroluji obsah..."
  
  if [[ $BODY == *"<id>"* ]]; then
    PACKET_ID=$(echo "$BODY" | grep -o '<id>[0-9]*</id>' | sed 's/<id>//;s/<\/id>//')
    echo "✅ Našel ID: $PACKET_ID"
  else
    echo "❌ Žádné ID v odpovědi"
  fi
  
  if [[ $BODY == *"<status>ok</status>"* ]]; then
    echo "✅ Status OK"
  elif [[ $BODY == *"<status>fault</status>"* ]]; then
    echo "❌ Status FAULT - chyba!"
    FAULT=$(echo "$BODY" | grep -o '<fault>[^<]*</fault>' | sed 's/<fault>//;s/<\/fault>//')
    echo "   Chyba: $FAULT"
  else
    echo "⚠️  Neznámý status"
  fi
else
  echo "❌ HTTP chyba $STATUS"
fi

echo ""
echo "🎯 Výsledek: Aplikace by měla $([[ $STATUS == "200" && $BODY == *"<id>"* ]] && echo "fungovat" || echo "hlásit chybu")"
