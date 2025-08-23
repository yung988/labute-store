import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ addresses: [] });
  }

  try {
    // RUIAN API pro české adresy
    const response = await fetch(
      `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeServer/findAddressCandidates?` +
      new URLSearchParams({
        SingleLine: query,
        f: 'json',
        outFields: 'Addr_type,Match_addr,StAddr,City,Postal',
        maxLocations: '10'
      })
    );

    if (!response.ok) {
      throw new Error('RUIAN API error');
    }

    const data = await response.json();
    
    const addresses = data.candidates?.map((candidate: {
      address: string;
      score: number;
      attributes?: {
        StAddr?: string;
        City?: string;
        Postal?: string;
      };
    }) => ({
      address: candidate.address,
      street: candidate.attributes?.StAddr || '',
      city: candidate.attributes?.City || '',
      postalCode: candidate.attributes?.Postal || '',
      fullAddress: candidate.address,
      score: candidate.score
    })) || [];

    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json({ addresses: [] });
  }
}