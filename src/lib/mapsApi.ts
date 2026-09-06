import type { EntryLocation } from '../types';

export interface LocationSearchResult {
  lat: number;
  lng: number;
  placeName: string;
  formattedAddress: string;
  placeId?: string;
  vicinity?: string;
}

/**
 * Standard Sanctuary & Reflection Presets
 */
export const SANCTUARY_LOCATION_PRESETS: Array<{
  name: string;
  category: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}> = [
  {
    name: 'Home Sanctuary',
    category: 'Personal Retreat',
    lat: 37.7749,
    lng: -122.4194,
    formattedAddress: 'San Francisco, CA, USA',
  },
  {
    name: 'Central Park Meadow',
    category: 'Nature',
    lat: 40.7829,
    lng: -73.9654,
    formattedAddress: 'Central Park, New York, NY, USA',
  },
  {
    name: 'Muir Woods Redwood Grove',
    category: 'Nature & Forest',
    lat: 37.8970,
    lng: -122.5811,
    formattedAddress: 'Mill Valley, CA, USA',
  },
  {
    name: 'Kyoto Zen Garden',
    category: 'Mindfulness Sanctuary',
    lat: 35.0116,
    lng: 135.7681,
    formattedAddress: 'Kyoto, Japan',
  },
  {
    name: 'Quiet Coffee Haven',
    category: 'Urban Workspace',
    lat: 51.5074,
    lng: -0.1278,
    formattedAddress: 'Covent Garden, London, UK',
  },
  {
    name: 'Pacific Coast Lookout',
    category: 'Ocean & Coast',
    lat: 36.6002,
    lng: -121.8947,
    formattedAddress: 'Monterey Bay, CA, USA',
  },
];

/**
 * Forward Geocode: Converts human-readable address to geographic coordinates
 */
export async function geocodeAddress(address: string): Promise<LocationSearchResult | null> {
  if (!address || !address.trim()) return null;

  try {
    const response = await fetch(`/api/maps/geocode?address=${encodeURIComponent(address.trim())}`);
    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.result) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error('[Google Maps Geocode Error]:', error);
    return null;
  }
}

/**
 * Reverse Geocode: Converts coordinates into formatted place name and address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<LocationSearchResult | null> {
  try {
    const response = await fetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.result) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error('[Google Maps Reverse Geocode Error]:', error);
    return null;
  }
}

/**
 * Places / Address Search: Retrieves search suggestions and points of interest
 */
export async function searchPlaces(queryText: string, lat?: number, lng?: number): Promise<LocationSearchResult[]> {
  if (!queryText || !queryText.trim()) return [];

  try {
    let url = `/api/maps/places-search?query=${encodeURIComponent(queryText.trim())}`;
    if (typeof lat === 'number' && typeof lng === 'number') {
      url += `&lat=${lat}&lng=${lng}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Place search failed with status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error('[Google Maps Place Search Error]:', error);
    return [];
  }
}

/**
 * Retrieve user's current GPS position via browser Geolocation API
 */
export async function getCurrentBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Failed to acquire device location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied by user/browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location position is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Helper to build Google Maps Web Link for external viewing
 */
export function getGoogleMapsUrl(location: EntryLocation): string {
  if (location.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}&query_place_id=${location.placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
}
