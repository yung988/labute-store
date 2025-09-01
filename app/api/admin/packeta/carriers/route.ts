import { NextResponse } from 'next/server';

export async function GET() {
  const PACKETA_API_PASSWORD = process.env.PACKETA_API_PASSWORD;

  if (!PACKETA_API_PASSWORD) {
    return NextResponse.json({ error: 'Packeta API key not configured' }, { status: 500 });
  }

  try {
    // Use the correct Packeta pickup-point API endpoint
    const apiUrl = `https://pickup-point.api.packeta.com/v5/${PACKETA_API_PASSWORD}/branch/json?lang=cz`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Packeta API error: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const carriersData = await response.json();

    // Filter for home delivery carriers (usually have "home" or "HD" in name)
    const homeDeliveryCarriers = carriersData.data
      ? carriersData.data.filter(
          (carrier: { name?: string }) =>
            carrier.name?.toLowerCase().includes('home') ||
            carrier.name?.toLowerCase().includes('hd') ||
            carrier.name?.toLowerCase().includes('doručení') ||
            carrier.name?.toLowerCase().includes('domů')
        )
      : [];

    return NextResponse.json({
      success: true,
      totalCarriers: carriersData.data?.length || 0,
      homeDeliveryCarriers,
      allCarriers: carriersData.data || [],
    });
  } catch (error) {
    console.error('Error fetching Packeta carriers:', error);
    return NextResponse.json({ error: 'Failed to fetch carriers' }, { status: 500 });
  }
}
