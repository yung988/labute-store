import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log('🚀 Debug create-shipment - using exact same data as working test');

  // Use exact same data as working test
  const API_KEY = "985dd73f21931481ff9bca203bf93ceb";
  const API_URL = "https://www.zasilkovna.cz/api/rest";
  const ESHOP_ID = "yeezuz2020.store";

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<createPacket>
  <apiPassword>${API_KEY}</apiPassword>
  <packetAttributes>
    <number>DEBUG-${Date.now()}</number>
    <name>Test User</name>
    <surname></surname>
    <email>test@example.com</email>
    <phone>+420733481280</phone>
    <addressId>35582</addressId>
    <cod>1000</cod>
    <value>1000</value>
    <weight>0.2</weight>
    <eshop>${ESHOP_ID}</eshop>
  </packetAttributes>
</createPacket>`;

  console.log('📄 XML Request:');
  console.log(xmlBody);
  console.log('');

  try {
    console.log('🔄 Sending request to Packeta API...');

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
        "Accept": "application/xml",
      },
      body: xmlBody,
    });

    const responseText = await response.text();

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    console.log('📡 Response body:');
    console.log(responseText);

    if (response.ok && responseText.includes('<id>')) {
      const idMatch = responseText.match(/<id[^>]*>([^<]+)<\/id>/i);
      const packetaId = idMatch ? idMatch[1] : null;
      const barcodeMatch = responseText.match(/<barcode[^>]*>([^<]+)<\/barcode>/i);
      const barcode = barcodeMatch ? barcodeMatch[1] : null;

      console.log('✅ Success!');
      console.log(`📦 Packeta ID: ${packetaId}`);
      console.log(`📦 Barcode: ${barcode}`);
      console.log(`🔗 Tracking URL: https://www.zasilkovna.cz/sledovani/Z${packetaId}`);

      return NextResponse.json({
        success: true,
        packetaId: packetaId,
        barcode: barcode,
        trackingUrl: `https://www.zasilkovna.cz/sledovani/Z${packetaId}`,
        response: responseText
      });
    } else {
      console.log('❌ Failed!');
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
        response: responseText
      }, { status: response.status });
    }

  } catch (error) {
    console.error('❌ Network error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}