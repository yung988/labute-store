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

// Fallback address parsing function for cases where Mapy.cz doesn't provide structured data
function parseAddressFallback(addressString: string): { street: string; houseNumber: string; city: string; postalCode: string } {
  let street = addressString;
  let houseNumber = '';
  let city = '';
  let postalCode = '';

  // Try to extract postal code (Czech format: 123 45 or 12345)
  const postalMatch = addressString.match(/(\d{3}\s?\d{2})\s*$/);
  if (postalMatch) {
    postalCode = postalMatch[1].replace(/\s/g, '');
    // Remove postal code from address string
    addressString = addressString.replace(/\s*\d{3}\s?\d{2}\s*$/, '').trim();
  }

  // Try to extract house number from the end
  const houseNumberMatch = addressString.match(/^(.+?)\s+(\d+(?:\/\d+)?[a-zA-Z]?)$/);
  if (houseNumberMatch) {
    street = houseNumberMatch[1].trim();
    houseNumber = houseNumberMatch[2];
  } else {
    street = addressString;
  }

  // For Czech addresses, if we have a postal code, we can try to infer the city
  // This is a simple heuristic - in production you might want to use a more sophisticated approach
  if (postalCode && !city) {
    // Common Czech city postal code patterns (simplified)
    const postalNum = parseInt(postalCode);
    if (postalNum >= 10000 && postalNum < 20000) {
      city = 'Praha'; // Prague area
    } else if (postalNum >= 70000 && postalNum < 80000) {
      city = 'Ostrava'; // Ostrava area
    } else if (postalNum >= 60000 && postalNum < 70000) {
      city = 'Brno'; // Brno area
    }
    // For other cases, we'll leave city empty and let the user fill it in
  }

  return { street, houseNumber, city, postalCode };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  console.log(`Address search request: "${query}"`);

  if (!query || query.length < 3) {
    console.log('Query too short or missing, returning empty results');
    return NextResponse.json({ addresses: [] });
  }

  try {
    // Mapy.cz Geocoding API
    const apiKey = process.env.MAPY_CZ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing MAPY_CZ_API_KEY' }, { status: 500 });
    }

    // Try multiple search queries to find more address options
    const searchQueries = [query];

    // If query looks like "StreetName Number", try variations
    const streetNumberMatch = query.match(/^(.+?)\s+(\d+(?:\/\d+)?[a-zA-Z]?)$/);
    if (streetNumberMatch) {
      const streetName = streetNumberMatch[1].trim();
      const houseNumber = streetNumberMatch[2];

      // Try variations to find similar streets
      searchQueries.push(`${streetName} ${houseNumber}`);
      searchQueries.push(`${streetName}* ${houseNumber}`);

      // Try searching just by street name to find all addresses on that street
      searchQueries.push(streetName);

      // Try searching by house number in the area
      searchQueries.push(houseNumber);
    }

    let allSourceItems: MapyItem[] = [];

    // Fetch results for all search queries
    for (const searchQuery of searchQueries) {
      const url = new URL('https://api.mapy.cz/v1/geocode');
      url.searchParams.set('query', searchQuery);
      url.searchParams.set('limit', '10');
      url.searchParams.set('lang', 'cs');
      url.searchParams.set('type', 'regional.address,regional.street,regional.municipality');
      url.searchParams.set('apikey', apiKey);

      try {
        console.log(`Searching for: "${searchQuery}" at URL: ${url.toString()}`);
        const response = await fetch(url.toString());

        console.log(`Response status: ${response.status} for query: "${searchQuery}"`);

        if (response.ok) {
          const data: { items?: MapyItem[] } = await response.json();
          console.log(`Raw API response for "${searchQuery}":`, JSON.stringify(data, null, 2));
          const items = Array.isArray(data.items) ? data.items : [];
          console.log(`Found ${items.length} items for query: "${searchQuery}"`);
          allSourceItems = allSourceItems.concat(items);
        } else {
          const errorText = await response.text();
          console.error(`API error for query "${searchQuery}": ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error(`Error fetching for query "${searchQuery}":`, error);
      }
    }

    // Remove duplicates based on name
    const uniqueItems = allSourceItems.filter((item, index, self) =>
      index === self.findIndex(i => i.name === item.name)
    );

    let sourceItems = uniqueItems;

    // If no results found, try a broader search without the house number
    if (sourceItems.length === 0 && streetNumberMatch) {
      const streetName = streetNumberMatch[1].trim();
      
      try {
        const broadUrl = new URL('https://api.mapy.cz/v1/geocode');
        broadUrl.searchParams.set('query', streetName);
        broadUrl.searchParams.set('limit', '15');
        broadUrl.searchParams.set('lang', 'cs');
        broadUrl.searchParams.set('type', 'regional.address,regional.street,regional.municipality');
        broadUrl.searchParams.set('apikey', apiKey);

        const broadResponse = await fetch(broadUrl.toString());

        if (broadResponse.ok) {
          const broadData: { items?: MapyItem[] } = await broadResponse.json();
          const broadItems = Array.isArray(broadData.items) ? broadData.items : [];
          
          // Filter for addresses that contain the street name
          const relevantItems = broadItems.filter(item => {
            const itemName = (item.name || '').toLowerCase();
            const itemLocation = (item.location || '').toLowerCase();
            const streetLower = streetName.toLowerCase();
            
            return (itemName.includes(streetLower) || itemLocation.includes(streetLower)) &&
                   (item.type === 'address' || item.type === 'address.point' || 
                    (item.type === 'regional.municipality_part' && item.name && item.name.match(/\d/)));
          });

          sourceItems = relevantItems;
        }
      } catch (error) {
        console.error('Error in broad search:', error);
      }
    }
    const addresses = sourceItems
      .filter((item: MapyItem) => {
        // Only include addresses and address points, not just municipalities
        const isValidType = item.type === 'address' || item.type === 'address.point' ||
                           (item.type === 'regional.municipality_part' && item.name && item.name.match(/\d/));

        if (!isValidType) return false;

        // Additional filtering for better relevance
        const itemName = item.name || '';
        const itemLocation = item.location || '';

        // If user searched for "StreetName Number", be more flexible
        if (streetNumberMatch) {
          const streetName = streetNumberMatch[1].toLowerCase();
          const houseNumber = streetNumberMatch[2];

          const nameLower = itemName.toLowerCase();
          const locationLower = itemLocation.toLowerCase();

          // Check if the result contains the street name
          const hasStreet = nameLower.includes(streetName) || locationLower.includes(streetName);
          const hasNumber = nameLower.includes(houseNumber) || locationLower.includes(houseNumber);

          // Accept results that have either street name or house number (more flexible)
          return hasStreet || hasNumber;
        }

        return true;
      })
      .map((item: MapyItem) => {
        const name = item.name || '';
        const location = item.location || '';

        // Extract city and postal code from regional structure
        let city = '';
        let postalCode = '';
        
        if (item.regionalStructure) {
          // Find municipality (city)
          const municipality = item.regionalStructure.find(rs => rs.type === 'regional.municipality');
          if (municipality) {
            city = municipality.name;
          }
          
          // Try to extract postal code from location or other sources
          const locationParts = location.split(',').map(part => part.trim());
          for (const part of locationParts) {
            // Czech postal code format: 5 digits with optional space (12345 or 123 45)
            const postalMatch = part.match(/\b(\d{3}\s?\d{2})\b/);
            if (postalMatch) {
              postalCode = postalMatch[1].replace(/\s/g, ''); // Remove spaces for consistency
              break;
            }
          }
        }

        // Parse street and house number from name
        let street = name;
        let houseNumber = '';

        // Try to extract house number from the end of the name
        const houseNumberMatch = name.match(/^(.+?)\s+(\d+(?:\/\d+)?[a-zA-Z]?)$/);
        if (houseNumberMatch) {
          street = houseNumberMatch[1].trim();
          houseNumber = houseNumberMatch[2];
        }

        // Enhanced city and postal code extraction
        if (!city || !postalCode) {
          // Try to extract from the full name first (for cases like "Biskupice-Pulkov 72 67557")
          const fullAddressMatch = name.match(/^(.+?)\s+(\d+(?:\/\d+)?[a-zA-Z]?)\s+(\d{3}\s?\d{2})$/);
          if (fullAddressMatch) {
            street = fullAddressMatch[1].trim();
            houseNumber = fullAddressMatch[2];
            postalCode = fullAddressMatch[3].replace(/\s/g, ''); // Remove spaces for consistency
          }

          // If still no city, try to extract from location or regional structure
          if (!city) {
            if (location) {
              const locationParts = location.split(',').map(part => part.trim());
              // Usually the first part after filtering out postal codes
              for (const part of locationParts) {
                if (!part.match(/\d{3}\s?\d{2}/) && part.length > 2) {
                  city = part;
                  break;
                }
              }
            }

            // If still no city from location, try regional structure again
            if (!city && item.regionalStructure) {
              const municipality = item.regionalStructure.find(rs => rs.type === 'regional.municipality');
              if (municipality) {
                city = municipality.name;
              }
            }
          }

          // If still no postal code, try to extract from location
          if (!postalCode && location) {
            const locationParts = location.split(',').map(part => part.trim());
            for (const part of locationParts) {
              // Czech postal code format: 5 digits with optional space (12345 or 123 45)
              const postalMatch = part.match(/\b(\d{3}\s?\d{2})\b/);
              if (postalMatch) {
                postalCode = postalMatch[1].replace(/\s/g, ''); // Remove spaces for consistency
                break;
              }
            }
          }
        }

        // If we don't have both city and postal code, try fallback parsing
        if ((!city || !postalCode) && name) {
          const fallbackResult = parseAddressFallback(name);
          if (!city && fallbackResult.city) {
            city = fallbackResult.city;
          }
          if (!postalCode && fallbackResult.postalCode) {
            postalCode = fallbackResult.postalCode;
          }
          if (!houseNumber && fallbackResult.houseNumber) {
            houseNumber = fallbackResult.houseNumber;
            street = fallbackResult.street;
          }
        }

        // Create formatted address for Packeta compatibility
        const streetWithNumber = houseNumber ? `${street} ${houseNumber}` : street;
        const fullAddress = `${streetWithNumber}, ${city}${postalCode ? ', ' + postalCode : ''}`;

        // Debug logging for address parsing (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('Address parsing:', {
            originalName: name,
            location: location,
            parsed: {
              street,
              houseNumber,
              city,
              postalCode,
              fullAddress
            }
          });
        }

        return {
          address: streetWithNumber, // Street with house number for Packeta
          street: streetWithNumber,  // Same as address for compatibility
          city: city,
          postalCode: postalCode,
          fullAddress: fullAddress,
          score: 1,
        };
      })
      .filter(addr => addr.street); // Only return addresses with street (city can be empty and filled by user)

    console.log(`Final processed addresses count: ${addresses.length}`);
    console.log('Final addresses:', JSON.stringify(addresses, null, 2));

    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json({ addresses: [] });
  }
}