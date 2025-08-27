#!/bin/bash

# Debug Packeta API s verbose výstupem
echo "🔍 Debug Packeta API..."

API_KEY="985dd73f21931481ff9bca203bf93ceb"
API_URL="https://www.zasilkovna.cz/api/rest"
ESHOP_ID="yeezuz2020.store"

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

echo "🚀 Odesílám požadavek s verbose výstupem..."
echo ""

# Verbose curl
curl -v -X POST "$API_URL" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d "$XML_BODY" \
  2>&1
