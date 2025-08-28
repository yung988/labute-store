#!/bin/bash
curl -X POST "https://www.zasilkovna.cz/api/rest" \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<createPacket>
  <apiPassword>985dd73f21931481ff9bca203bf93ceb</apiPassword>
  <packetAttributes>
    <number>TEST-1756350365895</number>
    <name>Jan Gajdoš</name>
    <surname></surname>
    <email>test@example.com</email>
    <phone>+420733481280</phone>
    <addressId>35582</addressId>
    <cod>1000</cod>
    <value>1000</value>
    <weight>500</weight>
    <eshop>yeezuz2020.store</eshop>
  </packetAttributes>
</createPacket>'
