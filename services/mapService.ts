
import { Coordinate, RouteInfo, POI, GeocodeResult } from '../types';

/**
 * Geocode a place name using Nominatim
 */
export async function geocode(query: string): Promise<Coordinate | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    );
    if (!response.ok) throw new Error("Geocoding service unavailable");
    const data: GeocodeResult[] = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Fetch routes from OSRM and calculate advanced safety scores
 */
export async function fetchRoutes(start: Coordinate, end: Coordinate): Promise<RouteInfo[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') throw new Error("Could not fetch route");

    // Fetch POIs for the entire area first to avoid repeated API calls
    const allRoutesCoords = data.routes.flatMap((r: any) => 
      r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
    );
    const globalPois = await fetchNearbyPOIs(allRoutesCoords);

    return data.routes.map((route: any, index: number) => {
      const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
      
      // Filter POIs that are actually close to THIS specific route (within ~200m)
      const routePois = globalPois.filter(poi => {
        return coords.some(rc => {
          const dist = Math.sqrt(Math.pow(rc[0] - poi.lat, 2) + Math.pow(rc[1] - poi.lng, 2));
          return dist < 0.002; // Roughly 200 meters
        });
      });

      const safetyScore = calculateAdvancedSafetyScore(routePois, index);

      return {
        coordinates: coords,
        distance: route.distance,
        duration: route.duration,
        safetyScore,
        index,
        pois: routePois
      };
    });
  } catch (error) {
    console.error("Routing error:", error);
    return [];
  }
}

/**
 * Advanced safety logic: Police, Lights, Crowds, Medical, and Time
 */
function calculateAdvancedSafetyScore(pois: POI[], routeIndex: number): number {
  let score = 65; // Base safety for a mapped road

  const counts = {
    police: pois.filter(p => p.type === 'police').length,
    lights: pois.filter(p => p.type === 'street_light').length,
    crowds: pois.filter(p => p.type === 'crowded_place').length,
    medical: pois.filter(p => p.type === 'hospital').length,
  };

  // 1. Police Presence (Weighted heavily)
  score += Math.min(counts.police * 8, 20);

  // 2. Street Lighting (Visual safety)
  score += Math.min(counts.lights * 2, 10);

  // 3. Crowded Places (Social safety/availability of help)
  score += Math.min(counts.crowds * 4, 12);

  // 4. Medical Emergency access
  score += Math.min(counts.medical * 5, 10);

  // 5. Time of Day Penalty/Bonus
  const hour = new Date().getHours();
  if (hour >= 18 || hour < 6) {
    score -= 15; // Night penalty
    // Night bonus if lighting is exceptionally high
    if (counts.lights > 10) score += 5;
  } else {
    score += 10; // Day bonus
  }

  // 6. Directness penalty (Alternative routes often less monitored)
  if (routeIndex > 0) score -= 5;

  return Math.min(100, Math.max(15, score));
}

/**
 * Fetch nearby POIs including medical facilities
 */
export async function fetchNearbyPOIs(coordinates: [number, number][]): Promise<POI[]> {
  if (coordinates.length === 0) return [];

  let minLat = coordinates[0][0], maxLat = coordinates[0][0];
  let minLng = coordinates[0][1], maxLng = coordinates[0][1];

  coordinates.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  const buffer = 0.008; // Buffer zone
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](${minLat - buffer},${minLng - buffer},${maxLat + buffer},${maxLng + buffer});
      node["highway"="street_lamp"](${minLat - buffer},${minLng - buffer},${maxLat + buffer},${maxLng + buffer});
      node["amenity"~"marketplace|bus_station|mall"](${minLat - buffer},${minLng - buffer},${maxLat + buffer},${maxLng + buffer});
      node["amenity"~"hospital|clinic|pharmacy"](${minLat - buffer},${minLng - buffer},${maxLat + buffer},${maxLng + buffer});
    );
    out body;
  `;

  try {
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const data = await response.json();

    const poiSet = new Map<string, POI>();
    data.elements.forEach((el: any) => {
      let type: POI['type'] = 'crowded_place';
      if (el.tags?.amenity === 'police') type = 'police';
      else if (el.tags?.highway === 'street_lamp') type = 'street_light';
      else if (['hospital', 'clinic', 'pharmacy'].includes(el.tags?.amenity)) type = 'hospital';

      poiSet.set(`${el.id}`, {
        id: `${el.id}`,
        lat: el.lat,
        lng: el.lon,
        type,
        name: el.tags?.name || type.replace('_', ' ')
      });
    });

    return Array.from(poiSet.values());
  } catch (e) {
    console.warn("POI Fetch Error:", e);
    return [];
  }
}
