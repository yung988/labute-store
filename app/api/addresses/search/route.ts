import { NextRequest, NextResponse } from "next/server";

type MapyAddress = {
  street?: string;
  houseNumber?: string;
  municipality?: string;
  town?: string;
  postcode?: string;
  country?: string;
};

type MapyItem = {
  title?: string;
  address?: MapyAddress;
  score?: number;
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
    // Expected shape: { items: [{ title, address?: { street, houseNumber, municipality, postcode, country }, score }] }
    const sourceItems: MapyItem[] = Array.isArray(data.items) ? data.items : [];
    const addresses = sourceItems.map((item: MapyItem) => {
      const a: MapyAddress = item.address ?? {};
      const street = [a.street, a.houseNumber].filter(Boolean).join(' ').trim();
      const city = a.municipality || a.town || '';
      const postal = a.postcode || '';
      const country = a.country || '';
      const fullLine = [street, [postal, city].filter(Boolean).join(' '), country]
        .filter(Boolean)
        .join(', ');
      return {
        address: fullLine || item.title || '',
        street,
        city,
        postalCode: postal,
        fullAddress: fullLine || item.title || '',
        score: typeof item.score === 'number' ? item.score : 0,
      };
    });

    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json({ addresses: [] });
  }
}