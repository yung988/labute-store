import { NextRequest, NextResponse } from "next/server";

type MapyItem = {
  name?: string;
  label?: string;
  position?: {
    lon: number;
    lat: number;
  };
  bbox?: number[];
  type?: string;
  location?: string;
  regionalStructure?: Array<{
    name: string;
    type: string;
    isoCode?: string;
  }>;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ addresses: [] });
  }

  try {
    // Mapy.cz Geocoding API
    const apiKey = process.env.MAPY_CZ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing MAPY_CZ_API_KEY' }, { status: 500 });
    }

    const url = new URL('https://api.mapy.cz/v1/geocode');
    url.searchParams.set('query', query);
    url.searchParams.set('limit', '10');
    url.searchParams.set('lang', 'cs');

    const response = await fetch(url.toString(), {
      headers: { 'X-Mapy-Api-Key': apiKey },
      // Next caches GET by default; we want fresh suggestions while typing
      // cache: 'no-store' // Next.js RequestInit differs; omit to keep defaults
    });

    if (!response.ok) {
      throw new Error(`Mapy.cz API error: ${response.status}`);
    }

    const data: { items?: MapyItem[] } = await response.json();
    const sourceItems: MapyItem[] = Array.isArray(data.items) ? data.items : [];
    const addresses = sourceItems.map((item: MapyItem) => {
      const name = item.name || '';
      const location = item.location || '';

      // Extract city from regional structure or location
      let city = '';
      if (item.regionalStructure) {
        const municipality = item.regionalStructure.find(rs => rs.type === 'regional.municipality');
        if (municipality) {
          city = municipality.name;
        }
      }

      // For addresses, try to extract street and number from name
      const fullAddress = name;
      let street = name;
      const postalCode = '';

      // If it's a municipality part, it might contain district info
      if (item.type === 'regional.municipality_part' && city) {
        street = name.replace(city, '').trim();
      }

      return {
        address: fullAddress,
        street: street,
        city: city || location.split(',')[0] || '',
        postalCode: postalCode,
        fullAddress: fullAddress,
        score: 1, // Mapy.cz doesn't provide scores, so we use 1
      };
    });

    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json({ addresses: [] });
  }
}