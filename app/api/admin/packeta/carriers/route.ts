import { NextResponse } from "next/server";

export async function GET() {
  const PACKETA_API_PASSWORD = process.env.PACKETA_API_PASSWORD;
  
  if (!PACKETA_API_PASSWORD) {
    return NextResponse.json({ error: 'Packeta API key not configured' }, { status: 500 });
  }

  // XML request to get carriers list
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<packetaInfo>
  <apiPassword>${PACKETA_API_PASSWORD}</apiPassword>
</packetaInfo>`;

  try {
    const response = await fetch('https://www.zasilkovna.cz/api/rest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
      body: xmlBody,
    });

    const xmlResponse = await response.text();
    
    return NextResponse.json({
      success: true,
      xmlResponse,
      status: response.status
    });
    
  } catch (error) {
    console.error('Error fetching Packeta carriers:', error);
    return NextResponse.json({ error: 'Failed to fetch carriers' }, { status: 500 });
  }
}